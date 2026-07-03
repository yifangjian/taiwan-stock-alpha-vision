import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import PositionCalculator from './components/PositionCalculator';
import DistributionChart from './components/DistributionChart';
import BacktestModal from './components/BacktestModal';
import './App.css';

const API = 'http://127.0.0.1:8000';

function App() {
  const [macroData, setMacroData] = useState([]);
  const [chipData, setChipData] = useState([]);
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 個股健檢
  const [stockInput, setStockInput] = useState('');
  const [stockHealth, setStockHealth] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState('');
  const [distribution, setDistribution] = useState(null);

  // 回測 Modal
  const [showBacktest, setShowBacktest] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [macroRes, chipRes, sentimentRes] = await Promise.all([
          axios.get(`${API}/api/v1/macro/signal`),
          axios.get(`${API}/api/v1/chip/institutional`),
          axios.get(`${API}/api/v1/sentiment/ptt`).catch(() => null),
        ]);
        setMacroData(macroRes.data.data.slice(0, 36).reverse());
        setChipData(chipRes.data.data);
        if (sentimentRes) setSentimentData(sentimentRes.data);
      } catch (err) {
        console.error('資料載入失敗', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getSentimentColor = (score) => {
    if (score >= 60) return '#ef4444';
    if (score <= 40) return '#10b981';
    return '#f59e0b';
  };

  const handleStockSearch = async () => {
    if (!stockInput.trim()) return;
    const id = stockInput.trim();
    setStockLoading(true);
    setStockHealth(null);
    setDistribution(null);
    setStockError('');
    try {
      const [healthRes, distRes] = await Promise.all([
        axios.get(`${API}/api/v1/chip/stock/${id}`),
        axios.get(`${API}/api/v1/chip/distribution/${id}`).catch(() => null),
      ]);
      setStockHealth(healthRes.data);
      if (distRes) setDistribution(distRes.data);
    } catch (err) {
      setStockError(err.response?.data?.detail || '查詢失敗，請確認股票代號');
    } finally {
      setStockLoading(false);
    }
  };

  const signalColor = { green: '#10b981', red: '#ef4444', yellow: '#f59e0b' };

  if (loading) return (
    <div style={{ color: 'white', padding: '50px', fontSize: '24px', backgroundColor: '#0f172a', minHeight: '100vh' }}>
      載入戰情數據中...
    </div>
  );

  return (
    <div style={{ padding: '30px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, color: '#38bdf8' }}>AlphaVision Pro 戰情中心</h1>
        <p style={{ margin: '8px 0 0', color: '#94a3b8' }}>台股宏觀與籌碼透視系統</p>
      </header>

      {/* Task-010：eli5 白話建議跑馬燈 */}
      {sentimentData?.eli5_advice && (
        <div style={{
          backgroundColor: '#1e3a5f', border: '1px solid #38bdf8',
          borderRadius: '10px', padding: '14px 20px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '22px' }}>🤖</span>
          <p style={{ margin: 0, color: '#bae6fd', fontSize: '17px', lineHeight: '1.5' }}>
            <strong style={{ color: '#38bdf8' }}>今日小白建議：</strong>
            {sentimentData.eli5_advice}
          </p>
        </div>
      )}

      {/* 情緒指標卡片 */}
      {sentimentData && (
        <div style={{
          backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px',
          border: '1px solid #334155', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '40px',
        }}>
          <div style={{ textAlign: 'center', minWidth: '140px' }}>
            <div style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '8px' }}>PTT 散戶情緒</div>
            <div style={{ fontSize: '60px', fontWeight: 'bold', color: getSentimentColor(sentimentData.fear_greed_score), lineHeight: 1 }}>
              {sentimentData.fear_greed_score}
            </div>
            <div style={{ fontSize: '20px', color: getSentimentColor(sentimentData.fear_greed_score), marginTop: '6px' }}>
              {sentimentData.sentiment_label}
            </div>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid #334155', paddingLeft: '36px' }}>
            <h3 style={{ margin: '0 0 8px', color: '#e2e8f0' }}>AI 盤後摘要分析</h3>
            <p style={{ margin: 0, color: '#cbd5e1', fontSize: '17px', lineHeight: '1.6' }}>{sentimentData.summary}</p>
            <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: '13px' }}>分析文章數：{sentimentData.article_count} 篇</p>
          </div>
        </div>
      )}

      {/* 雙欄圖表 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>國發會景氣對策信號 (近三年)</h2>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={macroData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="Date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" domain={[0, 50]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #38bdf8' }} />
                <ReferenceLine y={38} label="紅燈(38)" stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={16} label="藍燈(16)" stroke="#3b82f6" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="Signal_Score" name="景氣分數" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>今日三大法人買賣超</h2>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chipData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="單位名稱" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" width={100} tickFormatter={(v) => `${(v / 1e8).toFixed(0)}億`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #38bdf8' }}
                  formatter={(v) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' }).format(v)}
                />
                <Legend />
                <Bar dataKey="買進金額" fill="#10b981" name="買進" />
                <Bar dataKey="賣出金額" fill="#ef4444" name="賣出" />
                <Bar dataKey="買賣差額" fill="#38bdf8" name="淨買賣超" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Task-012：個股健檢 */}
      <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '24px' }}>
        <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>🔍 檢驗我的持股</h2>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            style={{
              flex: 1, padding: '10px 14px', fontSize: '16px',
              backgroundColor: '#0f172a', color: '#f8fafc',
              border: '1px solid #475569', borderRadius: '8px',
            }}
            placeholder="輸入股票代號，例如：2330"
            value={stockInput}
            onChange={(e) => setStockInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStockSearch()}
          />
          <button
            onClick={handleStockSearch}
            disabled={stockLoading}
            style={{
              padding: '10px 24px', fontSize: '16px', cursor: 'pointer',
              backgroundColor: '#38bdf8', color: '#0f172a',
              border: 'none', borderRadius: '8px', fontWeight: 'bold',
            }}
          >
            {stockLoading ? '分析中...' : '健檢開始'}
          </button>
        </div>

        {stockError && <p style={{ color: '#ef4444' }}>{stockError}</p>}

        {distribution && <DistributionChart data={distribution.data} stockId={distribution.stock_id} />}

        {stockHealth && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { label: '外資短線態度', value: stockHealth.foreign_status, ok: stockHealth.foreign_bullish },
              { label: '股價 vs MA20', value: stockHealth.price_status, ok: stockHealth.above_ma20 },
              {
                label: `綜合結論（${stockHealth.stock_id}）`,
                value: stockHealth.conclusion,
                detail: stockHealth.conclusion_detail,
                color: signalColor[stockHealth.signal],
              },
            ].map((item, i) => (
              <div key={i} style={{
                backgroundColor: '#0f172a', padding: '16px', borderRadius: '10px',
                border: `1px solid ${item.color ?? (item.ok === true ? '#10b981' : item.ok === false ? '#ef4444' : '#f59e0b')}`,
              }}>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>{item.label}</div>
                <div style={{
                  fontSize: '16px', fontWeight: 'bold',
                  color: item.color ?? (item.ok === true ? '#10b981' : item.ok === false ? '#ef4444' : '#f59e0b'),
                }}>
                  {item.value}
                </div>
                {item.detail && <div style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>{item.detail}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task-015 入口：回測沙盒 */}
      <div style={{
        backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px',
        border: '1px solid #334155', marginBottom: '24px', textAlign: 'center',
      }}>
        <h2 style={{ margin: '0 0 8px', color: '#e2e8f0' }}>⏳ 無程式碼策略回測沙盒</h2>
        <p style={{ color: '#94a3b8', margin: '0 0 16px' }}>
          用景氣燈號歷史數據驗證「藍燈買、紅燈賣」的真實績效
        </p>
        <button
          onClick={() => setShowBacktest(true)}
          style={{
            padding: '12px 32px', fontSize: '16px', fontWeight: 'bold',
            backgroundColor: '#7c3aed', color: 'white',
            border: 'none', borderRadius: '10px', cursor: 'pointer',
          }}
        >
          🚀 啟動時光機
        </button>
      </div>

      {showBacktest && <BacktestModal onClose={() => setShowBacktest(false)} />}

      {/* Task-011：資金控管計算機 */}
      <PositionCalculator />
    </div>
  );
}

export default App;
