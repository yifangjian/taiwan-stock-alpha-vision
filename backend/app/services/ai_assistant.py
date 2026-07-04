"""
Interactive AI stock assistant with OpenAI Function Calling.
Tools: screen_stocks | get_stock_detail | get_market_overview
"""

import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional, Dict, Tuple

import yfinance as yf

from .user_profile import build_system_prompt

# ── Stock database ────────────────────────────────────────────────────────────

STOCK_DB: dict[str, dict] = {
    "2330": {"name": "台積電",   "industry": "半導體",     "tags": ["半導體", "AI", "晶圓代工"]},
    "2317": {"name": "鴻海",     "industry": "科技製造",   "tags": ["AI伺服器", "電子製造"]},
    "2454": {"name": "聯發科",   "industry": "IC設計",     "tags": ["半導體", "AI", "IC設計"]},
    "2308": {"name": "台達電",   "industry": "電子零組件", "tags": ["電源", "AI伺服器"]},
    "2382": {"name": "廣達",     "industry": "伺服器",     "tags": ["AI伺服器", "科技製造"]},
    "3711": {"name": "日月光投控","industry": "半導體封測", "tags": ["半導體", "封測"]},
    "2303": {"name": "聯電",     "industry": "半導體",     "tags": ["半導體", "晶圓代工"]},
    "6669": {"name": "緯穎",     "industry": "伺服器",     "tags": ["AI伺服器"]},
    "2379": {"name": "瑞昱",     "industry": "IC設計",     "tags": ["半導體", "IC設計"]},
    "3034": {"name": "聯詠",     "industry": "IC設計",     "tags": ["半導體", "IC設計", "面板驅動"]},
    "2395": {"name": "研華",     "industry": "工業電腦",   "tags": ["工業", "IoT"]},
    "6770": {"name": "力積電",   "industry": "半導體",     "tags": ["半導體", "記憶體"]},
    "2881": {"name": "富邦金",   "industry": "金融",       "tags": ["金融", "配息", "壽險"]},
    "2882": {"name": "國泰金",   "industry": "金融",       "tags": ["金融", "配息", "壽險"]},
    "2884": {"name": "玉山金",   "industry": "金融",       "tags": ["金融", "配息", "銀行"]},
    "2885": {"name": "元大金",   "industry": "金融",       "tags": ["金融", "配息", "證券"]},
    "2886": {"name": "兆豐金",   "industry": "金融",       "tags": ["金融", "配息", "銀行"]},
    "2887": {"name": "台新金",   "industry": "金融",       "tags": ["金融", "配息", "銀行"]},
    "2891": {"name": "中信金",   "industry": "金融",       "tags": ["金融", "配息", "銀行"]},
    "2892": {"name": "第一金",   "industry": "金融",       "tags": ["金融", "配息", "銀行"]},
    "5880": {"name": "合庫金",   "industry": "金融",       "tags": ["金融", "配息", "銀行"]},
    "5871": {"name": "中租-KY",  "industry": "金融",       "tags": ["金融", "租賃"]},
    "1216": {"name": "統一",     "industry": "食品",       "tags": ["民生", "配息", "食品"]},
    "2912": {"name": "統一超",   "industry": "零售",       "tags": ["民生", "配息", "零售"]},
    "1301": {"name": "台塑",     "industry": "石化",       "tags": ["傳產", "配息", "石化"]},
    "2002": {"name": "中鋼",     "industry": "鋼鐵",       "tags": ["傳產", "配息", "鋼鐵"]},
    "2207": {"name": "和泰車",   "industry": "汽車",       "tags": ["傳產", "配息", "汽車"]},
    "6505": {"name": "台塑化",   "industry": "石化",       "tags": ["傳產", "配息", "石化"]},
    "2344": {"name": "華邦電",   "industry": "記憶體",     "tags": ["半導體", "記憶體"]},
    "3008": {"name": "大立光",   "industry": "光學",       "tags": ["精密光學", "手機鏡頭"]},
}

STRATEGY_POOL: dict[str, list[str]] = {
    "dividend": ["2881","2882","2884","2885","2886","2887","2891","2892",
                 "5880","5871","2002","1216","2912","1301","2207","6505"],
    "growth":   ["2330","2317","2454","2308","2382","3711","2303","6669",
                 "2379","3034","2395","6770"],
    "momentum": ["2330","2317","2454","2308","3711","6669","2382","2379"],
    "value":    ["2330","2303","2002","1301","6505","2207","2344","2912",
                 "2886","2891"],
}

