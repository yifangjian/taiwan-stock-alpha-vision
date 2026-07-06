import os
import sys

# Force UTF-8 output encoding in any environment
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

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
from line_bot                import handle_webhook, generate_binding_code, push_to_line_user
from scheduler               import create_scheduler
from services.smart_money    import get_smart_money_cost
from services.ta_analysis    import compute_ta, get_candles as _get_candles
from services.morning_brief  import get_morning_brief
from services.ai_assistant   import run_assistant
from services.dividend_info  import get_dividend_calendar, get_current_prices
from services.margin_data    import get_margin_data
from services.alert_checker  import run_alert_check

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


# ── Sprint：K 線 + TA 型態 ───────────────────────────────────
@app.get("/api/v1/chart/candles/{stock_id}")
def get_chart_candles(stock_id: str, period: str = Query("3mo")):
    """K 線 OHLC 資料 + TA 型態標籤"""
    if not stock_id.isdigit() or len(stock_id) not in (4, 5, 6):
        raise HTTPException(status_code=400, detail="股票代號格式錯誤")
    candles = _get_candles(stock_id, period)
    if not candles:
        raise HTTPException(status_code=404, detail="無法取得行情資料")
    ta = compute_ta(stock_id)
    return {
        "status": "success", "stock_id": stock_id,
        "candles": candles,
        "ta_patterns": ta.get("ta_patterns", []),
        "indicators":  ta.get("indicators", {}),
    }


@app.get("/api/v1/chip/ta/{stock_id}")
def get_ta_analysis(stock_id: str):
    """個股 TA 指標 + 型態標籤"""
    if not stock_id.isdigit() or len(stock_id) not in (4, 5, 6):
        raise HTTPException(status_code=400, detail="股票代號格式錯誤")
    result = compute_ta(stock_id)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"status": "success", **result}


# ── Sprint：選股濾網 ─────────────────────────────────────────
_SCREEN_STOCKS = [
    "2330","2317","2454","2308","2382","3711","2881","2882",
    "2886","2891","2303","1301","6505","2002","2207","2912",
    "5871","2884","6669","2379","3034","2344","2395","3008",
]

class ScreenerRequest(BaseModel):
    ma_status:      str = "all"
    rsi_condition:  str = "all"
    macd_condition: str = "all"

@app.post("/api/v1/screener")
def run_screener(req: ScreenerRequest):
    """複合 TA 條件選股（多執行緒平行處理）"""
    from concurrent.futures import ThreadPoolExecutor

    def _check(sid: str):
        try:
            ta  = compute_ta(sid)
            if "error" in ta:
                return None
            ind = ta["indicators"]

            if req.ma_status == "above_ma5"         and not ind.get("above_ma5"):   return None
            if req.ma_status == "above_ma20"         and not ind.get("above_ma20"):  return None
            if req.ma_status == "above_ma60"         and not ind.get("above_ma60"):  return None
            if req.ma_status == "bullish_alignment"  and not ind.get("bullish_alignment"): return None

            if req.rsi_condition == "oversold"   and (ind.get("rsi") or 50) >= 30: return None
            if req.rsi_condition == "overbought" and (ind.get("rsi") or 50) <= 70: return None

            if req.macd_condition == "bullish":
                if (ind.get("macd") or 0) <= (ind.get("macd_signal") or 0): return None
            if req.macd_condition == "golden_cross":
                if not any(p["label"] == "MACD 黃金交叉" for p in ta.get("ta_patterns", [])): return None

            return ta
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=6) as pool:
        raw = list(pool.map(_check, _SCREEN_STOCKS))

    valid = [r for r in raw if r is not None]
    return {"status": "success", "results": valid, "count": len(valid), "screened": len(_SCREEN_STOCKS)}


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


# ── 零股懶人選股器 ───────────────────────────────────────────
class LazyPickerRequest(BaseModel):
    budget:    float = 5000
    risk_pref: str   = "平衡型"

@app.post("/api/v1/lazy-picker")
def lazy_picker_endpoint(req: LazyPickerRequest):
    """根據預算 + 風險偏好，AI 篩選零股標的附職人觀點"""
    from services.lazy_picker import run_lazy_picker
    if req.budget < 100:
        raise HTTPException(status_code=400, detail="預算至少 100 元")
    picks = run_lazy_picker(req.budget, req.risk_pref)
    if not picks:
        raise HTTPException(status_code=404, detail="目前市況無符合篩選條件的標的，建議稍後再試或放寬預算")
    return {"status": "success", "budget": req.budget, "risk_pref": req.risk_pref, "picks": picks}


# ── 個人化早報 ───────────────────────────────────────────────
class MorningBriefRequest(BaseModel):
    portfolio: list[str] = []
    profile:   dict      = {}

