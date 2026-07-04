"""
Fetch margin trading (融資券) data from TWSE public API.
"""

from datetime import datetime, timedelta
from typing import Dict, Optional

import requests

_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; AlphaVision/1.0)"}
_TIMEOUT = 12


def _recent_trading_date() -> str:
    """Return the most recent weekday date string YYYYMMDD."""
    d = datetime.now()
    while d.weekday() >= 5:          # skip Saturday / Sunday
        d -= timedelta(days=1)
    return d.strftime("%Y%m%d")


def get_margin_data(stock_id: str) -> Dict:
    """
    Query TWSE margin trading report for the given stock.
    Returns dict with keys: margin_balance, short_balance, margin_ratio, short_ratio, etc.
    """
    date = _recent_trading_date()
    url  = "https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN"
    params = {"date": date, "selectType": "ALL", "response": "json"}

    try:
        resp = requests.get(url, params=params, headers=_HEADERS, timeout=_TIMEOUT)
        payload = resp.json()
    except Exception as e:
        return {"stock_id": stock_id, "error": f"TWSE 連線失敗: {e}"}

    # payload["data"] rows: [代號, 融資買進, 融資賣出, 現金償還, 融資餘額, 前日餘額, 增減, 資使用率,
    #                         融券賣出, 融券買進, 現券償還, 融券餘額, 前日餘額, 增減, 券資比]
    rows = payload.get("data") or []
    for row in rows:
        if len(row) < 15:
            continue
        if str(row[0]).strip() == stock_id:
            def _int(s):
                try:    return int(str(s).replace(",", ""))
                except: return 0
            def _float(s):
                try:    return round(float(str(s).replace(",", "").replace("%","")), 2)
                except: return None

            return {
                "stock_id":        stock_id,
                "date":            date,
                "margin_buy":      _int(row[1]),
                "margin_sell":     _int(row[2]),
                "margin_balance":  _int(row[4]),
                "margin_prev":     _int(row[5]),
                "margin_change":   _int(row[6]),
                "margin_ratio":    _float(row[7]),   # 資使用率 %
                "short_sell":      _int(row[8]),
                "short_buy":       _int(row[9]),
                "short_balance":   _int(row[11]),
                "short_prev":      _int(row[12]),
                "short_change":    _int(row[13]),
                "short_ratio":     _float(row[14]),  # 券資比 %
            }

    return {"stock_id": stock_id, "error": f"{date} 查無融資券資料（可能為假日或非上市股）"}