# ── Tool definitions ──────────────────────────────────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "screen_stocks",
            "description": "根據投資策略、產業、價格、殖利率條件篩選台股，回傳符合標的清單",
            "parameters": {
                "type": "object",
                "properties": {
                    "strategy": {
                        "type": "string",
                        "enum": ["dividend", "growth", "momentum", "value"],
                        "description": "投資策略：dividend=高配息、growth=成長股、momentum=趨勢動能、value=價值型",
                    },
                    "industries": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "指定產業關鍵字，例如 ['半導體','金融','AI伺服器']，空代表不限",
                    },
                    "max_price": {
                        "type": "number",
                        "description": "股價上限（元），不設定則不限",
                    },
                    "min_yield": {
                        "type": "number",
                        "description": "最低殖利率（%），僅 dividend 策略適用",
                    },
                    "top_n": {
                        "type": "integer",
                        "description": "回傳幾檔，預設 5",
                    },
                },
                "required": ["strategy"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_stock_detail",
            "description": "取得指定台股的即時股價、殖利率、本益比等基本資訊",
            "parameters": {
                "type": "object",
                "properties": {
                    "stock_id": {
                        "type": "string",
                        "description": "台股代號，如 '2330'",
                    },
                },
                "required": ["stock_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_overview",
            "description": "取得台股大盤今日整體概況摘要",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
]

# ── Tool implementations ──────────────────────────────────────────────────────

def _fetch_price_yield(stock_id: str) -> Tuple[Optional[float], Optional[float]]:
    """Return (price, dividend_yield%) for a TW ticker. Returns (None, None) on error."""
    try:
        t    = yf.Ticker(f"{stock_id}.TW")
        hist = t.history(period="5d")
        if hist.empty:
            return None, None
        price = round(float(hist["Close"].iloc[-1]), 2)
        info  = t.info
        raw_y = info.get("dividendYield") or 0
        dy    = round(raw_y * 100, 2) if raw_y else None
        return price, dy
    except Exception:
        return None, None


def _screen_stocks(
    strategy:   str,
    industries: Optional[List[str]] = None,
    max_price:  Optional[float] = None,
    min_yield:  Optional[float] = None,
    top_n:      int = 5,
) -> Dict:
    candidates = STRATEGY_POOL.get(strategy, list(STOCK_DB.keys()))

    if industries:
        candidates = [
            s for s in candidates
            if any(kw in " ".join(STOCK_DB.get(s, {}).get("tags", [])) for kw in industries)
            or any(kw in STOCK_DB.get(s, {}).get("industry", "") for kw in industries)
        ]

    def _check(sid: str):
        info  = STOCK_DB.get(sid, {})
        price, dy = _fetch_price_yield(sid)
        if price is None:
            return None
        if max_price and price > max_price:
            return None
        if min_yield and (dy is None or dy < min_yield):
            return None
        return {
            "stock_id":      sid,
            "name":          info.get("name", sid),
            "industry":      info.get("industry", ""),
            "price":         price,
            "dividend_yield": dy,
        }

    limit = min(len(candidates), top_n + 6)
    results = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(_check, s): s for s in candidates[:limit]}
        for f in as_completed(futs):
            r = f.result()
            if r:
                results.append(r)

    results = results[:top_n]
    return {
        "strategy": strategy,
        "stocks":   results,
        "count":    len(results),
        "message":  f"找到 {len(results)} 檔符合條件的標的",
    }


def _get_stock_detail(stock_id: str) -> Dict:
    info  = STOCK_DB.get(stock_id, {})
    price, dy = _fetch_price_yield(stock_id)
    try:
        t = yf.Ticker(f"{stock_id}.TW")
        yf_info = t.info
        pe = yf_info.get("trailingPE")
        if pe:
            pe = round(pe, 1)
    except Exception:
        pe = None

    return {
        "stock_id":       stock_id,
        "name":           info.get("name", stock_id),
        "industry":       info.get("industry", ""),
        "current_price":  price,
        "dividend_yield": dy,
        "pe_ratio":       pe,
    }


def _get_market_overview() -> Dict:
    try:
        idx = yf.Ticker("^TWII")
        hist = idx.history(period="5d")
        if not hist.empty:
            last  = hist["Close"].iloc[-1]
            prev  = hist["Close"].iloc[-2] if len(hist) > 1 else last
            chg   = round((last - prev) / prev * 100, 2)
            return {
                "taiex":   round(last, 0),
                "change":  chg,
                "summary": f"加權指數 {round(last,0):.0f} 點，{'上漲' if chg >= 0 else '下跌'} {abs(chg)}%",
            }
    except Exception:
        pass
    return {"summary": "目前無法取得大盤指數，請查看戰情中心"}


def _execute_tool(name: str, args: Dict) -> Dict:
    if name == "screen_stocks":
        return _screen_stocks(**args)
    if name == "get_stock_detail":
        return _get_stock_detail(args["stock_id"])
    if name == "get_market_overview":
        return _get_market_overview()
    return {"error": f"unknown tool: {name}"}


# ── Main entry point ──────────────────────────────────────────────────────────

def run_assistant(
    messages:  List[Dict],
    profile:   Dict,
    portfolio: List[str],
    openai_client,
) -> Dict:
    """
    Run one turn of the assistant.
    messages: list of {role, content} from the frontend conversation history.
    Returns: {reply: str, stocks: list[dict], function_called: str|None}
    """
    if openai_client is None:
        return {
            "reply": "（AI 未連線，請確認 OPENAI_API_KEY 設定）",
            "stocks": [],
            "function_called": None,
        }

    system_prompt = build_system_prompt(profile, portfolio)
    gpt_messages  = [{"role": "system", "content": system_prompt}, *messages]

    # ── Round 1: let GPT decide whether to call a tool ──
    resp1 = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=gpt_messages,
        tools=TOOLS,
        tool_choice="auto",
        max_tokens=600,
    )

    msg1 = resp1.choices[0].message

    if not msg1.tool_calls:
        return {
            "reply":           msg1.content or "",
            "stocks":          [],
            "function_called": None,
        }

    # ── Round 2: execute all tool calls, feed results back ──
    tc = msg1.tool_calls[0]
    fn_name = tc.function.name
    fn_args = json.loads(tc.function.arguments)

    tool_result = _execute_tool(fn_name, fn_args)
    stocks      = tool_result.get("stocks", []) if fn_name == "screen_stocks" else []

    gpt_messages.append(msg1)
    gpt_messages.append({
        "tool_call_id": tc.id,
        "role":         "tool",
        "content":      json.dumps(tool_result, ensure_ascii=False),
    })

    resp2 = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=gpt_messages,
        max_tokens=600,
    )

    return {
        "reply":           resp2.choices[0].message.content or "",
        "stocks":          stocks,
        "function_called": fn_name,
    }
