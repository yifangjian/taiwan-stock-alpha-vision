import os
import sys

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# data-pipeline 資料夾名稱含連字號，無法直接 import
# 改成把 scrapers 目錄本身加入 Python 路徑
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(_project_root, "data-pipeline", "scrapers"))

from ndc_macro_scraper import fetch_ndc_business_cycle_indicators

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
