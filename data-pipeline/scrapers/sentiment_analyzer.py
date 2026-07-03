import os
import sys
from dotenv import load_dotenv
from openai import OpenAI

_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(_project_root, ".env"))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ptt_stock_scraper import fetch_ptt_stock_titles

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def analyze_ptt_sentiment():
    """
    抓取 PTT 股板標題，交給 GPT 分析散戶情緒，回傳恐慌/貪婪指數與摘要。
    """
    df = fetch_ptt_stock_titles()
    if df is None or df.empty:
        return None

    titles_text = "\n".join(
        f"- [{row['Push_Count']} 推] {row['Title']}" for _, row in df.iterrows()
    )

    prompt = f"""你是一位台股量化分析師，專門解讀 PTT 股板的散戶情緒。
以下是今天 PTT 股板最新的文章標題與推文數：

{titles_text}

請根據以上資訊，完成以下三項分析，並嚴格以 JSON 格式回傳：
1. "fear_greed_score": 給出一個 0~100 的整數分數（0=極度恐慌, 50=中立, 100=極度貪婪）
2. "sentiment_label": 對應標籤，從以下選一個：["極度恐慌", "恐慌", "中立", "貪婪", "極度貪婪"]
3. "summary": 用繁體中文寫一段 2~3 句的情緒摘要，說明你判斷的依據

只回傳 JSON，不要有其他文字。"""

    print("正在呼叫 OpenAI 進行情緒分析...")
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    import json
    result = json.loads(response.choices[0].message.content)
    result["article_count"] = len(df)
    result["titles_analyzed"] = df["Title"].tolist()
    return result


if __name__ == "__main__":
    result = analyze_ptt_sentiment()
    if result:
        print("\n--- PTT 股板散戶情緒分析 ---")
        print(f"恐慌/貪婪指數：{result['fear_greed_score']} / 100")
        print(f"情緒標籤：{result['sentiment_label']}")
        print(f"分析摘要：{result['summary']}")
        print(f"分析文章數：{result['article_count']} 篇")
