import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_app_dir      = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(_project_root, "data-pipeline", "scrapers"))
sys.path.append(_app_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(_project_root, ".env"))

from ndc_macro_scraper       import fetch_ndc_business_cycle_indicators
from twse_institutional_scraper import fetch_twse_institutional
from sentiment_analyzer      import analyze_ptt_sentiment
from stock_health_scraper    import get_stock_health
from tdcc_scraper            import fetch_tdcc_distribution
from backtest_engine         import run_backtest
from news_scraper            import get_filtered_news
from line_bot                import handle_webhook
from scheduler               import create_scheduler
from services.smart_money    import get_smart_money_cost

try:
    from openai import OpenAI
    _openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except Exception:
    _openai = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = create_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="AlphaVision Taiwan API",
    description="台股智能決策平台 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 基本 ──────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "Welcome to AlphaVision Taiwan API"}


# ── 景氣燈號 ─────────────────────────────────────────────────
@app.get("/api/v1/macro/signal")
def get_macro_signal():
    df = fetch_ndc_business_cycle_indicators()
    if df is None or df.empty:
        raise HTTPException(status_code=500, detail="無法取得景氣燈號數據")
    return {"status": "success", "total_records": len(df), "data": df.to_dict(orient="records")}


# ── 三大法人 ─────────────────────────────────────────────────
@app.get("/api/v1/chip/institutional")
def get_institutional_chip(
    date: Optional[str] = Query(None, pattern=r"^\d{8}$")
):
    query_date = date or datetime.now().strftime("%Y%m%d")
    df = fetch_twse_institutional(query_date)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"{query_date} 無三大法人資料（可能為假日）")
    return {"status": "success", "query_date": query_date, "data": df.to_dict(orient="records")}


# ── PTT 情緒 ─────────────────────────────────────────────────
@app.get("/api/v1/sentiment/ptt")
def get_ptt_sentiment():
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
    result = analyze_ptt_sentiment(macro_score=macro_score, macro_label=macro_label, chip_net_billion=chip_net_billion)
    if result is None:
        raise HTTPException(status_code=500, detail="PTT 情緒分析失敗")
    return {"status": "success", **result}


# ── 個股健檢 ─────────────────────────────────────────────────
@app.get("/api/v1/chip/stock/{stock_id}")
def get_stock_health_check(stock_id: str):
    if not stock_id.isdigit() or len(stock_id) not in (4, 5, 6):
        raise HTTPException(status_code=400, detail="股票代號格式錯誤")
    return {"status": "success", **get_stock_health(stock_id)}


# ── 集保分散 ─────────────────────────────────────────────────
@app.get("/api/v1/chip/distribution/{stock_id}")
def get_stock_distribution(stock_id: str):
    if not stock_id.isdigit() or len(stock_id) not in (4, 5, 6):
        raise HTTPException(status_code=400, detail="股票代號格式錯誤")
    return {"status": "success", "stock_id": stock_id, "data": fetch_tdcc_distribution(stock_id)}


# ── Task-020：主力成本估算 ────────────────────────────────────
@app.get("/api/v1/chip/smart-money/{stock_id}")
def get_smart_money(stock_id: str):
    """估算主力 10 日 VWAP 成本帶，附 AI 一句話結論"""
    if not stock_id.isdigit() or len(stock_id) not in (4, 5, 6):
        raise HTTPException(status_code=400, detail="股票代號格式錯誤")
    result = get_smart_money_cost(stock_id)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"status": "success", **result}


# ── Task-021：新聞抗噪濾鏡 ───────────────────────────────────
@app.get("/api/v1/news/filter/{stock_id}")
def get_news_filter(stock_id: str):
    """Google News RSS 爬蟲 + GPT 打標籤（實質利多 / 情緒恐慌 / 出貨警戒）"""
    if not stock_id.isdigit() or len(stock_id) not in (4, 5, 6):
        raise HTTPException(status_code=400, detail="股票代號格式錯誤")
    return {"status": "success", **get_filtered_news(stock_id)}


# ── Sprint：單筆 AI 評語 ─────────────────────────────────────
class EntryFeedbackRequest(BaseModel):
    stock_symbol: str
    action:       str
    note:         str

