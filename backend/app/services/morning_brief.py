"""
Generate a personalized 200-word morning brief for the user
by combining today's market headlines with their portfolio.
"""

from datetime import datetime

from .news_fetcher   import fetch_market_news
from .user_profile   import build_system_prompt

# In-memory daily cache: key = (date, sorted portfolio tuple)
_cache: dict[str, dict] = {}


def get_morning_brief(
    portfolio: list[str],
    profile:   dict,
    openai_client,
) -> dict:
    today     = datetime.now().strftime("%Y-%m-%d")
    cache_key = today + str(tuple(sorted(portfolio)))

    if cache_key in _cache:
        return _cache[cache_key]

    news  = fetch_market_news(max_items=12)
    headlines = "\n".join(f"• {n['title']}" for n in news[:10])

    portfolio_str = "、".join(portfolio) if portfolio else "尚未設定持股"
    system_prompt = build_system_prompt(profile, portfolio)

    user_msg = (
        f"今日市場重要新聞（請根據這些資訊製作早報）：\n{headlines}\n\n"
        f"用戶持股：{portfolio_str}\n\n"
        f"請生成 200-250 字的個人化早報，結構如下：\n"
        f"1. 市場整體氛圍（1-2 句）\n"
        f"2. 與持股最相關的新聞解讀（1-2 則）\n"
        f"3. 今日操作建議（1 句）\n\n"
        f"直接開始內容，不要加標題或開場白。"
    )

    if openai_client is None:
        brief = f"（AI 未連線）今日台股重點：{headlines[:120]}⋯"
    else:
        try:
            resp  = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_msg},
                ],
                max_tokens=400,
            )
            brief = resp.choices[0].message.content.strip()
        except Exception as e:
            brief = f"（早報生成失敗：{e}）"

    result = {
        "brief":      brief,
        "news_used":  [n["title"] for n in news[:5]],
        "date":       today,
        "portfolio":  portfolio,
    }
    _cache[cache_key] = result
    return result