@app.post("/api/v1/morning-brief")
def morning_brief_endpoint(req: MorningBriefRequest):
    """根據持股 + 用戶偏好，生成當日個人化早報（每日快取）"""
    result = get_morning_brief(req.portfolio, req.profile, _openai)
    return {"status": "success", **result}


# ── 白話新聞解讀 ─────────────────────────────────────────────
class NewsInterpretRequest(BaseModel):
    title:     str
    content:   str       = ""
    profile:   dict      = {}
    portfolio: list[str] = []

@app.post("/api/v1/news/interpret")
def news_interpret_endpoint(req: NewsInterpretRequest):
    """用白話解讀一則財經新聞，並分析對用戶持股的影響"""
    from services.user_profile import build_system_prompt
    if not _openai:
        raise HTTPException(status_code=503, detail="AI 未連線")

    system_prompt = build_system_prompt(req.profile, req.portfolio)
    portfolio_str = "、".join(req.portfolio) if req.portfolio else "尚未設定持股"
    article_body  = req.content[:800] if req.content else "（無內文，請根據標題解讀）"

    user_msg = (
        f"新聞標題：{req.title}\n"
        f"新聞內文摘要：{article_body}\n\n"
        f"請做兩件事：\n"
        f"1. 用 60 字以內的白話文解釋這則新聞在說什麼（去掉所有術語）\n"
        f"2. 用 60 字以內說明這則新聞對用戶持股（{portfolio_str}）的可能影響（若無關則說明）\n\n"
        f"格式：白話解讀：xxx\n持股影響：xxx"
    )
    try:
        resp = _openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_msg},
            ],
            max_tokens=300,
        )
        raw   = resp.choices[0].message.content.strip()
        lines = raw.split("\n")
        plain = next((l.replace("白話解讀：","").strip() for l in lines if "白話解讀" in l), raw)
        impact= next((l.replace("持股影響：","").strip() for l in lines if "持股影響" in l), "")
        return {"status": "success", "plain_text": plain, "portfolio_impact": impact}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解讀失敗: {e}")


# ── AI 選股助手（Function Calling）────────────────────────────
class AssistantRequest(BaseModel):
    messages:  list[dict] = []
    profile:   dict       = {}
    portfolio: list[str]  = []

@app.post("/api/v1/assistant/chat")
def assistant_chat_endpoint(req: AssistantRequest):
    """互動式 AI 選股助手，支援 function calling 查詢股票資料"""
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages 不可為空")
    result = run_assistant(req.messages, req.profile, req.portfolio, _openai)
    return {"status": "success", **result}


# ── 持倉現價查詢 ─────────────────────────────────────────────
@app.get("/api/v1/portfolio/prices")
def portfolio_prices(stocks: str = Query(..., description="逗號分隔代號，例如 2330,2881")):
    """批次查詢持股現價，用於持倉損益計算"""
    ids = [s.strip() for s in stocks.split(",") if s.strip().isdigit()]
    if not ids:
        raise HTTPException(status_code=400, detail="stocks 參數不合法")
    return {"status": "success", "prices": get_current_prices(ids)}


# ── 配息月曆 ─────────────────────────────────────────────────
@app.get("/api/v1/portfolio/dividends")
def portfolio_dividends(stocks: str = Query(..., description="逗號分隔代號")):
    """查詢持股配息資訊（殖利率、最近除息日、除息月份）"""
    ids = [s.strip() for s in stocks.split(",") if s.strip().isdigit()]
    if not ids:
        raise HTTPException(status_code=400, detail="stocks 參數不合法")
    return {"status": "success", "data": get_dividend_calendar(ids)}


