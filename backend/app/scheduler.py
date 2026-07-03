"""
APScheduler：每日台股盤後（16:00 Asia/Taipei）自動執行 AI 情緒分析並廣播至 LINE
"""
import os, sys

_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_app_dir      = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(_project_root, "data-pipeline", "scrapers"))
sys.path.append(_app_dir)

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from sentiment_analyzer import analyze_ptt_sentiment
from line_bot import broadcast_text


def run_daily_push():
    """每日盤後推播：AI 摘要 → LINE Broadcast（同步函式，由 AsyncIOScheduler 丟入執行緒池）"""
    print("[Scheduler] 啟動每日盤後推播...")
    try:
        result = analyze_ptt_sentiment()
        if not result:
            print("[Scheduler] 情緒分析失敗，取消本次推播")
            return
        text = (
            f"📊 AlphaVision 盤後快報\n"
            f"市場情緒：{result.get('sentiment_label', 'N/A')} "
            f"（{result.get('fear_greed_score', 'N/A')}分）\n\n"
            f"{result.get('summary', '')}\n\n"
            f"💡 {result.get('eli5_advice', '')}"
        )
        success = broadcast_text(text)
        print(f"[Scheduler] 推播{'成功' if success else '失敗（token 未設定）'}")
    except Exception as e:
        print(f"[Scheduler] 推播異常: {e}")


def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="Asia/Taipei")
    scheduler.add_job(
        run_daily_push,
        CronTrigger(hour=16, minute=0, timezone="Asia/Taipei"),
        id="daily_line_push",
        name="每日台股盤後 LINE 推播",
        replace_existing=True,
    )
    return scheduler
