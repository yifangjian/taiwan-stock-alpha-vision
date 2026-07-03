import requests
import pandas as pd
from datetime import datetime, timedelta

try:
    import yfinance as yf
    HAS_YFINANCE = True
except ImportError:
    HAS_YFINANCE = False

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}


def _get_price_and_ma(stock_id: str):
    """用 yfinance 取得近 30 日收盤價與 MA20（自動略過收盤 NaN）"""
    if not HAS_YFINANCE:
        return None, None, None

    for suffix in [".TW", ".TWO"]:
        try:
            hist = yf.Ticker(f"{stock_id}{suffix}").history(period="30d")
            closes = hist["Close"].dropna()
            if len(closes) >= 5:
                current = round(float(closes.iloc[-1]), 2)
                ma20 = round(float(closes.tail(20).mean()), 2)
                return current, ma20, current > ma20
        except Exception:
            continue
    return None, None, None


def _get_foreign_net(stock_id: str):
    """從 TWSE T86 取得最近交易日的外資買賣超股數"""
    for days_back in range(0, 5):
        date_str = (datetime.now() - timedelta(days=days_back)).strftime("%Y%m%d")
        try:
            url = f"https://www.twse.com.tw/rwd/zh/fund/T86?date={date_str}&selectType=ALL&response=json"
            resp = requests.get(url, headers=HEADERS, timeout=15)
            data = resp.json()
            if data.get("stat") != "OK":
                continue

            df = pd.DataFrame(data["data"], columns=data["fields"])
            # 代號欄位可能帶空白，strip 後比對
            row = df[df["證券代號"].str.strip() == stock_id]
            if row.empty:
                continue

            net_str = row.iloc[0]["外陸資買賣超股數(不含外資自營商)"]
            net = int(net_str.replace(",", "").replace("+", ""))
            return net, date_str
        except Exception:
            continue
    return None, None


def get_stock_health(stock_id: str) -> dict:
    """
    個股三燈健康檢查：
    - 外資短線態度（買超/賣超）
    - 股價位置（均線之上/下）
    - 綜合結論
    """
    result = {"stock_id": stock_id}

    # 1. 價格與均線
    current_price, ma20, above_ma20 = _get_price_and_ma(stock_id)
    if current_price is not None:
        result["current_price"] = current_price
        result["ma20"] = ma20
        result["above_ma20"] = above_ma20
        result["price_status"] = "股價在均線之上 📈" if above_ma20 else "股價在均線之下 📉"
    else:
        result["price_status"] = "無法取得價格資料"
        result["above_ma20"] = None

    # 2. 外資動向
    foreign_net, foreign_date = _get_foreign_net(stock_id)
    if foreign_net is not None:
        result["foreign_net_shares"] = foreign_net
        result["foreign_date"] = foreign_date
        if foreign_net > 0:
            result["foreign_status"] = f"外資買超 {foreign_net:,} 股 ✅"
            result["foreign_bullish"] = True
        else:
            result["foreign_status"] = f"外資賣超 {abs(foreign_net):,} 股 ❌"
            result["foreign_bullish"] = False
    else:
        result["foreign_status"] = "無外資資料（可能非上市股）"
        result["foreign_bullish"] = None

    # 3. 綜合結論
    above = result.get("above_ma20")
    bull = result.get("foreign_bullish")

    if above is True and bull is True:
        result["conclusion"] = "適合進場 🟢"
        result["conclusion_detail"] = "股價強勢且外資持續買入，短線多頭訊號明確。"
        result["signal"] = "green"
    elif above is False and bull is False:
        result["conclusion"] = "建議觀望 🔴"
        result["conclusion_detail"] = "股價弱勢且外資持續賣出，短線壓力較大。"
        result["signal"] = "red"
    else:
        result["conclusion"] = "謹慎操作 🟡"
        result["conclusion_detail"] = "多空訊號分歧，建議等待更明確方向後再進場。"
        result["signal"] = "yellow"

    return result


if __name__ == "__main__":
    test_id = "2330"
    print(f"正在檢查 {test_id}...")
    r = get_stock_health(test_id)
    print(f"現價：{r.get('current_price')} / MA20：{r.get('ma20')}")
    print(f"股價狀態：{r.get('price_status')}")
    print(f"外資：{r.get('foreign_status')}")
    print(f"結論：{r.get('conclusion')} — {r.get('conclusion_detail')}")