# ── 融資券資訊 ────────────────────────────────────────────────
@app.get("/api/v1/chip/margin/{stock_id}")
def get_margin(stock_id: str):
    """TWSE 融資券餘額、券資比"""
    if not stock_id.isdigit() or len(stock_id) not in (4, 5, 6):
        raise HTTPException(status_code=400, detail="股票代號格式錯誤")
    result = get_margin_data(stock_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return {"status": "success", **result}


# ── 條件型推播檢查 ────────────────────────────────────────────
class AlertCheckRequest(BaseModel):
    conditions:   list[dict] = []
    line_user_id: Optional[str] = None

@app.post("/api/v1/alerts/check")
def alert_check(req: AlertCheckRequest):
    """立即檢查條件清單，觸發時個人化推播給指定 LINE 用戶"""
    if not req.conditions:
        return {"status": "success", "triggered": []}

    def _push(msg: str):
        if req.line_user_id:
            push_to_line_user(req.line_user_id, msg)
        else:
            from line_bot import broadcast_text
            broadcast_text(msg)

    triggered = run_alert_check(req.conditions, _openai, _push)
    return {"status": "success", "triggered": triggered, "count": len(triggered)}


# ── LINE 帳號綁定碼 ───────────────────────────────────────────
class LineBindRequest(BaseModel):
    user_id: str

@app.post("/api/v1/line/generate-code")
def line_generate_code(req: LineBindRequest):
    """為已登入的 Supabase user 產生 6 碼 LINE 綁定驗證碼（5 分鐘有效）"""
    if not req.user_id:
        raise HTTPException(status_code=400, detail="user_id 不可為空")
    code = generate_binding_code(req.user_id)
    return {"status": "success", "code": code, "expires_in": 300}


# ── 即時報價 + 五檔（TWSE MIS，免費）───────────────────────────
@app.get("/api/v1/stock/realtime/{stock_id}")
def get_realtime(stock_id: str):
    """TWSE MIS 即時成交價 + 委買委賣五檔。盤中每 ~5 秒更新，完全免費。"""
    from services.finmind_service import get_realtime_twse
    return get_realtime_twse(stock_id)


# ── 基本面：EPS / 月營收 / 股利（FinMind）──────────────────────
@app.get("/api/v1/stock/fundamentals/{stock_id}")
def get_stock_fundamentals(stock_id: str):
    """FinMind API：財務三率、EPS、月營收、股利歷史（3 年）"""
    from services.finmind_service import get_fundamentals
    result = get_fundamentals(stock_id)
    return {"status": "success", **result}


# ── 三大法人買賣超 + 週轉率（FinMind + yfinance）───────────────
@app.get("/api/v1/stock/flow/{stock_id}")
def get_institutional_flow(stock_id: str):
    """外資 / 投信 / 自營商日買賣超（60天）+ 週轉率（60天）"""
    from services.finmind_service import get_institutional
    result = get_institutional(stock_id)
    return {"status": "success", **result}


@app.get("/api/v1/debug/inst-names/{stock_id}")
def debug_inst_names(stock_id: str):
    """Debug: 查看 FinMind 三大法人完整欄位與樣本"""
    from services.finmind_service import _fm_get
    from datetime import datetime, timedelta
    start = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
    raw   = _fm_get("TaiwanStockInstitutionalInvestorsBuySell", stock_id, start)
    return {
        "count":  len(raw),
        "fields": list(raw[0].keys()) if raw else [],
        "sample": raw[:3] if raw else [],
    }


@app.get("/api/v1/debug/margin-fields/{stock_id}")
def debug_margin_fields(stock_id: str):
    """Debug: 查看 FinMind 融資融券資料的原始欄位名稱及樣本"""
    from services.finmind_service import _fm_get
    from datetime import datetime, timedelta
    start = (datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d")
    raw   = _fm_get("TaiwanStockMarginPurchaseShortSale", stock_id, start)
    return {
        "count":  len(raw),
        "fields": list(raw[0].keys()) if raw else [],
        "sample": raw[0] if raw else {},
    }


@app.get("/api/v1/debug/dividend-fields/{stock_id}")
def debug_dividend_fields(stock_id: str):
    """Debug: 查看 FinMind 股利資料原始欄位及樣本"""
    from services.finmind_service import _fm_get
    from datetime import datetime, timedelta
    start = (datetime.now() - timedelta(days=365 * 5)).strftime("%Y-%m-%d")
    raw   = _fm_get("TaiwanStockDividend", stock_id, start)
    return {
        "count":  len(raw),
        "fields": list(raw[0].keys()) if raw else [],
        "sample": raw[:2] if raw else [],
    }


@app.get("/api/v1/debug/fin-types/{stock_id}")
def debug_fin_types(stock_id: str):
    """Debug: 查看 FinMind 財務報表的 type 欄位所有值"""
    from services.finmind_service import _fm_get
    from datetime import datetime, timedelta
    start = (datetime.now() - timedelta(days=365 * 2)).strftime("%Y-%m-%d")
    raw   = _fm_get("TaiwanStockFinancialStatements", stock_id, start)
    types = sorted({r.get("type", "") for r in raw})
    return {"count": len(raw), "types": types, "sample": raw[:2] if raw else []}


# ── 融資融券歷史（FinMind）───────────────────────────────────
@app.get("/api/v1/stock/margin-history/{stock_id}")
def get_margin_history_data(stock_id: str):
    """融資餘額 / 融券餘額 60天歷史走勢"""
    from services.finmind_service import get_margin_history
    result = get_margin_history(stock_id)
    return {"status": "success", **result}


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
        handle_webhook(body.decode("utf-8"), signature, openai_client=_openai)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return "OK"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
