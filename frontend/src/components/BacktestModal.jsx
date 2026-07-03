import { useState } from 'react';
import { motion } from 'framer-motion';
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

const selectStyle = {
  background: '#F9F6F0', color: '#3E3A39',
  border: '1px solid #EDE9E2', padding: '10px 12px',
  fontSize: '14px', width: '100%', outline: 'none',
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
      const res = await axios.post(`${API}/api/v1/backtest?entry_score=${entryScore}&exit_score=${exitScore}&capital=${capital}`);
      setResult(res.data);
    } catch (e) { setError(e.response?.data?.detail || '回測失敗'); }
    finally { setLoading(false); }
  };

  const tipStyle = { backgroundColor: '#fff', border: '1px solid #EDE9E2', color: '#3E3A39', fontSize: 13 };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(62,58,57,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: '#FFFFFF', border: '1px solid #EDE9E2',
          padding: '40px', width: '90%', maxWidth: '860px',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 16px 48px rgba(0,0,0,0.10)',
        }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontFamily:"'Noto Serif TC', serif", fontSize: '20px', fontWeight: 400, color: '#3E3A39' }}>
            景氣燈號策略回測沙盒
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#B5ADA4', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ color: '#B5ADA4', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'monospace', display: 'block', marginBottom: '6px' }}>📉 進場條件</label>
            <select style={selectStyle} value={entryScore} onChange={e => setEntryScore(+e.target.value)}>
              {ENTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#B5ADA4', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'monospace', display: 'block', marginBottom: '6px' }}>📈 出場條件</label>
            <select style={selectStyle} value={exitScore} onChange={e => setExitScore(+e.target.value)}>
              {EXIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#B5ADA4', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'monospace', display: 'block', marginBottom: '6px' }}>💰 投資本金（元）</label>
            <input style={selectStyle} type="number" value={capital} onChange={e => setCapital(e.target.value)} />
          </div>
        </div>

        <motion.button onClick={run} disabled={loading}
          style={{
            width: '100%', padding: '14px', background: '#B85C38', color: '#fff',
            border: 'none', fontFamily:"'Noto Serif TC', serif", fontSize: '15px',
            letterSpacing: '2px', cursor: 'pointer', marginBottom: '28px',
          }}
          whileHover={{ backgroundColor: '#9E4E2F', y: -1, transition: { duration: 0.4 } }}>
          {loading ? '時光機啟動中…' : '開始回測'}
        </motion.button>

        {error && <p style={{ color: '#B85C38', marginBottom: '16px', fontSize: '14px' }}>{error}</p>}

        {result && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: '歷史勝率', value: `${result.win_rate_pct}%`,     color: '#4A9B6F' },
                { label: '總報酬率', value: `${result.total_return_pct}%`, color: result.total_return_pct >= 0 ? '#A3907C' : '#B85C38' },
                { label: '最大回撤', value: `${result.mdd_pct}%`,          color: '#B85C38' },
              ].map(kpi => (
                <motion.div key={kpi.label}
                  style={{ background: '#F9F6F0', border: '1px solid #EDE9E2', padding: '20px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
                  whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(0,0,0,0.07)', transition: { duration: 0.4 } }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#B5ADA4', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>{kpi.label}</div>
                  <div style={{ fontFamily:"'Noto Serif TC', serif", fontSize: '32px', fontWeight: 600, color: kpi.color }}>{kpi.value}</div>
                </motion.div>
              ))}
            </div>

            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#B5ADA4', marginBottom: '16px', letterSpacing: '1px' }}>
              在市 {result.months_in_market} 個月 &nbsp;·&nbsp;
              NT${Number(result.initial_capital).toLocaleString()} → NT${Number(result.final_capital).toLocaleString()}
            </div>

            <div style={{ fontFamily:"'Noto Serif TC', serif", fontSize: '14px', color: '#857870', marginBottom: '12px' }}>資產成長曲線（最近 60 個月）</div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.equity_curve}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#A3907C" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#A3907C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="transparent" />
                  <XAxis dataKey="date" stroke="#CFC9BF" axisLine={{ stroke: '#EDE9E2' }} tickLine={false} tick={{ fill: '#B5ADA4', fontSize: 11 }} />
                  <YAxis stroke="#CFC9BF" axisLine={{ stroke: '#EDE9E2' }} tickLine={false} tick={{ fill: '#B5ADA4', fontSize: 11 }} tickFormatter={v => `${(v/10000).toFixed(0)}萬`} />
                  <Tooltip contentStyle={tipStyle} formatter={v => [`NT$${Number(v).toLocaleString()}`]} />
                  <Area type="monotone" dataKey="equity" stroke="#A3907C" fill="url(#eqGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
