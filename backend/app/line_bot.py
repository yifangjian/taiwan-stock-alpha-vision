"""
LINE Messaging API
- 個人化 push（依 line_user_id）
- 綁定碼流程（6 碼驗證碼連結 Supabase user）
- LINE 對話：AI 助手 / 股票速查 / 推播觸發
"""
import os
import random
import time
from typing import Optional

import requests as _requests
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import (
    Configuration, ApiClient, MessagingApi,
    BroadcastRequest, ReplyMessageRequest, PushMessageRequest, TextMessage,
)
from linebot.v3.webhooks import FollowEvent, MessageEvent, TextMessageContent

LINE_CHANNEL_SECRET       = os.getenv("LINE_CHANNEL_SECRET", "")
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")
SUPABASE_URL              = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY      = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

_handler = WebhookHandler(LINE_CHANNEL_SECRET) if LINE_CHANNEL_SECRET else None

# 模組層級：暫存 OpenAI client（由 main.py 注入）
_openai_client = None

# 綁定碼暫存：{code: {user_id, expires_at}}
_binding_codes: dict = {}
CODE_TTL = 300  # 5 分鐘


# ── Supabase REST helpers ───────────────────────────────────────

def _sb_headers() -> dict:
    return {
        "apikey":        SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }


def _supabase_set_line_user(user_id: str, line_user_id: str) -> bool:
    """將 line_user_id 寫入 user_profiles（使用 service role 繞過 RLS）"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("[LINE] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未設定")
        return False
    try:
        url = f"{SUPABASE_URL}/rest/v1/user_profiles"
        r = _requests.patch(
            url,
            json={"line_user_id": line_user_id},
            headers=_sb_headers(),
            params={"user_id": f"eq.{user_id}"},
            timeout=10,
        )
        return r.status_code < 300
    except Exception as e:
        print(f"[LINE] 寫入 Supabase 失敗: {e}")
        return False


def _supabase_get_profile(line_user_id: str) -> Optional[dict]:
    """用 line_user_id 查詢 user_profiles"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    try:
        url = f"{SUPABASE_URL}/rest/v1/user_profiles"
        r = _requests.get(
            url,
            headers={**_sb_headers(), "Prefer": ""},
            params={"line_user_id": f"eq.{line_user_id}", "select": "*"},
            timeout=10,
        )
        data = r.json()
        return data[0] if isinstance(data, list) and data else None
    except Exception as e:
        print(f"[LINE] 查詢 Supabase 失敗: {e}")
        return None


def _supabase_check_bound(line_user_id: str) -> bool:
    """用 line_user_id 查已綁定的 user_id"""
    p = _supabase_get_profile(line_user_id)
    return bool(p and p.get("user_id"))


# ── Binding code ────────────────────────────────────────────────

def generate_binding_code(user_id: str) -> str:
    """產生 6 碼綁定驗證碼，有效期 5 分鐘"""
    now = time.time()
    # 清理過期碼
    for k in [k for k, v in _binding_codes.items() if v["expires_at"] < now]:
        del _binding_codes[k]

    # 同一個 user_id 若已有未過期的碼，直接回傳
    for code, val in _binding_codes.items():
        if val["user_id"] == user_id:
            return code

    while True:
        code = str(random.randint(100000, 999999))
        if code not in _binding_codes:
            break
    _binding_codes[code] = {"user_id": user_id, "expires_at": now + CODE_TTL}
    return code


# ── Push / broadcast ────────────────────────────────────────────

def push_to_line_user(line_user_id: str, text: str) -> bool:
    """個人化推播給特定 LINE 用戶"""
    if not LINE_CHANNEL_ACCESS_TOKEN or not line_user_id:
        return False
    try:
        with ApiClient(Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)) as client:
            MessagingApi(client).push_message(
                PushMessageRequest(to=line_user_id, messages=[TextMessage(text=text)])
            )
        return True
    except Exception as e:
        print(f"[LINE] push 失敗: {e}")
        return False


def broadcast_text(text: str) -> bool:
    """廣播給所有追蹤者（無 line_user_id 時的備用）"""
    if not LINE_CHANNEL_ACCESS_TOKEN:
        return False
    try:
        with ApiClient(Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)) as client:
            MessagingApi(client).broadcast(
                BroadcastRequest(messages=[TextMessage(text=text)])
            )
        return True
    except Exception as e:
        print(f"[LINE] broadcast 失敗: {e}")
        return False


def _reply(reply_token: str, text: str):
    if not LINE_CHANNEL_ACCESS_TOKEN:
        return
    try:
        with ApiClient(Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)) as client:
            MessagingApi(client).reply_message(
                ReplyMessageRequest(reply_token=reply_token, messages=[TextMessage(text=text)])
            )
    except Exception as e:
        print(f"[LINE] reply 失敗: {e}")


# ── Message handlers ────────────────────────────────────────────

