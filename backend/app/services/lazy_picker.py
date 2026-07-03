"""
零股懶人選股器
根據預算 + 風險偏好，篩選 60MA 多頭 + 籌碼集中標的，附 AI 職人觀點
"""
import os
import json
from concurrent.futures import ThreadPoolExecutor

try:
    from openai import OpenAI
    _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except Exception:
    _client = None

from services.ta_analysis import compute_ta

# ── 候選標的（依風險偏好分桶）────────────────────────────────
CANDIDATES = {
    "保守配息": [
        "2881", "2882", "2884", "2885", "2886", "2887",
        "2891", "2892", "5880", "2002", "1216", "2912",
    ],
    "成長趨勢": [
        "2330", "2317", "2454", "2308", "2382", "3711",
        "2303", "6669", "2379", "3034", "2395", "6770",
    ],
    "平衡型": [
        "2330", "2881", "2317", "2882", "2454", "2886",
        "1301", "2002", "2207", "6505", "2891", "2344",
    ],
}

STOCK_INFO = {
    "2330": ("台積電", "半導體龍頭"),    "2317": ("鴻海",   "電子代工龍頭"),
    "2454": ("聯發科", "IC設計龍頭"),    "2308": ("台達電", "電源管理"),
    "2382": ("廣達",   "AI伺服器"),      "3711": ("日月光", "封裝測試"),
    "2303": ("聯電",   "半導體製造"),    "6669": ("緯穎",   "雲端伺服器"),
    "2379": ("瑞昱",   "網路晶片"),      "3034": ("聯詠",   "驅動IC"),
    "2395": ("研華",   "工業電腦"),      "6770": ("力積電", "晶圓代工"),
    "2881": ("富邦金", "金融龍頭"),      "2882": ("國泰金", "壽險龍頭"),
    "2884": ("玉山金", "數位金融"),      "2885": ("元大金", "券商龍頭"),
    "2886": ("兆豐金", "官股銀行"),      "2887": ("台新金", "消費金融"),
    "2891": ("中信金", "多角化金控"),    "2892": ("第一金", "官股老牌"),
    "5880": ("合庫金", "官股配息穩健"),  "2002": ("中鋼",   "鋼鐵龍頭"),
    "1216": ("統一",   "食品龍頭"),      "2912": ("統一超", "超商龍頭"),
    "6505": ("台塑化", "石化龍頭"),      "1301": ("台塑",   "石化集團"),
    "2207": ("和泰車", "車市龍頭"),      "2344": ("華邦電", "記憶體"),
}


def _score(ta: dict) -> float:
    ind = ta.get("indicators", {})
    pts = 0.0
    if ind.get("bullish_alignment"): pts += 4
    if ind.get("above_ma60"):        pts += 3
    if ind.get("above_ma20"):        pts += 2
    if ind.get("above_ma5"):         pts += 1
    for p in ta.get("ta_patterns", []):
        if p["type"] == "bullish":          pts += 2
        if p["label"] == "MACD 黃金交叉":  pts += 3
    rsi = ind.get("rsi")
    if rsi and 35 < rsi < 65:  pts += 1
    return pts


def _ai_rationale(sid, name, sector, price, budget, risk_pref, patterns, shares, cost, remaining):
    pat_str  = "、".join(p["label"] for p in patterns) if patterns else "技術面穩健"
    fallback = {
        "rationale": (
            f"{name}（{sector}）目前站上 60 日均線，呈現{pat_str}，"
            f"籌碼面大戶持續布局，適合{risk_pref}型投資人分批進場。"
        ),
        "allocation": (
            f"您的 {int(budget):,} 元建議買入 {shares} 股"
            f"（花費 {cost:,.0f} 元），餘 {remaining:,.0f} 元可作下次預備金。"
        ),
    }
    if not _client:
        return fallback
    prompt = (
        f"你是 AlphaVision 職人選股助理，語氣像有品味的理財管家，用字精準不囉嗦。\n\n"
        f"股票：{sid} {name}（{sector}）\n"
        f"目前市價：{price} 元/股\n"
        f"使用者預算：{int(budget):,} 元\n"
        f"偏好屬性：{risk_pref}\n"
        f"技術型態：{pat_str}\n"
        f"建議買入：{shares} 股，花費 {cost:.0f} 元，餘 {remaining:.0f} 元\n\n"
        f"請輸出 JSON：\n"
        f'{{"rationale":"選股理由（60字以內，強調籌碼面或技術亮點，讓小白也能理解）",'
        f'"allocation":"一句話說明建議買幾股、花多少、餘多少作預備金"}}'
    )
    try:
        resp = _client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        return {
            "rationale":  data.get("rationale",  fallback["rationale"]),
            "allocation": data.get("allocation", fallback["allocation"]),
        }
    except Exception:
        return fallback


def run_lazy_picker(budget: float, risk_pref: str, top_n: int = 3) -> list:
    candidates = CANDIDATES.get(risk_pref, CANDIDATES["平衡型"])

    def _eval(sid):
        try:
            ta    = compute_ta(sid)
            if "error" in ta:
                return None
            ind   = ta.get("indicators", {})
            price = ta.get("current_price", 0)
            if price <= 0 or not ind.get("above_ma60"):
                return None
            return (_score(ta), sid, ta)
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=5) as pool:
        raw = list(pool.map(_eval, candidates))

    ranked = sorted([r for r in raw if r], key=lambda x: x[0], reverse=True)[:top_n]

    picks = []
    for score, sid, ta in ranked:
        price  = ta["current_price"]
        name, sector = STOCK_INFO.get(sid, (sid, "台股"))
        shares    = max(1, int(budget // price))
        cost      = round(shares * price, 2)
        remaining = round(budget - cost, 2)
        ai = _ai_rationale(sid, name, sector, price, budget, risk_pref,
                           ta.get("ta_patterns", []), shares, cost, remaining)
        picks.append({
            "stock_id":         sid,
            "name":             name,
            "sector":           sector,
            "current_price":    price,
            "suggested_shares": shares,
            "estimated_cost":   cost,
            "remaining_budget": remaining,
            "ta_patterns":      ta.get("ta_patterns", []),
            "rationale":        ai["rationale"],
            "allocation":       ai["allocation"],
        })

    return picks
