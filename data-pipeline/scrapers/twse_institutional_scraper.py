import pandas as pd
import requests
from datetime import datetime


def fetch_twse_institutional(date_str=None):
    """
    從台灣證交所抓取「三大法人買賣超日報」
    :param date_str: 日期字串，格式為 'YYYYMMDD'。若未提供則預設抓取當日。
    """
    if date_str is None:
        date_str = datetime.now().strftime("%Y%m%d")

    url = f"https://www.twse.com.tw/rwd/zh/fund/BFI82U?date={date_str}&response=json"

    try:
        print(f"正在請求證交所 API ({date_str})...")
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        data = response.json()

        if data.get("stat") != "OK":
            print(f"⚠️ 無法取得資料，原因: {data.get('stat')}")
            return None

        df = pd.DataFrame(data["data"], columns=data["fields"])

        numeric_cols = ["買進金額", "賣出金額", "買賣差額"]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace(",", "").astype(float)

        print(f"✅ {date_str} 三大法人買賣超抓取成功！")
        return df

    except Exception as e:
        print(f"❌ 抓取失敗: {e}")
        return None


if __name__ == "__main__":
    test_date = "20260703"
    result_df = fetch_twse_institutional(test_date)

    if result_df is not None:
        print("\n--- 三大法人買賣超彙總 ---")
        print(result_df.to_string(index=False))
