"""
技術分析服務
純 pandas 實作 MACD / RSI / 均線，不依賴 pandas-ta / ta-lib
"""
import os
import pandas as pd

try:
    import yfinance as yf
    _HAS_YF = True
except ImportError:
    _HAS_YF = False


def _fetch(stock_id: str, period: str = "6mo") -> pd.DataFrame:
    if not _HAS_YF:
        return pd.DataFrame()
    for suffix in [".TW", ".TWO"]:
        df = yf.Ticker(f"{stock_id}{suffix}").history(period=period, interval="1d")
        if not df.empty:
            return df[df["Volume"] > 0].copy()
    return pd.DataFrame()


def get_candles(stock_id: str, period: str = "3mo") -> list:
    df = _fetch(stock_id, period)
    if df.empty:
        return []
    return [
        {
            "time":   str(r.Index.date()),
            "open":   round(float(r.Open),  2),
            "high":   round(float(r.High),  2),
            "low":    round(float(r.Low),   2),
            "close":  round(float(r.Close), 2),
        }
        for r in df.itertuples()
    ]


def compute_ta(stock_id: str) -> dict:
    df = _fetch(stock_id, "6mo")
    if df.empty or len(df) < 30:
        return {"error": "歷史資料不足"}

    close = df["Close"].dropna()

    # ── 均線 ────────────────────────────────────────────────
    ma5  = close.rolling(5).mean()
    ma20 = close.rolling(20).mean()
    ma60 = close.rolling(60).mean()

    # ── MACD (12,26,9) ──────────────────────────────────────
    ema12  = close.ewm(span=12, adjust=False).mean()
    ema26  = close.ewm(span=26, adjust=False).mean()
    macd   = ema12 - ema26
    sig    = macd.ewm(span=9, adjust=False).mean()
    hist   = macd - sig

    # ── RSI (14) ────────────────────────────────────────────
    delta = close.diff()
    gain  = delta.clip(lower=0).rolling(14).mean()
    loss  = (-delta.clip(upper=0)).rolling(14).mean()
    rsi   = 100 - 100 / (1 + gain / (loss + 1e-9))

    def _f(s, i=-1):
        v = s.iloc[i]
        return None if pd.isna(v) else float(v)

    price = _f(close)
    v5    = _f(ma5);   v20 = _f(ma20);  v60 = _f(ma60)
    vmacd = _f(macd);  vsig = _f(sig);  vhist = _f(hist); vhist_p = _f(hist, -2) or 0
    vrsi  = _f(rsi)

    # ── 型態偵測 ────────────────────────────────────────────
    patterns = []

    if v5 and v20 and v60:
        if v5 > v20 > v60 and price > v5:
            patterns.append({"label": "均線多頭排列", "type": "bullish"})
        elif v5 < v20 < v60 and price < v5:
            patterns.append({"label": "均線空頭排列", "type": "bearish"})

    if vhist is not None:
        if vhist_p < 0 and vhist > 0:
            patterns.append({"label": "MACD 黃金交叉", "type": "bullish"})
        elif vhist_p > 0 and vhist < 0:
            patterns.append({"label": "MACD 死亡交叉", "type": "bearish"})
        elif vmacd and vsig and vmacd > vsig:
            patterns.append({"label": "MACD 偏多",    "type": "bullish"})

    if vrsi is not None:
        if vrsi < 30:
            patterns.append({"label": f"RSI 超賣 {vrsi:.1f}", "type": "oversold"})
        elif vrsi > 70:
            patterns.append({"label": f"RSI 超買 {vrsi:.1f}", "type": "overbought"})

    if v20 and price > v20 and not any(p["label"] == "均線多頭排列" for p in patterns):
        patterns.append({"label": "站上 20MA", "type": "bullish"})

    above5  = bool(price > v5)  if v5  else False
    above20 = bool(price > v20) if v20 else False
    above60 = bool(price > v60) if v60 else False
    bullish = bool(v5 and v20 and v60 and v5 > v20 > v60)

    return {
        "stock_id":      stock_id,
        "current_price": round(price, 2),
        "ta_patterns":   patterns,
        "indicators": {
            "rsi":               round(vrsi, 2) if vrsi else None,
            "macd":              round(vmacd, 4) if vmacd else None,
            "macd_signal":       round(vsig, 4) if vsig else None,
            "macd_hist":         round(vhist, 4) if vhist else None,
            "ma5":               round(v5, 2) if v5 else None,
            "ma20":              round(v20, 2) if v20 else None,
            "ma60":              round(v60, 2) if v60 else None,
            "above_ma5":         above5,
            "above_ma20":        above20,
            "above_ma60":        above60,
            "bullish_alignment": bullish,
        },
    }
