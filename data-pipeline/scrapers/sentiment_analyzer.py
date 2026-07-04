import json
import os
import sys
from dotenv import load_dotenv
from openai import OpenAI

_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(_project_root, ".env"))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ptt_stock_scraper import fetch_ptt_stock_titles

try:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except Exception:
    client = None


def analyze_ptt_sentiment(macro_score=None, macro_label=None, chip_net_billion=None):
    """
    抓取 PTT 股板標題，交給 GPT 分析散戶情緒。
    可選傳入景氣分數與法人淨額，讓 AI 生成白話操作建議。
    """
    df = fetch_ptt_stock_titles()
    if df is None or df.empty:
        return None

    titles_text = "\n".join(
        f"- [{row['Push_Count']} 推] {row['Title']}" for _, row in df.iterrows()
    )

    macro_context = ""
    if macro_score is not None:
        macro_context = f"\n【今日景氣燈號】分數 {macro_score} 分，{macro_label}"
    if chip_net_billion is not None:
        direction = "買超" if chip_net_billion >= 0 else "賣超"
        macro_context += f"\n【今日三大法人】合計{direction} {abs(chip_net_billion):.1f} 億元"

    prompt = f"""你是一位台股量化分析師，專門解讀 PTT 股板的散戶情緒。
以下是今天 PTT 股板最新的文章標題與推文數：

{titles_text}
{macro_context}

請根據以上資訊，完成以下四項分析，並嚴格以 JSON 格式回傳：
1. "fear_greed_score": 給出一個 0~100 的整數分數（0=極度恐慌, 50=中立, 100=極度貪婪）
2. "sentiment_label": 對應標籤，從以下選一個：["極度恐慌", "恐慌", "中立", "貪婪", "極度貪婪"]
3. "summary": 用繁體中文寫一段 2~3 句的情緒摘要，說明你判斷的依據
4. "eli5_advice": 結合今日景氣燈號與法人動向，用對待投資新手的白話口吻，寫出一段 50 字以內的今日操作建議。不可使用艱澀術語，語氣要溫暖親切。

只回傳 JSON，不要有其他文字。"""

    if client is None:
        return None

    print("正在呼叫 OpenAI 進行情緒分析...")
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    result = json.loads(response.choices[0].message.content)
    result["article_count"] = len(df)
    result["titles_analyzed"] = df["Title"].tolist()
    return result


if __name__ == "__main__":
    result = analyze_ptt_sentiment(macro_score=39, macro_label="紅燈 (過熱)", chip_net_billion=-73.5)
    if result:
        print(f"恐慌/貪婪指數：{result['fear_greed_score']} / 100")
        print(f"情緒標籤：{result['sentiment_label']}")
        print(f"AI 白話建議：{result['eli5_advice']}")
