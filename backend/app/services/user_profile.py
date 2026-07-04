"""
Build personalized system prompts from user profile + portfolio.
Profile is passed in from the frontend (stored in Supabase).
"""


def build_system_prompt(profile: dict, portfolio: list[str]) -> str:
    risk      = profile.get("risk_tolerance", "穩健")
    industries = profile.get("industries", [])
    knowledge  = profile.get("knowledge_level", "新手")

    portfolio_str  = "、".join(portfolio) if portfolio else "目前尚未設定持股"
    industries_str = "、".join(industries) if industries else "不限產業"

    tone = {
        "新手": "請用白話文解釋所有概念，避免使用專業術語，比喻要生活化，確保剛接觸股票的人也能理解",
        "進階": "可使用基本的技術分析術語，適度解釋較複雜的概念",
        "專業": "可直接使用技術分析與基本面術語，不需要過度解釋",
    }.get(knowledge, "請用白話文解釋")

    return f"""你是用戶的專屬台股理財顧問 AlphaVision AI。

【用戶資料】
- 風險承受度：{risk}型投資人
- 關注產業：{industries_str}
- 目前持股 / 自選股：{portfolio_str}
- 知識水平：{knowledge}投資人

【溝通準則】
- {tone}
- 語氣像職人師傅：專業、直白、有溫度，不說廢話
- 給出具體可行的建議
- 分析時優先考慮對用戶投資組合的影響
- 全程使用繁體中文"""
