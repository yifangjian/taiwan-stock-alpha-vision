"""
景氣燈號 × 0050 策略回測引擎
邏輯：燈號達到進場條件 → 買入；達到出場條件 → 賣出
"""
import warnings
import pandas as pd
warnings.filterwarnings("ignore")

try:
    import yfinance as yf
    HAS_YFINANCE = True
except ImportError:
    HAS_YFINANCE = False

import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from ndc_macro_scraper import fetch_ndc_business_cycle_indicators


def _get_0050_monthly_returns() -> pd.DataFrame:
    """從 yfinance 取得 0050 月線報酬率"""
    if not HAS_YFINANCE:
        return pd.DataFrame()
    hist = yf.Ticker("0050.TW").history(period="max", interval="1mo")
    hist = hist["Close"].dropna().reset_index()
    hist.columns = ["Date", "Close"]
    hist["Date"] = hist["Date"].dt.strftime("%Y-%m")
    hist["Return"] = hist["Close"].pct_change()
    return hist.dropna()[["Date", "Close", "Return"]].reset_index(drop=True)


def run_backtest(entry_score: int, exit_score: int, capital: float = 1_000_000) -> dict:
    """
    執行策略回測。

    Args:
        entry_score: 進場閾值，燈號分數 <= 此值時買入（如 16 = 藍燈）
        exit_score:  出場閾值，燈號分數 >= 此值時賣出（如 38 = 紅燈）
        capital:     初始資金（元）

    Returns:
        dict containing win_rate, total_return, mdd, equity_curve
    """
    # 取景氣燈號資料（由舊到新）
    macro_df = fetch_ndc_business_cycle_indicators()
    if macro_df is None or macro_df.empty:
        return {"error": "無法取得景氣燈號資料"}
    macro_df = macro_df.sort_values("Date").reset_index(drop=True)

    # 取 0050 月線
    market_df = _get_0050_monthly_returns()
    if market_df.empty:
        return {"error": "無法取得 0050 月線資料"}

    # 合併（以月份對齊）
    df = pd.merge(macro_df, market_df, on="Date", how="inner")
    if df.empty:
        return {"error": "景氣燈號與市場資料無法對齊"}

    # 模擬策略
    in_market = False
    equity = capital
    equity_curve = []
    monthly_returns = []

    for _, row in df.iterrows():
        score = row["Signal_Score"]
        ret   = row["Return"]

        # 判斷進出場
        if not in_market and score <= entry_score:
            in_market = True
        elif in_market and score >= exit_score:
            in_market = False

        if in_market:
            equity *= (1 + ret)
            monthly_returns.append(ret)

        equity_curve.append({"date": row["Date"], "equity": round(equity, 0), "in_market": in_market})

    if not monthly_returns:
        return {"error": "策略條件下無任何進場紀錄，請調整進出場設定"}

    # 計算績效指標
    wins = sum(1 for r in monthly_returns if r > 0)
    win_rate = round(wins / len(monthly_returns) * 100, 1)
    total_return = round((equity - capital) / capital * 100, 2)

    # MDD（最大回撤）
    peak = capital
    mdd = 0.0
    running = capital
    for pt in equity_curve:
        if pt["in_market"]:
            running = pt["equity"]
            if running > peak:
                peak = running
            drawdown = (peak - running) / peak * 100
            if drawdown > mdd:
                mdd = drawdown

    return {
        "entry_score":    entry_score,
        "exit_score":     exit_score,
        "initial_capital": capital,
        "final_capital":  round(equity, 0),
        "total_return_pct": total_return,
        "win_rate_pct":   win_rate,
        "mdd_pct":        round(mdd, 2),
        "months_in_market": len(monthly_returns),
        "equity_curve":   equity_curve[-60:],  # 回傳最近 60 個月供圖表
    }


if __name__ == "__main__":
    print("執行回測：藍燈進場(≤16)，紅燈出場(≥38)，本金 100 萬...")
    result = run_backtest(entry_score=16, exit_score=38, capital=1_000_000)
    if "error" in result:
        print("錯誤:", result["error"])
    else:
        print(f"總報酬率: {result['total_return_pct']}%")
        print(f"歷史勝率: {result['win_rate_pct']}%")
        print(f"最大回撤: {result['mdd_pct']}%")
        print(f"在市場月數: {result['months_in_market']} 個月")
        print(f"最終資金: NT${result['final_capital']:,.0f}")
