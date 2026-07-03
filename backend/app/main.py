import os
import sys
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(_project_root, "data-pipeline", "scrapers"))

from dotenv import load_dotenv
load_dotenv(os.path.join(_project_root, ".env"))

from ndc_macro_scraper import fetch_ndc_business_cycle_indicators
from twse_institutional_scraper import fetch_twse_institutional
from sentiment_analyzer import analyze_ptt_sentiment
from stock_health_scraper import get_stock_health
from tdcc_scraper import fetch_tdcc_distribution
from backtest_engine import run_backtest

app = FastAPI(
    title="AlphaVision Taiwan API",
    description="專為台股散戶打造的機構級籌碼與宏觀決策平台 API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to AlphaVision Taiwan API Services"}


@app.get("/api/v1/macro/signal")
def get_macro_signal():
    """獲取國發會景氣對策信號歷史數據"""
    df = fetch_ndc_business_cycle_indicators()
    if df is None or df.empty:
        raise HTTPException(status_code=500, detail="無法取得國發會景氣燈號數據")
    return {
        "status": "success",
        "total_records": len(df),
        "data": df.to_dict(orient="records"),
    }


@app.get("/api/v1/chip/institutional")
def get_institutional_chip(
    date: Optional[str] = Query(
        None,
        description="查詢日期，格式為 YYYYMMDD。例如：20260703。若未填寫則預設為今日。",
        pattern=r"^\d{8}$",
    )
):
    """獲取台灣證交所三大法人買賣超日報"""
    query_date = date if date else datetime.now().strftime("%Y%m%d")
    df = fetch_twse_institutional(query_date)
    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"無法取得 {query_date} 的三大法人資料，該日可能為非交易日（假日）。",
        )
    return {
        "status": "success",
        "query_date": query_date,
        "data": df.to_dict(orient="records"),
    }


@app.get("/api/v1/sentiment/ptt")
def get_ptt_sentiment():
    """PTT 股板爬蟲 + OpenAI 情緒分析，附白話操作建議 eli5_advice"""
    # 取得景氣與法人資料作為 AI 的額外上下文
    macro_score, macro_label, chip_net_billion = None, None, None
    try:
        macro_df = fetch_ndc_business_cycle_indicators()
        if macro_df is not None and not macro_df.empty:
            macro_score = int(macro_df.iloc[0]["Signal_Score"])
            macro_label = macro_df.iloc[0]["Signal_Color"]
    except Exception:
        pass

    try:
        chip_df = fetch_twse_institutional(datetime.now().strftime("%Y%m%d"))
        if chip_df is not None and not chip_df.empty:
            total = chip_df[chip_df["單位名稱"] == "合計"]
            if not total.empty:
                chip_net_billion = round(float(total.iloc[0]["買賣差額"]) / 1e8, 1)
    except Exception:
        pass

    result = analyze_ptt_sentiment(
        macro_score=macro_score,
        macro_label=macro_label,
        chip_net_billion=chip_net_billion,
    )
    if result is None:
        raise HTTPException(status_code=500, detail="PTT 情緒分析失敗")
    return {"status": "success", **result}


@app.get("/api/v1/chip/stock/{stock_id}")
def get_stock_health_check(stock_id: str):
    """個股健康檢查：外資動向 + 均線位置 + 綜合結論"""
    if not stock_id.isdigit() or len(stock_id) not in (4, 5, 6):
        raise HTTPException(status_code=400, detail="股票代號格式錯誤，請輸入 4~6 位數字")
    result = get_stock_health(stock_id)
    return {"status": "success", **result}


@app.get("/api/v1/chip/distribution/{stock_id}")
def get_stock_distribution(stock_id: str):
    """集保股權分散：大戶(千張+)與散戶(10張以下)持股比例，累積快取模式"""
    if not stock_id.isdigit() or len(stock_id) not in (4, 5, 6):
        raise HTTPException(status_code=400, detail="股票代號格式錯誤")
    data = fetch_tdcc_distribution(stock_id)
    return {"status": "success", "stock_id": stock_id, "data": data}


@app.post("/api/v1/backtest")
def backtest(
    entry_score: int = Query(16, description="進場閾值（燈號分數 <= 此值買入）"),
    exit_score:  int = Query(38, description="出場閾值（燈號分數 >= 此值賣出）"),
    capital:     float = Query(1_000_000, description="初始資金（元）"),
):
    """景氣燈號 × 0050 無程式碼策略回測"""
    if entry_score >= exit_score:
        raise HTTPException(status_code=400, detail="進場閾值必須小於出場閾值")
    result = run_backtest(entry_score=entry_score, exit_score=exit_score, capital=capital)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"status": "success", **result}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
