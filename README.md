# AlphaVision Taiwan

**為台股散戶打造的機構級決策平台**

整合國發會景氣燈號、三大法人籌碼、AI 技術分析、個股新聞抗噪與投資手札，以職人美學呈現，讓散戶也能做出有依據的買賣決策。

🔗 **Live Demo:** https://taiwan-stock-alpha-vision.vercel.app/

---

## 功能模組

### 💰 零股懶人選股器（新）
- 輸入可動用資金（預設 5,000 元）與偏好風險屬性（保守配息 / 平衡型 / 成長趨勢）
- 自動篩選「籌碼集中 + 站上 60 日均線多頭格局」的台股標的
- GPT-4o-mini 生成「投資職人觀點」與「資金配置建議」（買幾股、花多少、剩多少預備金）
- Framer Motion 呼吸感動畫結果卡片（錯開 shadow pulse）

### 📊 戰情中心
- 國發會景氣對策信號面積圖（即時燈號）
- 三大法人日買賣超長條圖
- PTT 散戶恐慌貪婪指數 + AI 大盤摘要
- 智慧倉位計算機（根據總資金與風險比計算買入股數）
- 景氣對策信號回測（藍燈買 / 紅燈賣策略模擬）

### 🔍 個股 X 光機
- 職人 K 線畫布（TradingView Lightweight Charts v4，燕麥白背景 + 陶土紅陽線）
- 5MA / 20MA / 60MA 可切換疊加，大地色系線條
- AI 技術型態標籤（均線多頭排列、MACD 黃金交叉、RSI 超賣等）
- 主力成本帶估算（10 日 VWAP，附 AI 一句話結論）
- Google News RSS 新聞抓取 + GPT 三分類濾鏡（實質利多 / 情緒恐慌 / 出貨警戒）
- 集保股權分散比例（大戶 vs 散戶持股）
- 自選股清單（Supabase 儲存，登入後啟用）

### 🔎 選股濾網
- 複合 TA 條件：均線狀態（5/20/60MA）× RSI 條件 × MACD 條件
- ThreadPoolExecutor 平行分析 24 支熱門台股，約 15–30 秒
- Staggered Fade-in 動畫結果卡片

### 📓 投資手札
- 時光軸 UI，記錄買入 / 賣出 / 觀察三種動作
- 預設 + 自訂標籤（追高、停損失敗、紀律執行⋯）
- GPT-4o-mini 每筆 50 字 AI 毒舌評語
- 職人沉澱報告（≥3 筆解鎖，根據標籤分佈分析操作模式）
- Row Level Security（資料隔離，僅本人可見）

---

## 技術架構

```
taiwan-stock-alpha-vision/
├── backend/
│   └── app/
│       ├── main.py                   # FastAPI 主程式（14 個 API 端點）
│       └── services/
│           ├── ta_analysis.py        # 純 Pandas MACD/RSI/MA 技術分析
│           ├── smart_money.py        # 10 日 VWAP 主力成本估算
│           └── lazy_picker.py        # 零股懶人選股器邏輯
├── data-pipeline/
│   └── scrapers/
│       ├── ndc_macro_scraper.py      # 國發會景氣燈號
│       ├── twse_institutional_scraper.py  # 三大法人買賣超
│       ├── tdcc_scraper.py           # 集保股權分散
│       ├── stock_health_scraper.py   # 個股健檢
│       ├── news_scraper.py           # Google News RSS + GPT 分類
│       ├── sentiment_analyzer.py     # PTT 情緒分析
│       └── backtest_engine.py        # 景氣燈號回測
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── HomePage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── AnalysisPage.jsx
│       │   ├── ScreenerPage.jsx
│       │   ├── JournalPage.jsx
│       │   └── LazyPickerPage.jsx
│       └── components/
│           ├── ArtisanChart.jsx      # Lightweight Charts K 線組件
│           ├── JournalTimeline.jsx   # 投資手札時光軸
│           ├── Sidebar.jsx           # 漢堡側邊欄導覽
│           └── ...
└── supabase/
    └── migrations/                   # 資料庫 Schema
```

### 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | Vite + React 18, React Router v6, Framer Motion, Recharts, Lightweight Charts v4 |
| 後端 | Python 3.9, FastAPI, uvicorn, APScheduler |
| AI | OpenAI GPT-4o-mini（選股理由、新聞分類、日記評語） |
| 資料 | yfinance, BeautifulSoup, pandas（純 Python TA） |
| 資料庫 | Supabase（PostgreSQL + Auth + RLS） |
| 部署 | Vercel（前端 SPA）/ ngrok（本地後端對外隧道） |
| 字體 | Noto Serif TC（職人美學標題系統） |

---

## 本地開發

### 前置需求

- Node.js 18+
- Python 3.9+
- Supabase 帳號（或跳過 Auth 功能）
- OpenAI API Key

### 後端啟動

```bash
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env  # 填入 OPENAI_API_KEY 等
uvicorn app.main:app --reload --port 8000
```

### 前端啟動

```bash
cd frontend
npm install
cp .env.example .env.local  # 填入 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
# 開啟 http://localhost:5173
```

### 環境變數

```
# .env（後端）
OPENAI_API_KEY=sk-...

# frontend/.env.local（前端）
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://127.0.0.1:8000
```

---

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/v1/macro/signal` | 國發會景氣燈號 |
| GET | `/api/v1/chip/institutional` | 三大法人買賣超 |
| GET | `/api/v1/sentiment/ptt` | PTT 情緒分析 |
| GET | `/api/v1/chip/stock/{id}` | 個股健檢 |
| GET | `/api/v1/chip/distribution/{id}` | 集保股權分散 |
| GET | `/api/v1/chip/smart-money/{id}` | 主力成本帶估算 |
| GET | `/api/v1/chip/ta/{id}` | 技術指標 + 型態標籤 |
| GET | `/api/v1/chart/candles/{id}` | K 線 OHLC 資料 |
| GET | `/api/v1/news/filter/{id}` | 新聞 AI 濾鏡 |
| POST | `/api/v1/screener` | 複合 TA 條件選股 |
| POST | `/api/v1/lazy-picker` | 零股懶人選股器 |
| POST | `/api/v1/journal/entry-feedback` | 單筆交易 AI 評語 |
| POST | `/api/v1/journal/insights` | 職人沉澱報告 |
| POST | `/api/v1/backtest` | 景氣燈號回測 |

---

## 設計理念

- **職人美學**：燕麥白 `#F9F6F0` 基底，陶土紅 `#B85C38` 強調，Noto Serif TC 中文標題，去除過度裝飾
- **化繁為簡**：散戶不需要看懂 20 個指標，只需要知道「現在該買 / 等 / 賣」
- **資訊不對稱消除**：法人等級的籌碼數據 + AI 解讀，人人可用

---

> 本平台所有數據與 AI 分析結果**僅供參考，不構成投資建議**。投資一定有風險，請依個人財務狀況審慎評估。
