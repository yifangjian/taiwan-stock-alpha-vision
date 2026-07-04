"""
Fetch Taiwan stock market news from Google News RSS.
Used by morning_brief and news_interpret endpoints.
"""

import xml.etree.ElementTree as ET
import requests

_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; AlphaVision/1.0)"}
_TIMEOUT = 10

_MARKET_FEEDS = [
    "https://news.google.com/rss/search?q=台股+股市&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
    "https://news.google.com/rss/search?q=台灣+股票+上市&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
]

STOCK_NAMES = {
    "2330": "台積電", "2317": "鴻海",  "2454": "聯發科", "2308": "台達電",
    "2382": "廣達",   "3711": "日月光", "2303": "聯電",   "6669": "緯穎",
    "2379": "瑞昱",   "3034": "聯詠",  "2395": "研華",   "6770": "力積電",
    "2881": "富邦金", "2882": "國泰金","2884": "玉山金", "2885": "元大金",
    "2886": "兆豐金", "2887": "台新金","2891": "中信金", "2892": "第一金",
    "5880": "合庫金", "1216": "統一",  "2912": "統一超", "1301": "台塑",
    "2002": "中鋼",   "2207": "和泰車","6505": "台塑化", "2344": "華邦電",
    "3008": "大立光", "5871": "中租",
}


def fetch_market_news(max_items: int = 15) -> list[dict]:
    """Pull recent Taiwan stock market news from RSS; deduplicate by title."""
    articles: list[dict] = []
    for url in _MARKET_FEEDS:
        try:
            resp = requests.get(url, timeout=_TIMEOUT, headers=_HEADERS)
            root = ET.fromstring(resp.text)
            for item in root.findall(".//item"):
                articles.append({
                    "title": item.findtext("title", "").strip(),
                    "date":  item.findtext("pubDate", ""),
                    "link":  item.findtext("link", ""),
                })
        except Exception:
            continue

    seen: set[str] = set()
    unique: list[dict] = []
    for a in articles:
        if a["title"] and a["title"] not in seen:
            seen.add(a["title"])
            unique.append(a)

    return unique[:max_items]


def fetch_stock_news(stock_id: str, max_items: int = 8) -> list[dict]:
    """Pull news for a specific stock by its Chinese name."""
    name = STOCK_NAMES.get(stock_id, stock_id)
    url  = (
        f"https://news.google.com/rss/search"
        f"?q={name}+股票&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
    )
    try:
        resp = requests.get(url, timeout=_TIMEOUT, headers=_HEADERS)
        root = ET.fromstring(resp.text)
        return [
            {
                "title": item.findtext("title", "").strip(),
                "date":  item.findtext("pubDate", ""),
            }
            for item in root.findall(".//item")[:max_items]
        ]
    except Exception:
        return []
