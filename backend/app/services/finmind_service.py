"""
FinMind API wrapper — 基本面資料（EPS、月營收、股利）
TWSE MIS wrapper  — 盤中即時報價 + 委買委賣五檔

FINMIND_TOKEN 從環境變數讀取，不寫死在 code 裡。
"""

import os
import requests
from typing import Optional, List, Dict
from datetime import datetime, timedelta

FINMIND_TOKEN = os.getenv("FINMIND_TOKEN", "")
FINMIND_BASE  = "https://api.finmindtrade.com/api/v4/data"

# ── FinMind helpers ──────────────────────────────────────────────

def _fm_get(dataset: str, stock_id: str, start_date: str) -> List[Dict]:
    if not FINMIND_TOKEN:
        return []
    try:
        r = requests.get(FINMIND_BASE, params={
            "dataset":    dataset,
            "data_id":    stock_id,
            "start_date": start_date,
            "token":      FINMIND_TOKEN,
        }, timeout=20)
        r.raise_for_status()
        return r.json().get("data", [])
    except Exception:
        return []


_FIN_TARGETS = {"EPS", "ROE", "ROA", "毛利率", "營業利益率", "稅後淨利率"}


def get_fundamentals(stock_id: str) -> Dict:
    """
    回傳：
      financials: {EPS: [...], ROE: [...], 毛利率: [...], ...}
      revenue:    [{date, revenue}, ...]
      dividends:  [{year, cash, stock}, ...]
    """
    start_3y = (datetime.now() - timedelta(days=365 * 3)).strftime("%Y-%m-%d")
    start_2y = (datetime.now() - timedelta(days=365 * 2)).strftime("%Y-%m-%d")
    start_5y = (datetime.now() - timedelta(days=365 * 5)).strftime("%Y-%m-%d")

    # Financial statements
    fin_raw    = _fm_get("TaiwanStockFinancialStatements", stock_id, start_3y)
    financials: Dict[str, List] = {}
    for row in fin_raw:
        t = row.get("type", "")
        if t not in _FIN_TARGETS:
            continue
        financials.setdefault(t, []).append({
            "date":  row.get("date", "")[:7],
            "value": row.get("value"),
        })

    # Monthly revenue
    rev_raw = _fm_get("TaiwanStockMonthRevenue", stock_id, start_2y)
    revenue = sorted([
        {
            "date":    f"{r['revenue_year']}-{str(r['revenue_month']).zfill(2)}",
            "revenue": r.get("revenue", 0),
        }
        for r in rev_raw
    ], key=lambda x: x["date"])[-24:]

    # Dividend
    div_raw   = _fm_get("TaiwanStockDividend", stock_id, start_5y)
    dividends = [
        {
            "year":  r.get("year"),
            "cash":  float(r.get("cash_earnings_distribution") or 0),
            "stock": float(r.get("StockEarningsDistribution") or 0),
        }
        for r in div_raw
    ][-10:]

    return {
        "stock_id":   stock_id,
        "financials": financials,
        "revenue":    revenue,
        "dividends":  dividends,
    }


# ── TWSE MIS real-time + 五檔 ────────────────────────────────────

_TWSE_HEADERS = {
    "Referer":    "https://mis.twse.com.tw/",
    "User-Agent": "Mozilla/5.0",
}


def _safe_float(v) -> Optional[float]:
    try:
        f = float(v)
        return f if f != 0 else None
    except (TypeError, ValueError):
        return None


def _parse_prices(s: str) -> List[float]:
    return [float(x) for x in (s or "").split("_") if x and x not in ("-", "")]


def _parse_vols(s: str) -> List[int]:
    return [int(float(x)) for x in (s or "").split("_") if x and x not in ("-", "")]


def _parse_twse_msg(msg: Dict, exchange: str) -> Dict:
    raw_price  = msg.get("z", "-")
    price      = _safe_float(raw_price) if raw_price != "-" else None
    prev       = _safe_float(msg.get("y"))
    change     = round(price - prev, 2)     if price and prev else None
    chg_pct    = round((price - prev) / prev * 100, 2) if price and prev else None

    ask_prices = _parse_prices(msg.get("a", ""))[:5]
    bid_prices = _parse_prices(msg.get("b", ""))[:5]
    ask_vols   = _parse_vols(msg.get("f", ""))[:5]
    bid_vols   = _parse_vols(msg.get("g", ""))[:5]

    # Pad to 5 levels
    while len(ask_prices) < 5: ask_prices.append(None)
    while len(ask_vols)   < 5: ask_vols.append(0)
    while len(bid_prices) < 5: bid_prices.append(None)
    while len(bid_vols)   < 5: bid_vols.append(0)

    return {
        "stock_id":   msg.get("c", stock_id_fallback := ""),
        "name":       msg.get("n", ""),
        "exchange":   exchange.upper(),
        "price":      price,
        "prev_close": prev,
        "change":     change,
        "change_pct": chg_pct,
        "open":       _safe_float(msg.get("o")),
        "high":       _safe_float(msg.get("h")),
        "low":        _safe_float(msg.get("l")),
        "volume":     int(float(msg.get("v", 0) or 0)),
        "date":       msg.get("d", ""),
        "time":       msg.get("t", ""),
        # 五檔：ask 由低到高（最佳賣價在 index 0）
        "ask_prices": ask_prices,
        "ask_vols":   ask_vols,
        # 五檔：bid 由高到低（最佳買價在 index 0）
        "bid_prices": bid_prices,
        "bid_vols":   bid_vols,
    }


def get_realtime_twse(stock_id: str) -> Dict:
    """TWSE MIS 即時報價（盤中每 ~5 秒更新）+ 委買委賣五檔。完全免費。"""
    url = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp"
    for exchange in ("tse", "otc"):
        try:
            r = requests.get(url, params={
                "ex_ch":  f"{exchange}_{stock_id}.tw",
                "json":   "1",
                "delay":  "0",
            }, headers=_TWSE_HEADERS, timeout=8)
            msgs = r.json().get("msgArray", [])
            if msgs:
                return _parse_twse_msg(msgs[0], exchange)
        except Exception:
            pass
    return {"error": f"找不到 {stock_id} 即時報價，可能代號錯誤或非交易日"}