@app.post("/api/v1/journal/entry-feedback")
def get_entry_feedback(req: EntryFeedbackRequest):
    """針對單筆手札，用 GPT 生成直白評語"""
    prompt = (
        f"你是直言不諱的台股交易教練。\n"
        f"用戶記錄了以下交易：\n"
        f"- 股票：{req.stock_symbol}\n"
        f"- 動作：{req.action}\n"
        f"- 筆記：{req.note}\n\n"
        f"請用 50 字以內的繁體中文給出有建設性的評語（可以毒舌但要有邏輯）。"
        f"直接切入重點，不需要客套。"
    )
    if not _openai:
        return {"feedback": f"（AI 未連線）{req.action} {req.stock_symbol}，筆記已記錄。"}
    try:
        result = _openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        return {"feedback": result.choices[0].message.content.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失敗: {e}")


# ── Sprint：職人沉澱報告 ──────────────────────────────────────
class InsightsRequest(BaseModel):
    tag_counts:  dict
    entry_count: int

@app.post("/api/v1/journal/insights")
def get_journal_insights(req: InsightsRequest):
    """根據歷史標籤統計，生成週期性 AI 操作模式報告"""
    if not req.tag_counts:
        return {"insights": "尚無足夠標籤資料，繼續記錄幾筆後再試。"}
    tag_str = "、".join(f"{k}（{v}次）" for k, v in sorted(req.tag_counts.items(), key=lambda x: -x[1]))
    prompt = (
        f"根據用戶的投資日記，標籤統計如下：{tag_str}。"
        f"共 {req.entry_count} 筆記錄。\n\n"
        f"請用 100 字以內繁體中文，"
        f"指出用戶的主要操作習慣模式與一個最需要改善的地方。"
        f"語氣像職人師傅教徒弟：犀利但有溫度。直接開始分析，不需要開場白。"
    )
    if not _openai:
        return {"insights": f"（AI 未連線）共記錄 {req.entry_count} 筆，標籤：{tag_str}。"}
    try:
        result = _openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        return {"insights": result.choices[0].message.content.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失敗: {e}")


# ── Task-022：AI 交易覆盤 ────────────────────────────────────
class TradeReviewRequest(BaseModel):
    stock_id:   str
    buy_date:   str
    sell_date:  Optional[str]   = None
    buy_price:  float
    sell_price: Optional[float] = None
    pnl_pct:    Optional[float] = None
    notes:      Optional[str]   = None

@app.post("/api/v1/journal/review")
def generate_trade_review(req: TradeReviewRequest):
    """根據進出場時的景氣燈號，生成 AI 交易覆盤報告"""
    macro_df = fetch_ndc_business_cycle_indicators()

    def macro_at(date_str: Optional[str]):
        if not date_str or macro_df is None or macro_df.empty:
            return None, None
        month = date_str[:7]
        row   = macro_df[macro_df["Date"] == month]
        if not row.empty:
            return int(row.iloc[0]["Signal_Score"]), row.iloc[0]["Signal_Color"]
        return None, None

    buy_score,  buy_color  = macro_at(req.buy_date)
    sell_score, sell_color = macro_at(req.sell_date)

    buy_macro_str  = f"{buy_score}分（{buy_color}）"  if buy_score  else "資料不足"
    sell_macro_str = f"{sell_score}分（{sell_color}）" if sell_score else "持有中"

    prompt = (
        f"你是直言不諱的台股交易教練，幫助散戶學習。\n\n"
        f"交易紀錄：\n"
        f"- 股票代號：{req.stock_id}\n"
        f"- 買入：{req.buy_date} @ {req.buy_price} 元，進場景氣燈號：{buy_macro_str}\n"
        f"- 賣出：{req.sell_date or '持有中'} @ {req.sell_price or '未賣'} 元，出場景氣燈號：{sell_macro_str}\n"
        f"- 損益：{req.pnl_pct}%\n"
        f"{f'- 備注：{req.notes}' if req.notes else ''}\n\n"
        f"請用 100 字以內的繁體中文，客觀點出這筆交易的操作優劣，可以直白批評，不需要客套。"
        f"開頭直接切入重點。"
    )

    if not _openai:
        return {"review": f"（AI 未連線）進場景氣：{buy_macro_str}，出場景氣：{sell_macro_str}，損益 {req.pnl_pct}%。"}

    try:
        result = _openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        return {"review": result.choices[0].message.content.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失敗: {e}")


# ── 回測 ─────────────────────────────────────────────────────
@app.post("/api/v1/backtest")
def backtest(
    entry_score: int   = Query(16),
    exit_score:  int   = Query(38),
    capital:     float = Query(1_000_000),
):
    if entry_score >= exit_score:
        raise HTTPException(status_code=400, detail="進場閾值必須小於出場閾值")
    result = run_backtest(entry_score=entry_score, exit_score=exit_score, capital=capital)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"status": "success", **result}


# ── LINE Webhook ─────────────────────────────────────────────
@app.post("/webhook/line", include_in_schema=False)
async def line_webhook(request: Request):
    body      = await request.body()
    signature = request.headers.get("X-Line-Signature", "")
    try:
        handle_webhook(body.decode("utf-8"), signature)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return "OK"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
