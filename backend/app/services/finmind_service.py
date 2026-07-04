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


def _inst_key(name: str) -> Optional[str]:
    """Map a FinMind institution name to internal key, or None to skip."""
    if not name or "三大法人" in name:
        return None
    # Foreign investors (外資 + 外資自營商 → both count as foreign capital)
    if "Foreign" in name or "外資" in name:
        return "foreign"
    # Investment trust funds
    if "Investment_Trust" in name or "投信" in name:
        return "trust"
    # Dealers — Dealer_self + Dealer_Hedging are the only rows FinMind provides
    if "Dealer" in name or "自營" in name:
        return "dealer"
    return None


def get_institutional_raw_names(stock_id: str) -> List[str]:
    """Debug helper — return all unique name values from FinMind for this stock."""
    start = (datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d")
    raw   = _fm_get("TaiwanStockInstitutionalInvestorsBuySell", stock_id, start)
    return sorted({r.get("name", "") for r in raw})


def get_institutional(stock_id: str) -> Dict:
    """
    三大法人買賣超（近 60 個交易日）+ 週轉率（yfinance 計算）。
    買賣超單位：千股（張）
    """
    if not FINMIND_TOKEN:
        return {
            "stock_id": stock_id, "institutional": [], "turnover": [],
            "token_missing": True,
        }

    start = (datetime.now() - timedelta(days=120)).strftime("%Y-%m-%d")
    raw   = _fm_get("TaiwanStockInstitutionalInvestorsBuySell", stock_id, start)

    by_date: Dict[str, Dict] = {}
    for r in raw:
        key  = _inst_key(r.get("name", ""))
        if not key:
            continue
        d    = r.get("date", "")[:10]
        diff = int(r.get("diff", 0) or 0)
        if d not in by_date:
            by_date[d] = {"date": d, "foreign": 0, "trust": 0, "dealer": 0}
        by_date[d][key] += diff

    institutional = sorted(by_date.values(), key=lambda x: x["date"])[-60:]

    # Cumulative sums
    cum = {"foreign": 0, "trust": 0, "dealer": 0}
    for row in institutional:
        for k in cum:
            cum[k] += row[k]
            row[f"{k}_cum"] = cum[k]

    # Turnover rate from yfinance
    turnover: List[Dict] = []
    try:
        import yfinance as yf
        t      = yf.Ticker(f"{stock_id}.TW")
        hist   = t.history(period="3mo")
        info   = t.info
        shares = (info.get("sharesOutstanding") or
                  info.get("impliedSharesOutstanding") or 0)
        if shares and not hist.empty:
            for idx, row in hist.iterrows():
                if row["Volume"] > 0:
                    rate = round(row["Volume"] / shares * 100, 4)
                    turnover.append({"date": idx.strftime("%Y-%m-%d"), "rate": rate})
    except Exception:
        pass

    return {
        "stock_id":      stock_id,
        "institutional": institutional,
        "turnover":      turnover[-60:],
    }


def get_margin_history(stock_id: str) -> Dict:
    """融資融券歷史（近 60 個交易日）。單位：張（千股）。"""
    if not FINMIND_TOKEN:
        return {"stock_id": stock_id, "history": [], "token_missing": True}

    start = (datetime.now() - timedelta(days=120)).strftime("%Y-%m-%d")
    raw   = _fm_get("TaiwanStockMarginPurchaseShortSale", stock_id, start)

    def _i(r, *keys):
        for k in keys:
            v = r.get(k)
            if v is not None:
                try:
                    return int(float(v))
                except (ValueError, TypeError):
                    pass
        return 0

    history = []
    for r in raw:
        history.append({
            "date":           r.get("date", "")[:10],
            "margin_balance": _i(r, "MarginPurchaseTodayBalance"),
            "margin_buy":     _i(r, "MarginPurchaseBuy"),
            "margin_sell":    _i(r, "MarginPurchaseSell"),
            "short_balance":  _i(r, "ShortSaleTodayBalance"),
            "short_buy":      _i(r, "ShortSaleBuy"),
            "short_sell":     _i(r, "ShortSaleSell"),
        })

    return {
        "stock_id": stock_id,
        "history":  sorted(history, key=lambda x: x["date"])[-60:],
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