def _handle_binding(reply_token: str, line_user_id: str, code: str):
    """嘗試用 6 碼驗證碼綁定 LINE → Supabase user"""
    entry = _binding_codes.get(code)
    if not entry or entry["expires_at"] < time.time():
        _reply(reply_token, "❌ 驗證碼無效或已過期（5 分鐘有效），請在網站重新產生。")
        return

    user_id = entry["user_id"]
    ok = _supabase_set_line_user(user_id, line_user_id)
    del _binding_codes[code]

    if ok:
        _reply(
            reply_token,
            "✅ LINE 帳號綁定成功！\n\n"
            "現在你可以：\n"
            "• 傳股票代號（如 2330）→ 個股速查\n"
            "• 直接提問 → AI 選股助手\n"
            "• 條件觸發時自動推播給你\n\n"
            "試試傳 2330 看看！"
        )
    else:
        _reply(reply_token, "❌ 綁定寫入失敗，請確認伺服器環境變數設定正確。")


def _handle_stock_query(reply_token: str, stock_id: str):
    """傳 4 碼數字 → 個股速查"""
    try:
        import sys, os
        sys.path.append(os.path.join(os.path.dirname(__file__), "../../data-pipeline/scrapers"))
        from stock_health_scraper import get_stock_health
        h = get_stock_health(stock_id)
        msg = (
            f"📊 {stock_id} 個股速查\n"
            f"{'─' * 18}\n"
            f"外資動向：{h.get('foreign_status', '—')}\n"
            f"均線位置：{h.get('price_status', '—')}\n"
            f"綜合結論：{h.get('conclusion', '—')}\n"
            f"{'─' * 18}\n"
            f"{h.get('conclusion_detail', '')}"
        )
    except Exception as e:
        msg = f"❌ 查詢 {stock_id} 失敗：{e}"
    _reply(reply_token, msg)


def _handle_ai_chat(reply_token: str, line_user_id: str, text: str):
    """一般對話 → 呼叫 AI 助手（帶個人化 profile）"""
    if not _openai_client:
        _reply(reply_token, "❌ AI 服務目前無法使用，請稍後再試。")
        return

    profile   = {}
    portfolio = []
    try:
        p = _supabase_get_profile(line_user_id)
        if p:
            profile = {
                "risk_tolerance":  p.get("risk_tolerance",  "穩健"),
                "knowledge_level": p.get("knowledge_level", "新手"),
                "industries":      p.get("industries",       []),
            }
    except Exception:
        pass

    try:
        from services.ai_assistant import run_assistant
        result   = run_assistant(
            [{"role": "user", "content": text}],
            profile, portfolio, _openai_client
        )
        reply_text = result.get("reply", "抱歉，無法處理你的問題。")
        if len(reply_text) > 950:
            reply_text = reply_text[:950] + "⋯\n（更多內容請到網站查看）"
        _reply(reply_token, reply_text)
    except Exception as e:
        _reply(reply_token, f"❌ 處理失敗：{e}")


# ── Webhook entry ────────────────────────────────────────────────

def handle_webhook(body_str: str, signature: str, openai_client=None):
    global _openai_client
    if openai_client is not None:
        _openai_client = openai_client
    if not _handler:
        raise RuntimeError("LINE_CHANNEL_SECRET 未設定，Webhook 功能停用")
    try:
        _handler.handle(body_str, signature)
    except InvalidSignatureError:
        raise ValueError("LINE 簽章驗證失敗")


# ── Event handlers ───────────────────────────────────────────────

if _handler:
    @_handler.add(FollowEvent)
    def _on_follow(event):
        line_user_id = event.source.user_id
        already_bound = _supabase_check_bound(line_user_id)
        if already_bound:
            _reply(event.reply_token, "👋 歡迎回來！你的帳號已綁定，可以直接傳股票代號或問 AI 助手。")
        else:
            _reply(
                event.reply_token,
                "🎉 歡迎加入 AlphaVision！\n\n"
                "請先完成帳號綁定：\n"
                "1. 到網站 → 個人偏好設定 → LINE 綁定\n"
                "2. 點「產生驗證碼」\n"
                "3. 把 6 位數驗證碼傳給我\n\n"
                "綁定後可直接傳股票代號或問 AI 選股助手 📊",
            )

    @_handler.add(MessageEvent, message=TextMessageContent)
    def _on_message(event):
        text         = event.message.text.strip()
        line_user_id = event.source.user_id
        reply_token  = event.reply_token

        # 6 碼綁定驗證碼
        if text.isdigit() and len(text) == 6:
            _handle_binding(reply_token, line_user_id, text)
            return

        # 4 碼股票代號速查
        if text.isdigit() and len(text) == 4:
            _handle_stock_query(reply_token, text)
            return

        # 一般對話 → AI 助手
        _handle_ai_chat(reply_token, line_user_id, text)
