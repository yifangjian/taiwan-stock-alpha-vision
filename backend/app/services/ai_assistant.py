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
    # ── ETF ──
    "0050": {"name": "元大台灣50",     "industry": "ETF",     "tags": ["ETF", "大盤", "被動投資"]},
    "0056": {"name": "元大高股息",     "industry": "ETF",     "tags": ["ETF", "高股息", "配息"]},
    "00878": {"name": "國泰永續高股息","industry": "ETF",     "tags": ["ETF", "高股息", "ESG"]},
    "006208": {"name": "富邦台50",     "industry": "ETF",     "tags": ["ETF", "大盤", "被動投資"]},
    "00713": {"name": "元大台灣高息低波","industry": "ETF",   "tags": ["ETF", "高股息", "低波動"]},
    "00692": {"name": "富邦公司治理",  "industry": "ETF",     "tags": ["ETF", "ESG"]},
    "00770": {"name": "國泰北美科技",  "industry": "ETF",     "tags": ["ETF", "科技", "美國"]},
    "00631L": {"name": "元大台灣50正2","industry": "ETF",     "tags": ["ETF", "槓桿", "大盤"]},

    # ── 半導體 ──
    "2330": {"name": "台積電",        "industry": "半導體",   "tags": ["半導體", "AI", "晶圓代工"]},
    "2303": {"name": "聯電",          "industry": "半導體",   "tags": ["半導體", "晶圓代工"]},
    "2454": {"name": "聯發科",        "industry": "IC設計",   "tags": ["半導體", "AI", "IC設計"]},
    "2379": {"name": "瑞昱",          "industry": "IC設計",   "tags": ["半導體", "IC設計"]},
    "3034": {"name": "聯詠",          "industry": "IC設計",   "tags": ["半導體", "IC設計", "面板驅動"]},
    "3711": {"name": "日月光投控",    "industry": "半導體封測","tags": ["半導體", "封測"]},
    "2344": {"name": "華邦電",        "industry": "記憶體",   "tags": ["半導體", "記憶體"]},
    "6770": {"name": "力積電",        "industry": "半導體",   "tags": ["半導體", "記憶體"]},
    "5483": {"name": "中美晶",        "industry": "半導體",   "tags": ["半導體", "矽晶圓"]},
    "3008": {"name": "大立光",        "industry": "光學",     "tags": ["精密光學", "手機鏡頭"]},
    "2337": {"name": "旺宏",          "industry": "記憶體",   "tags": ["半導體", "快閃記憶體"]},
    "2408": {"name": "南亞科",        "industry": "記憶體",   "tags": ["半導體", "DRAM"]},
    "3450": {"name": "聯鈞",          "industry": "IC設計",   "tags": ["半導體", "IC設計"]},

    # ── 科技製造 / AI 供應鏈 ──
    "2317": {"name": "鴻海",          "industry": "科技製造", "tags": ["AI伺服器", "電子製造"]},
    "2308": {"name": "台達電",        "industry": "電子零組件","tags": ["電源", "AI伺服器"]},
    "2382": {"name": "廣達",          "industry": "伺服器",   "tags": ["AI伺服器", "科技製造"]},
    "6669": {"name": "緯穎",          "industry": "伺服器",   "tags": ["AI伺服器"]},
    "2395": {"name": "研華",          "industry": "工業電腦", "tags": ["工業", "IoT"]},
    "3231": {"name": "緯創",          "industry": "科技製造", "tags": ["AI伺服器", "電子製造"]},
    "4938": {"name": "和碩",          "industry": "科技製造", "tags": ["電子製造", "組裝"]},
    "2357": {"name": "華碩",          "industry": "電腦",     "tags": ["PC", "電腦", "科技"]},
    "2376": {"name": "技嘉",          "industry": "電腦",     "tags": ["PC", "主機板", "AI伺服器"]},
    "3481": {"name": "群創",          "industry": "面板",     "tags": ["面板", "顯示器"]},
    "2409": {"name": "友達",          "industry": "面板",     "tags": ["面板", "顯示器"]},
    "4958": {"name": "臻鼎-KY",      "industry": "PCB",      "tags": ["PCB", "電子零組件"]},
    "2352": {"name": "佳世達",        "industry": "科技製造", "tags": ["科技", "醫療"]},
    "3045": {"name": "台灣大",        "industry": "電信",     "tags": ["電信", "5G", "配息"]},
    "4904": {"name": "遠傳",          "industry": "電信",     "tags": ["電信", "5G", "配息"]},
    "2412": {"name": "中華電",        "industry": "電信",     "tags": ["電信", "配息", "防禦型"]},
    "2049": {"name": "上銀",          "industry": "精密機械", "tags": ["機械", "電動車", "工業"]},

    # ── 金融 ──
    "2881": {"name": "富邦金",        "industry": "金融",     "tags": ["金融", "配息", "壽險"]},
    "2882": {"name": "國泰金",        "industry": "金融",     "tags": ["金融", "配息", "壽險"]},
    "2884": {"name": "玉山金",        "industry": "金融",     "tags": ["金融", "配息", "銀行"]},
    "2885": {"name": "元大金",        "industry": "金融",     "tags": ["金融", "配息", "證券"]},
    "2886": {"name": "兆豐金",        "industry": "金融",     "tags": ["金融", "配息", "銀行"]},
    "2887": {"name": "台新金",        "industry": "金融",     "tags": ["金融", "配息", "銀行"]},
    "2891": {"name": "中信金",        "industry": "金融",     "tags": ["金融", "配息", "銀行"]},
    "2892": {"name": "第一金",        "industry": "金融",     "tags": ["金融", "配息", "銀行"]},
    "5880": {"name": "合庫金",        "industry": "金融",     "tags": ["金融", "配息", "銀行"]},
    "5871": {"name": "中租-KY",       "industry": "金融",     "tags": ["金融", "租賃"]},
    "2823": {"name": "中壽",          "industry": "金融",     "tags": ["金融", "壽險"]},
    "2880": {"name": "華南金",        "industry": "金融",     "tags": ["金融", "配息", "銀行"]},
    "2834": {"name": "臺企銀",        "industry": "金融",     "tags": ["金融", "銀行"]},

    # ── 傳產 / 民生 ──
    "1216": {"name": "統一",          "industry": "食品",     "tags": ["民生", "配息", "食品"]},
    "2912": {"name": "統一超",        "industry": "零售",     "tags": ["民生", "配息", "零售"]},
    "1301": {"name": "台塑",          "industry": "石化",     "tags": ["傳產", "配息", "石化"]},
    "1303": {"name": "南亞",          "industry": "石化",     "tags": ["傳產", "配息", "石化"]},
    "6505": {"name": "台塑化",        "industry": "石化",     "tags": ["傳產", "配息", "石化"]},
    "2002": {"name": "中鋼",          "industry": "鋼鐵",     "tags": ["傳產", "配息", "鋼鐵"]},
    "2207": {"name": "和泰車",        "industry": "汽車",     "tags": ["傳產", "配息", "汽車"]},
    "1101": {"name": "台泥",          "industry": "水泥",     "tags": ["傳產", "配息", "水泥", "ESG"]},
    "2105": {"name": "正新",          "industry": "橡膠",     "tags": ["傳產", "配息", "輪胎"]},
    "9910": {"name": "豐泰",          "industry": "橡膠",     "tags": ["傳產", "運動鞋"]},
    "1802": {"name": "台玻",          "industry": "玻璃",     "tags": ["傳產", "玻璃"]},

    # ── 生技 / 醫療 ──
    "4711": {"name": "中裕",          "industry": "生技",     "tags": ["生技", "新藥"]},
    "6446": {"name": "藥華藥",        "industry": "生技",     "tags": ["生技", "新藥", "罕見疾病"]},
    "1786": {"name": "科妍",          "industry": "生技",     "tags": ["生技", "醫美"]},
    "4127": {"name": "天晟",          "industry": "醫療",     "tags": ["醫療", "醫材"]},
    "1762": {"name": "中化生",        "industry": "生技",     "tags": ["生技", "學名藥"]},
    "6598": {"name": "金穎生技",      "industry": "生技",     "tags": ["生技", "保健"]},

    # ── 綠能 / 電動車 ──
    "3576": {"name": "新日興",        "industry": "綠能",     "tags": ["太陽能", "綠能"]},
    "6285": {"name": "啟碁",          "industry": "通訊",     "tags": ["5G", "通訊模組"]},
    "1590": {"name": "亞德客-KY",    "industry": "精密機械", "tags": ["氣動元件", "電動車", "工業"]},
    "2367": {"name": "燿華",          "industry": "PCB",      "tags": ["PCB", "電子零組件"]},
}

