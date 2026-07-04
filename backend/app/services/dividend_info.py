"""
Fetch dividend calendar and yield info via yfinance for a list of TW stocks.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional

import yfinance as yf

from .news_fetcher import STOCK_NAMES


def _fetch_one(stock_id: str) -> Optional[Dict]:
    try:
        t    = yf.Ticker(f"{stock_id}.TW")
        info = t.info

        raw_yield = info.get("dividendYield") or 0
        dy        = round(raw_yield * 100, 2) if raw_yield else None

        annual_div_rate = info.get("dividendRate")  # NT$ per share per year
        annual_div = round(float(annual_div_rate), 2) if annual_div_rate else None

        hist = t.history(period="5d")
        price = round(float(hist["Close"].iloc[-1]), 2) if not hist.empty else None

        divs = t.dividends
        last_div      = None
        last_div_date = None
        if not divs.empty:
            last_div      = round(float(divs.iloc[-1]), 2)
            last_div_date = divs.index[-1].strftime("%Y-%m")

        # Estimate month from ex-dividend history pattern
        ex_months = sorted({d.month for d in divs.index[-8:]}) if not divs.empty else []

        return {
            "stock_id":        stock_id,
            "name":            STOCK_NAMES.get(stock_id, stock_id),
            "dividend_yield":  dy,
            "annual_dividend": annual_div,
            "last_dividend":   last_div,
            "last_div_date":   last_div_date,
            "ex_months":       ex_months,
            "current_price":   price,
        }
    except Exception:
        return None


def get_dividend_calendar(stock_ids: List[str]) -> List[Dict]:
    """Return dividend info for each stock_id. Runs in parallel."""
    results = []
    with ThreadPoolExecutor(max_workers=5) as ex:
        futs = {ex.submit(_fetch_one, sid): sid for sid in stock_ids}
        for f in as_completed(futs):
            r = f.result()
            if r:
                results.append(r)
    return sorted(results, key=lambda x: x["stock_id"])


def get_current_prices(stock_ids: List[str]) -> Dict[str, Optional[float]]:
    """Return {stock_id: current_price} for portfolio valuation."""
    def _price(sid: str):
        try:
            hist = yf.Ticker(f"{sid}.TW").history(period="5d")
            return sid, round(float(hist["Close"].iloc[-1]), 2) if not hist.empty else None
        except Exception:
            return sid, None

    prices = {}
    with ThreadPoolExecutor(max_workers=5) as ex:
        for sid, p in ex.map(lambda s: _price(s), stock_ids):
            prices[sid] = p
    return prices
