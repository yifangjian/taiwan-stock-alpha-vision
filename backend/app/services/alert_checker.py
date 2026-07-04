"""
Check user-defined price / MA conditions and push via LINE.
Conditions are passed in from the frontend (stored in Supabase).
"""

from typing import List, Dict, Optional

import yfinance as yf
import pandas as pd


def _ma(series: pd.Series, n: int) -> Optional[float]:
    if len(series) < n:
        return None
    return round(float(series.rolling(n).mean().iloc[-1]), 2)


def check_condition(stock_id: str, condition_type: str, threshold: Optional[float]) -> Dict:
    """
    Evaluate one condition for a stock.
    Returns: {triggered: bool, current_price, ma60, ma20, detail}
    """
    try:
        t    = yf.Ticker(f"{stock_id}.TW")
        hist = t.history(period="4mo")
        if hist.empty:
            return {"triggered": False, "error": "無行情資料"}

        close = hist["Close"]
        price = round(float(close.iloc[-1]), 2)
        ma20  = _ma(close, 20)
        ma60  = _ma(close, 60)

        triggered = False
        if condition_type == "below_ma60" and ma60:
            triggered = price < ma60
        elif condition_type == "above_ma60" and ma60:
            triggered = price > ma60
        elif condition_type == "below_ma20" and ma20:
            triggered = price < ma20
        elif condition_type == "above_ma20" and ma20:
            triggered = price > ma20
        elif condition_type == "price_below" and threshold:
            triggered = price < threshold
        elif condition_type == "price_above" and threshold:
            triggered = price > threshold

        return {
            "triggered":     triggered,
            "stock_id":      stock_id,
            "current_price": price,
            "ma20":          ma20,
            "ma60":          ma60,
        }
    except Exception as e:
        return {"triggered": False, "error": str(e)}


def run_alert_check(conditions: List[Dict], openai_client, line_broadcast_fn) -> List[Dict]:
    """
    Check a list of conditions and push LINE notification for triggered ones.
    conditions: [{stock_id, condition_type, threshold, stock_name}]
    Returns list of triggered condition results.
    """
    triggered_list = []

    for cond in conditions:
        stock_id       = cond.get("stock_id", "")
        condition_type = cond.get("condition_type", "")
        threshold      = cond.get("threshold")
        stock_name     = cond.get("stock_name", stock_id)

        result = check_condition(stock_id, condition_type, threshold)
        if result.get("triggered"):
            triggered_list.append({**cond, **result})

    if triggered_list and line_broadcast_fn:
        lines = []
        for t in triggered_list:
            ctype  = t["condition_type"]
            price  = t["current_price"]
            labels = {
                "below_ma60": f"跌破 60MA（MA60={t.get('ma60')}）",
                "above_ma60": f"突破 60MA（MA60={t.get('ma60')}）",
                "below_ma20": f"跌破 20MA（MA20={t.get('ma20')}）",
                "above_ma20": f"突破 20MA（MA20={t.get('ma20')}）",
                "price_below": f"跌破 {t.get('threshold')} 元",
                "price_above": f"突破 {t.get('threshold')} 元",
            }
            lines.append(f"⚡ {t.get('stock_name', t['stock_id'])}（{t['stock_id']}）"
                         f" 現價 {price} 元 — {labels.get(ctype, ctype)}")

        msg = "📡 AlphaVision 條件觸發通知\n\n" + "\n".join(lines)
        try:
            line_broadcast_fn(msg)
        except Exception:
            pass

    return triggered_list
