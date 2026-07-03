# AlphaVision Taiwan（台股籌碼與宏觀決策平台）📈

AlphaVision 是一個專為台股散戶打造的綜合投資決策平台。我們致力於消除資訊不對稱，將三大法人籌碼、實時報價與國發會宏觀經濟指標整合於單一儀表板，並提供科學化的倉位管理與回測工具。

## 🌟 核心理念與功能 (Features)

- **全深度籌碼透視:** 每日自動抓取並視覺化「三大法人買賣超」與「內部人持股異動」。
- **宏觀經濟對比:** 整合「國發會景氣對策信號」，幫助投資人判斷長線台股大盤位階。
- **科學風險控管:** 內建「智慧倉位計算機」，根據總資金與可承受虧損，自動推算最佳買入股數。
- **No-Code 策略回測:** （開發中）提供無程式碼介面，讓散戶驗證「藍燈買、紅燈賣」等歷史策略績效。

## 🏗️ 系統架構與技術棧 (Tech Stack)

本專案採用 Monorepo 結構管理，涵蓋資料工程、後端 API 與前端視覺化：

- **資料管線 (Data Pipeline):** Python, Pandas, Requests（負責抓取證交所、國發會公開數據）
- **後端 API (Backend):** Python, FastAPI（提供高性能、非同步的 RESTful API）
- **前端介面 (Frontend):** React（規劃中）
- **資料庫與快取:** PostgreSQL, Redis（規劃中）

## 📂 專案結構 (Directory Structure)

```
taiwan-stock-alpha-vision/
├── data-pipeline/           # 爬蟲與資料清理腳本
│   ├── scrapers/            # 各資料來源的爬蟲
│   └── notebooks/           # 資料探索與分析筆記
├── backend/                 # FastAPI 伺服器
│   └── app/
│       ├── api/             # API 路由
│       ├── models/          # 資料模型
│       └── services/        # 商業邏輯
├── frontend/                # 使用者介面（React）
└── README.md
```

## 🚀 開發進度 (Roadmap)

- [x] 專案基礎架構與 README 初始化
- [ ] 實作資料管線：抓取「國發會景氣燈號」
- [ ] 實作資料管線：抓取「證交所三大法人買賣超」
- [ ] 建立 FastAPI 後端並串接資料
- [ ] 建立前端儀表板並實作資料視覺化
