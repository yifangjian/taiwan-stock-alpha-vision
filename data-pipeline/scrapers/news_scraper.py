"""
Task-021：個股新聞抗噪濾鏡
來源：Google News RSS（無需 API key，用 BeautifulSoup 解析 XML）
LLM：GPT-4o-mini 輸出 tag + summary JSON
"""
import os, sys, json, re
import requests
from bs4 import BeautifulSoup

try:
    from openai import OpenAI
    _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except Exception:
    _client = None

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
VALID_TAGS = {"實質利多", "情緒恐慌", "出貨警戒"}


def fetch_stock_news(stock_id: str, limit: int = 6) -> list:
    """從 Google News RSS 抓取個股新聞"""
    url = (
        f"https://news.google.com/rss/search"
        f"?q={stock_id}+台股&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
    )
    try:
        resp = requests.get(url, timeout=12, headers=HEADERS)
        soup = BeautifulSoup(resp.content, "html.parser")
        items = soup.find_all("item")[:limit]
        result = []
        for item in items:
            title_el = item.find("title")
            date_el  = item.find("pubdate")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            # 去除來源後綴，如「 - Yahoo 新聞」
            title = re.sub(r"\s*[-–]\s*[^\-–]+$", "", title).strip()
            date  = date_el.get_text(strip=True)[:16] if date_el else ""
            result.append({"title": title, "date": date})
        return result
    except Exception as e:
        print(f"[News] RSS 爬取失敗: {e}")
        return []


def analyze_news(stock_id: str, news_items: list) -> list:
    """用 GPT-4o-mini 為每則新聞打 tag 並生成摘要"""
    if not news_items:
        return []
    if not _client:
        return [{"title": n["title"], "date": n["date"], "tag": "未分析", "summary": n["title"][:20]} for n in news_items]

    titles = "\n".join(f"{i+1}. {n['title']}" for i, n in enumerate(news_items))
    try:
        resp = _client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content":
                f"""分析以下關於台股 {stock_id} 的新聞，輸出 JSON。
每則新聞包含：
- "tag"：必須是「實質利多」、「情緒恐慌」、「出貨警戒」其中一種
- "summary"：15字以內繁體中文一句話總結

新聞列表：
{titles}

輸出格式：{{"news":[{{"tag":"...","summary":"..."}}]}}"""
            }],
            response_format={"type": "json_object"}
        )
        analyzed = json.loads(resp.choices[0].message.content).get("news", [])
        return [
            {
                "title":   news_items[i]["title"],
                "date":    news_items[i]["date"],
                "tag":     analyzed[i].get("tag", "未分析") if i < len(analyzed) and analyzed[i].get("tag") in VALID_TAGS else "未分析",
                "summary": analyzed[i].get("summary", "") if i < len(analyzed) else "",
            }
            for i in range(len(news_items))
        ]
    except Exception as e:
        print(f"[News] LLM 分析失敗: {e}")
        return [{"title": n["title"], "date": n["date"], "tag": "未分析", "summary": ""} for n in news_items]


def get_filtered_news(stock_id: str) -> dict:
    news     = fetch_stock_news(stock_id)
    analyzed = analyze_news(stock_id, news)
    return {"stock_id": stock_id, "news": analyzed, "count": len(analyzed)}
