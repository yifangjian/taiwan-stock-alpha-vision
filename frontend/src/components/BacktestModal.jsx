import { useState } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const ENTRY_OPTIONS = [
  { label: '藍燈 ≤ 16（最底部）', value: 16 },
  { label: '黃藍燈 ≤ 22（偏低）',  value: 22 },
  { label: '綠燈 ≤ 31（中性）',   value: 31 },
];
const EXIT_OPTIONS = [
  { label: '紅燈 ≥ 38（過熱）',   value: 38 },
  { label: '黃紅燈 ≥ 32（偏熱）', value: 32 },
  { label: '綠燈 ≥ 23（中性）',   value: 23 },
];

const overlay = {
  position: 'fixed', inset: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};
const modal = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '16px',
  padding: '32px',
  width: '90%', maxWidth: '860px',
  maxHeight: '90vh', overflowY: 'auto',
};

export default function BacktestModal({ onClose }) {
  const [entryScore, setEntryScore] = useState(16);
  const [exitScore,  setExitScore]  = useState(38);
  const [capital,    setCapital]    = useState('1000000');
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await axios.post(
        `${API}/api/v1/backtest?entry_score=${entryScore}&exit_score=${exitScore}&capital=${capital}`
      );
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || '回測失敗');
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    backgroundColor: '#0f172a', color: '#f8fafc',
    border: '1px solid #475569', borderRadius: '8px',
    padding: '10px 12px', fontSize: '15px', width: '100%',
  };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#38bdf8' }}>⏳ 景氣燈號策略回測沙盒</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '6px' }}>📉 進場條件（燈號低於…）</label>
            <select style={selectStyle} value={entryScore} onChange={e => setEntryScore(+e.target.value)}>
              {ENTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '6px' }}>📈 出場條件（燈號高於…）</label>
            <select style={selectStyle} value={exitScore} onChange={e => setExitScore(+e.target.value)}>
              {EXIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '6px' }}>💰 投資本金（元）</label>
            <input
              style={{ ...selectStyle }}
              type="number" value={capital}
              onChange={e => setCapital(e.target.value)}
            />
          </div>
        </div>

        <button onClick={run} disabled={loading} style={{
          width: '100%', padding: '14px', fontSize: '17px', fontWeight: 'bold',
          backgroundColor: '#38bdf8', color: '#0f172a',
          border: 'none', borderRadius: '10px', cursor: 'pointer', marginBottom: '24px',
        }}>
          {loading ? '時光機啟動中...' : '🚀 開始回測'}
        </button>

        {error && <p style={{ color: '#ef4444' }}>{error}</p>}

        {result && (
          <>
            {/* KPI 卡片 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: '歷史勝率', value: `${result.win_rate_pct}%`,    color: '#10b981' },
                { label: '總報酬率', value: `${result.total_return_pct}%`, color: result.total_return_pct >= 0 ? '#38bdf8' : '#ef4444' },
                { label: '最大回撤 MDD', value: `${result.mdd_pct}%`,    color: '#f59e0b' },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  backgroundColor: '#0f172a', padding: '16px', borderRadius: '10px',
                  border: '1px solid #334155', textAlign: 'center',
                }}>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>{kpi.label}</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>

            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
              策略共在市 {result.months_in_market} 個月｜
              初始資金 NT${Number(result.initial_capital).toLocaleString()} →
              最終 NT${Number(result.final_capital).toLocaleString()}
            </div>

            {/* 資產成長曲線 */}
            <h3 style={{ color: '#e2e8f0', marginTop: 0 }}>資產成長曲線（最近 60 個月）</h3>
            <div style={{ height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.equity_curve}>
                  <defs>
                    <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tickFormatter={v => `${(v / 10000).toFixed(0)}萬`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #38bdf8' }}
                    formatter={v => [`NT$${Number(v).toLocaleString()}`]}
                  />
                  <Area type="monotone" dataKey="equity" stroke="#38bdf8" fill="url(#eq)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
