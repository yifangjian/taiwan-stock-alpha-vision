import requests
from bs4 import BeautifulSoup
import pandas as pd


def fetch_ptt_stock_titles():
    """
    抓取 PTT 股板最新文章標題與推文數
    """
    url = "https://www.ptt.cc/bbs/Stock/index.html"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        "Referer": "https://www.ptt.cc/bbs/Stock/index.html",
    }

    try:
        print("正在潛入 PTT 股板抓取最新討論...")
        # 使用 Session 讓 cookie 自動保留，模擬真實瀏覽器行為
        session = requests.Session()
        session.cookies.set("over18", "1", domain="www.ptt.cc")
        response = session.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        articles = soup.find_all("div", class_="r-ent")

        data_list = []
        for article in articles:
            title_element = article.find("div", class_="title").find("a")

            if title_element:
                title = title_element.text.strip()
                link = "https://www.ptt.cc" + title_element["href"]

                push_element = article.find("div", class_="nrec").find("span")
                push_count = push_element.text if push_element else "0"

                if "[公告]" not in title:
                    data_list.append({
                        "Title": title,
                        "Push_Count": push_count,
                        "Link": link,
                    })

        df = pd.DataFrame(data_list)
        print("✅ PTT 股板最新文章抓取成功！")
        return df

    except Exception as e:
        print(f"❌ 抓取失敗: {e}")
        return None


if __name__ == "__main__":
    result_df = fetch_ptt_stock_titles()
    if result_df is not None and not result_df.empty:
        print("\n--- PTT 股板最新熱門討論 ---")
        print(result_df.to_string(index=False))