STRATEGY_POOL: dict[str, list[str]] = {
    "dividend": [
        "0056","00878","00713",
        "2881","2882","2884","2885","2886","2887","2891","2892","5880","5871",
        "2880","2823","2834",
        "2002","1216","2912","1301","1303","2207","6505","1101","2412","3045","4904",
    ],
    "growth": [
        "2330","2317","2454","2308","2382","3711","2303","6669","2379","3034",
        "2395","6770","4938","2376","3231","4958","5483","6446","1590","2049",
    ],
    "momentum": [
        "2330","2317","2454","2308","3711","6669","2382","2379","6285","2376","3231",
    ],
    "value": [
        "0050","006208",
        "2330","2303","2002","1301","1303","6505","2207","2344","2912",
        "2886","2891","1101","2412",
    ],
    "etf": [
        "0050","0056","00878","006208","00713","00692","00770",
    ],
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
                        "enum": ["dividend", "growth", "momentum", "value", "etf"],
                        "description": "投資策略：dividend=高配息、growth=成長股、momentum=趨勢動能、value=價值型、etf=ETF",
                    },
                    "industries": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "指定產業關鍵字，例如 ['半導體','金融','AI伺服器','ETF','生技']，空代表不限",
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
            "description": (
                "取得任意台股（或ETF）的即時股價、殖利率、本益比、52週高低點等資訊。"
                "只要是合法的台股代號（如 '2330'、'0050'、'00878'）都可查詢，不限於資料庫中的標的。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "stock_id": {
                        "type": "string",
                        "description": "台股代號，如 '2330'、'0050'、'00878'",
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
            "description": "取得台股大盤今日整體概況摘要（加權指數漲跌）",
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
            "stock_id":       sid,
            "name":           info.get("name", sid),
            "industry":       info.get("industry", ""),
            "price":          price,
            "dividend_yield": dy,
        }

    limit = min(len(candidates), top_n + 6)
    results = []
    with ThreadPoolExecutor(max_workers=6) as ex:
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
    db_info = STOCK_DB.get(stock_id, {})

    try:
        t       = yf.Ticker(f"{stock_id}.TW")
        yf_info = t.info
        hist    = t.history(period="5d")

        price = None
        if not hist.empty:
            price = round(float(hist["Close"].iloc[-1]), 2)

        raw_y = yf_info.get("dividendYield") or 0
        dy    = round(raw_y * 100, 2) if raw_y else None
        pe    = yf_info.get("trailingPE")
        if pe:
            pe = round(pe, 1)

        w52_high = yf_info.get("fiftyTwoWeekHigh")
        w52_low  = yf_info.get("fiftyTwoWeekLow")
        mkt_cap  = yf_info.get("marketCap")

        # Resolve name: prefer DB, then yfinance longName/shortName
        if not db_info:
            raw_name = yf_info.get("longName") or yf_info.get("shortName") or stock_id
            # yfinance often returns English — keep it as-is when no DB entry
            name     = raw_name
            industry = yf_info.get("sector") or "—"
        else:
            name     = db_info.get("name", stock_id)
            industry = db_info.get("industry", "—")

        result = {
            "stock_id":       stock_id,
            "name":           name,
            "industry":       industry,
            "current_price":  price,
            "dividend_yield": dy,
            "pe_ratio":       pe,
        }
        if w52_high:
            result["week52_high"] = round(w52_high, 2)
        if w52_low:
            result["week52_low"]  = round(w52_low, 2)
        if mkt_cap:
            result["market_cap_bn"] = round(mkt_cap / 1e9, 1)

        if price is None:
            result["error"] = f"找不到 {stock_id} 的即時報價，請確認代號是否正確"

        return result

    except Exception as e:
        return {
            "stock_id": stock_id,
            "error":    f"查詢失敗：{e}",
        }


def _get_market_overview() -> Dict:
    try:
        idx  = yf.Ticker("^TWII")
        hist = idx.history(period="5d")
        if not hist.empty:
            last  = hist["Close"].iloc[-1]
            prev  = hist["Close"].iloc[-2] if len(hist) > 1 else last
            chg   = round((last - prev) / prev * 100, 2)
            vol   = hist["Volume"].iloc[-1] if "Volume" in hist.columns else None
            return {
                "taiex":   round(last, 0),
                "change":  chg,
                "volume":  vol,
                "summary": (
                    f"加權指數 {round(last, 0):.0f} 點，"
                    f"{'上漲' if chg >= 0 else '下跌'} {abs(chg)}%"
                ),
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
        max_tokens=800,
    )

    msg1 = resp1.choices[0].message

    if not msg1.tool_calls:
        return {
            "reply":           msg1.content or "",
            "stocks":          [],
            "function_called": None,
        }

    # ── Round 2: execute all tool calls, feed results back ──
    tc      = msg1.tool_calls[0]
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
        max_tokens=800,
    )

    return {
        "reply":           resp2.choices[0].message.content or "",
        "stocks":          stocks,
        "function_called": fn_name,
    }
