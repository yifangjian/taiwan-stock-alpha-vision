import io
import zipfile
from typing import Optional

import pandas as pd
import requests

NDC_ZIP_URL = (
    "https://ws.ndc.gov.tw/Download.ashx?"
    "u=LzAwMS9hZG1pbmlzdHJhdG9yLzEwL3JlbGZpbGUvNTc4MS82MzkyL2VhMjM1YmQ5LWQwNTItNGE2OS1hYmZjLWQ1Yzc4NWQzZDBlMi56aXA%3d"
    "&n=5pmv5rCj5oyH5qiZ5Y%2bK54eI6JmfLnppcA%3d%3d"
    "&icon=.zip"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9",
}

SIGNAL_LABEL = {
    "紅":  "紅燈 (過熱)",
    "黃紅": "黃紅燈",
    "綠":  "綠燈 (穩定)",
    "黃藍": "黃藍燈",
    "藍":  "藍燈 (低迷)",
}


def fetch_ndc_business_cycle_indicators(url: str = NDC_ZIP_URL) -> Optional[pd.DataFrame]:
    """
    從國發會開放資料下載景氣指標 ZIP，解析「景氣指標與燈號.csv」。
    回傳欄位：Date (YYYY-MM)、Signal_Score (int)、Signal_Color (str)
    """
    try:
        print("正在下載國發會景氣燈號資料...")
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()

        # 在記憶體中解開 ZIP，不需要寫入磁碟
        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            def _fname(info) -> str:
                # ZIP UTF-8 flag (bit 11): filename is already Unicode
                if info.flag_bits & 0x800:
                    return info.filename
                # Legacy: cp437 → big5 (old Taiwan gov files)
                try:
                    return info.filename.encode("cp437").decode("big5")
                except (UnicodeEncodeError, UnicodeDecodeError):
                    return info.filename

            target = next(
                info for info in zf.infolist()
                if "景氣指標與燈號" in _fname(info)
                and not info.filename.startswith("schema")
            )
            raw = zf.read(target.filename)

        df = pd.read_csv(io.StringIO(raw.decode("utf-8-sig")))

        # 欄位：第 0 欄=年月、第 7 欄=綜合分數、第 8 欄=燈號
        df = df.iloc[:, [0, 7, 8]].copy()
        df.columns = ["Date", "Signal_Score", "Signal_Raw"]

        # 移除尚未有分數的早期歷史資料（值為 "-"）
        df = df[df["Signal_Score"] != "-"].copy()
        df["Signal_Score"] = pd.to_numeric(df["Signal_Score"], errors="coerce")
        df = df.dropna(subset=["Signal_Score"])
        df["Signal_Score"] = df["Signal_Score"].astype(int)

        df["Signal_Color"] = df["Signal_Raw"].map(SIGNAL_LABEL).fillna(df["Signal_Raw"])
        df = df.drop(columns=["Signal_Raw"])

        df["Date"] = pd.to_datetime(
            df["Date"].astype(str).str.strip(), format="%Y%m"
        ).dt.strftime("%Y-%m")

        df = df.sort_values("Date", ascending=False).reset_index(drop=True)

        print(f"✅ 成功取得 {len(df)} 筆景氣燈號資料（最新：{df['Date'].iloc[0]}）")
        return df

    except requests.HTTPError as e:
        print(f"❌ HTTP 錯誤 {e.response.status_code}：請確認下載網址是否有效")
        return None
    except Exception as e:
        print(f"❌ 抓取失敗: {e}")
        return None


if __name__ == "__main__":
    result_df = fetch_ndc_business_cycle_indicators()
    if result_df is not None:
        print("\n--- 最新 5 個月的景氣燈號 ---")
        print(result_df.head(5).to_string(index=False))
