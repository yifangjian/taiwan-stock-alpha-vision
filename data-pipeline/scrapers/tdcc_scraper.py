"""
TDCC 集保股權分散爬蟲
策略：TDCC Open API 僅提供最新週，採「累積快取」模式——
每次呼叫將最新資料寫入 .cache/tdcc_{stock_id}.json，歷史自動疊加。
"""
import json
import os
import requests

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

# 散戶 ≤10張 (≤10,000股): 級距 1-3
RETAIL_LEVELS = {"1", "2", "3"}
# 大戶 ≥1000張 (≥1,000,000股): 級距 15
WHALE_LEVELS = {"15"}

_CACHE_DIR = os.path.join(os.path.dirname(__file__), ".cache")


def _cache_path(stock_id: str) -> str:
    os.makedirs(_CACHE_DIR, exist_ok=True)
    return os.path.join(_CACHE_DIR, f"tdcc_{stock_id}.json")


def _load_cache(stock_id: str) -> list:
    path = _cache_path(stock_id)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return []


def _save_cache(stock_id: str, history: list):
    with open(_cache_path(stock_id), "w") as f:
        json.dump(history, f, ensure_ascii=False)


def _fetch_latest(stock_id: str):
    """從 TDCC Open API 抓取最新一週資料"""
    url = "https://openapi.tdcc.com.tw/v1/opendata/1-5"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        data = resp.json()
    except Exception as e:
        print(f"❌ TDCC API 請求失敗: {e}")
        return None

    rows = {r["持股分級"]: r for r in data if r.get("證券代號", "").strip() == stock_id}
    if not rows:
        return None

    # 日期欄位可能有 BOM 字元
    sample = next(iter(rows.values()))
    date_val = sample.get("資料日期") or sample.get("﻿資料日期") or sample.get("﻿資料日期", "unknown")

    whale_pct  = sum(float(rows[l]["占集保庫存數比例%"]) for l in WHALE_LEVELS  if l in rows)
    retail_pct = sum(float(rows[l]["占集保庫存數比例%"]) for l in RETAIL_LEVELS if l in rows)

    return {"date": date_val, "whale_pct": round(whale_pct, 2), "retail_pct": round(retail_pct, 2)}


def fetch_tdcc_distribution(stock_id: str, weeks: int = 4) -> list:
    """
    取得近 N 週的集保大戶/散戶持股比例。
    首次查詢只有一筆，後續每週呼叫會自動累積歷史。
    """
    history = _load_cache(stock_id)
    latest  = _fetch_latest(stock_id)

    if latest:
        # 若最新日期不在快取中才加入（避免重複）
        existing_dates = {r["date"] for r in history}
        if latest["date"] not in existing_dates:
            history.append(latest)
            _save_cache(stock_id, history)
            print(f"✅ 新增 {stock_id} {latest['date']} 集保資料到快取")
        else:
            print(f"ℹ️  {stock_id} {latest['date']} 已在快取中，無需更新")
    else:
        print(f"⚠️  無法從 TDCC 取得 {stock_id} 最新資料，使用快取")

    # 回傳最近 N 週（時間序排列）
    return sorted(history, key=lambda x: x["date"])[-weeks:]


if __name__ == "__main__":
    stock = "2330"
    print(f"抓取 {stock} 集保資料...")
    data = fetch_tdcc_distribution(stock)
    for row in data:
        print(f"  {row['date']}  大戶:{row['whale_pct']}%  散戶:{row['retail_pct']}%")
