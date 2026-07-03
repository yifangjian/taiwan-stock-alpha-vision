"""
Task-020：主力成本估算
用近 10 日成交量加權均價（VWAP）估算主力持倉成本，並生成 AI 一句話結論。
"""
import os, sys
import pandas as pd

_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(os.path.join(_project_root, "data-pipeline", "scrapers"))

try:
    import yfinance as yf
    _HAS_YF = True
except ImportError:
    _HAS_YF = False

try:
    from openai import OpenAI
    _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except Exception:
    _client = None


def _fetch_hist(stock_id: str) -> pd.DataFrame:
    for suffix in [".TW", ".TWO"]:
        hist = yf.Ticker(f"{stock_id}{suffix}").history(period="30d", interval="1d")
        if not hist.empty:
            return hist
    return pd.DataFrame()


def _ai_conclusion(stock_id: str, price: float, cost: float, pct: float, above: bool) -> str:
    stance = "之上，籌碼穩固，可安心續抱" if above else "之下，留意支撐，建議謹慎操作"
    fallback = f"目前股價 {price:.0f} 元，位於主力成本 {cost:.0f} 元{stance}。"
    if not _client:
        return fallback
    try:
        resp = _client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content":
                f"台股 {stock_id}，目前股價 {price:.2f} 元，"
                f"估算主力 10 日 VWAP 成本 {cost:.2f} 元，"
                f"股價{'高於' if above else '低於'}成本 {abs(pct):.1f}%。"
                f"請用 40 字以內繁體中文，以「目前股價 X 元，位於主力成本 Y 元之[上/下]，」開頭，給出安心或警惕的操作建議。"
            }]
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return fallback


def get_smart_money_cost(stock_id: str, days: int = 10) -> dict:
    """估算主力平均成本（近 N 日 VWAP）+ AI 結論"""
    if not _HAS_YF:
        return {"error": "yfinance 未安裝"}

    hist = _fetch_hist(stock_id)
    if hist.empty:
        return {"error": f"無法取得 {stock_id} 行情資料"}

    hist = hist[hist["Volume"] > 0].tail(days).copy()
    if len(hist) < 3:
        return {"error": "交易資料不足，無法估算"}

    vwap         = float((hist["Close"] * hist["Volume"]).sum() / hist["Volume"].sum())
    current      = float(hist["Close"].dropna().iloc[-1])
    cost_low     = vwap * 0.97
    cost_high    = vwap * 1.03
    pct          = round((current - vwap) / vwap * 100, 2)
    above        = current >= vwap

    chart_data = [
        {"date": str(row.Index.date()), "close": round(float(row.Close), 2)}
        for row in hist.itertuples()
    ]

    return {
        "stock_id":          stock_id,
        "current_price":     round(current, 2),
        "smart_money_cost":  round(vwap, 2),
        "cost_low":          round(cost_low, 2),
        "cost_high":         round(cost_high, 2),
        "price_vs_cost_pct": pct,
        "above_cost":        above,
        "chart_data":        chart_data,
        "ai_conclusion":     _ai_conclusion(stock_id, current, vwap, pct, above),
        "days_analyzed":     len(hist),
    }
