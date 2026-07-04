import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useResponsive } from '../hooks/useResponsive';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const BADGE = {
  bullish:    { bg: 'rgba(74,155,111,0.09)',  color: '#4A9B6F', border: 'rgba(74,155,111,0.28)' },
  bearish:    { bg: 'rgba(192,57,43,0.07)',   color: '#C0392B', border: 'rgba(192,57,43,0.22)' },
  oversold:   { bg: 'rgba(163,144,124,0.10)', color: '#A3907C', border: 'rgba(163,144,124,0.3)' },
  overbought: { bg: 'rgba(184,92,56,0.09)',   color: '#B85C38', border: 'rgba(184,92,56,0.28)' },
};

const FU = (d = 0) => ({
  initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 },
  viewport: { once: true }, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: d },
});

const SELECT_ST = {
  width: '100%', padding: '12px 16px', fontSize: 14,
  background: '#FFFFFF', color: '#3E3A39',
  border: '1px solid #EDE9E2', outline: 'none', cursor: 'pointer',
  fontFamily: "'Noto Serif TC', serif", appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23B5ADA4'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
  transition: 'border-color 0.2s',
};
const labelSt = {
  display: 'block', fontSize: 10, fontFamily: 'monospace',
  letterSpacing: '1.5px', textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 10,
};

function ResultCard({ stock, index }) {
  const ind = stock.indicators || {};
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.08)', transition: { duration: 0.35 } }}
      style={{
        background: '#FFFFFF', border: '1px solid #EDE9E2',
        padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 24, fontWeight: 600, color: '#3E3A39' }}>
            {stock.stock_id}
          </span>
          <span style={{ fontSize: 14, color: '#857870', fontFamily: 'monospace' }}>
            {stock.current_price} 元
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {ind.rsi != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, color: '#B5ADA4', textTransform: 'uppercase', marginBottom: 2 }}>RSI</div>
              <div style={{ fontSize: 14, fontFamily: 'monospace', color: (ind.rsi < 30 || ind.rsi > 70) ? '#B85C38' : '#857870' }}>
                {ind.rsi.toFixed(1)}
              </div>
            </div>
          )}
          {ind.ma20 != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, color: '#B5ADA4', textTransform: 'uppercase', marginBottom: 2 }}>MA20</div>
              <div style={{ fontSize: 14, fontFamily: 'monospace', color: ind.above_ma20 ? '#4A9B6F' : '#C0392B' }}>
                {ind.ma20.toFixed(0)}
              </div>
            </div>
          )}
        </div>
      </div>

      {stock.ta_patterns?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {stock.ta_patterns.map((p, i) => {
            const s = BADGE[p.type] || BADGE.oversold;
            return (
              <span key={i} style={{
                fontSize: 12, padding: '3px 10px',
                background: s.bg, color: s.color,
                border: `1px solid ${s.border}`,
                borderRadius: 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)',
                fontFamily: "'Noto Serif TC', serif",
              }}>
                {p.label}
              </span>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default function ScreenerPage() {
  const { isMobile } = useResponsive();
  const [filters, setFilters] = useState({ ma_status: 'all', rsi_condition: 'all', macd_condition: 'all' });
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [screened, setScreened] = useState(0);
  const [error,    setError]    = useState('');

  async function run() {
    setLoading(true); setResults([]); setDone(false); setError('');
    try {
      const { data } = await axios.post(`${API}/api/v1/screener`, filters, { timeout: 60000 });
      setResults(data.results || []);
      setScreened(data.screened || 0);
      setDone(true);
    } catch {
      setError('篩選失敗，請確認後端服務正在運行');
    } finally { setLoading(false); }
  }

  const F = (key, opts) => (
    <div>
      <label style={labelSt}>{opts.label}</label>
      <select style={SELECT_ST} value={filters[key]}
        onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
        onFocus={e => (e.target.style.borderColor = '#A3907C')}
        onBlur={e  => (e.target.style.borderColor = '#EDE9E2')}>
        {opts.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '48px 52px 80px' }}>

      {/* Page header */}
      <motion.div {...FU()} style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 10 }}>Technical Screener</div>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 32, fontWeight: 400, color: '#3E3A39', margin: 0 }}>彈性選股濾網</h1>
      </motion.div>

      {/* Filter panel */}
      <motion.div {...FU(0.05)}
        style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: isMobile ? '24px 20px' : '36px 40px', marginBottom: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 16 : 28, marginBottom: 32 }}>
          {F('ma_status', {
            label: '均線條件',
            options: [
              { value: 'all',              label: '全部條件' },
              { value: 'above_ma5',        label: '站上 5MA' },
              { value: 'above_ma20',       label: '站上 20MA' },
              { value: 'above_ma60',       label: '站上 60MA' },
              { value: 'bullish_alignment',label: '均線多頭排列' },
            ],
          })}
          {F('rsi_condition', {
            label: 'RSI 條件',
            options: [
              { value: 'all',        label: '全部條件' },
              { value: 'oversold',   label: 'RSI 超賣 < 30' },
              { value: 'overbought', label: 'RSI 超買 > 70' },
            ],
          })}
          {F('macd_condition', {
            label: 'MACD 條件',
            options: [
              { value: 'all',          label: '全部條件' },
              { value: 'bullish',      label: 'MACD 多頭' },
              { value: 'golden_cross', label: 'MACD 黃金交叉' },
            ],
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 12 : 0 }}>
          <p style={{ fontSize: 12, color: '#B5ADA4', fontFamily: 'monospace', margin: 0 }}>
            篩選台股熱門 24 支股票 · 平行運算 · 約需 15–30 秒
          </p>
          <motion.button onClick={run} disabled={loading}
            whileHover={{ y: -1, backgroundColor: '#9E4E2F', transition: { duration: 0.3 } }}
            style={{
              padding: '13px 36px', fontSize: 15,
              background: loading ? '#CFC9BF' : '#B85C38',
              color: '#FFFFFF', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Noto Serif TC', serif", letterSpacing: 1,
            }}>
            {loading ? '篩選中⋯' : '🔎 開始篩選'}
          </motion.button>
        </div>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            style={{ color: '#B5ADA4', fontSize: 14, fontFamily: 'monospace' }}>
            正在逐一分析個股技術指標，請稍候⋯
          </motion.p>
        </div>
      )}

      {error && <p style={{ color: '#C0392B', fontSize: 13, fontFamily: 'monospace' }}>{error}</p>}

      {/* Results */}
      {done && !loading && (
        <>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 20 }}>
            符合條件 {results.length} / 已篩 {screened} 支
          </div>

          {results.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', border: '1px dashed #EDE9E2' }}>
              <p style={{ fontFamily: "'Noto Serif TC', serif", color: '#857870', fontSize: 15 }}>目前無股票符合所有條件，請放寬篩選條件</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
              {results.map((s, i) => <ResultCard key={s.stock_id} stock={s} index={i} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
