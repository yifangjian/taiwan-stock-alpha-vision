"""
LINE Messaging API：Webhook 驗證、事件處理、廣播推播
安全關鍵：body 必須在 FastAPI 層讀取一次後傳入，避免 RuntimeError (body consumed)
"""
import os

from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import (
    Configuration, ApiClient, MessagingApi,
    BroadcastRequest, ReplyMessageRequest, TextMessage,
)
from linebot.v3.webhooks import FollowEvent, MessageEvent, TextMessageContent

LINE_CHANNEL_SECRET       = os.getenv("LINE_CHANNEL_SECRET", "")
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")

_handler = WebhookHandler(LINE_CHANNEL_SECRET) if LINE_CHANNEL_SECRET else None


def _reply(reply_token: str, text: str):
    if not LINE_CHANNEL_ACCESS_TOKEN:
        return
    with ApiClient(Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)) as client:
        MessagingApi(client).reply_message(
            ReplyMessageRequest(reply_token=reply_token, messages=[TextMessage(text=text)])
        )


def broadcast_text(text: str) -> bool:
    """廣播給所有追蹤者；未設定 token 時回傳 False"""
    if not LINE_CHANNEL_ACCESS_TOKEN:
        print("[LINE] LINE_CHANNEL_ACCESS_TOKEN 未設定，跳過廣播")
        return False
    try:
        with ApiClient(Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)) as client:
            MessagingApi(client).broadcast(BroadcastRequest(messages=[TextMessage(text=text)]))
        return True
    except Exception as e:
        print(f"[LINE] 廣播失敗: {e}")
        return False


def handle_webhook(body_str: str, signature: str):
    """
    驗證 LINE 簽章並分發事件。
    body_str 必須由呼叫方 await request.body() 後傳入，不可在此再讀 request，
    否則 Starlette 會因 body 已消費而拋出 RuntimeError。
    簽章失敗時 raise ValueError。
    """
    if not _handler:
        raise RuntimeError("LINE_CHANNEL_SECRET 未設定，Webhook 功能停用")
    try:
        _handler.handle(body_str, signature)
    except InvalidSignatureError:
        raise ValueError("LINE 簽章驗證失敗")


if _handler:
    @_handler.add(FollowEvent)
    def _on_follow(event):
        _reply(
            event.reply_token,
            "🎉 歡迎加入 AlphaVision！\n"
            "每日台股盤後（16:00），我會推送 AI 情緒分析與白話操作建議 📊\n\n"
            "有任何問題歡迎留言！",
        )

    @_handler.add(MessageEvent, message=TextMessageContent)
    def _on_message(event):
        _reply(event.reply_token, "📈 盤後自動推播進行中，請等候每日 16:00 的市場報告！")
