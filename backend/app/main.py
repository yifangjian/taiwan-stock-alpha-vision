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
    """呼叫 PTT 股板爬蟲 + OpenAI，回傳今日散戶恐慌/貪婪指數"""
    result = analyze_ptt_sentiment()
    if result is None:
        raise HTTPException(status_code=500, detail="PTT 情緒分析失敗")
    return {"status": "success", **result}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
