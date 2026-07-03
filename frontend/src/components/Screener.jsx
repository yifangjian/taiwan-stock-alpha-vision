import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const BADGE = {
  bullish:    { bg: 'rgba(74,155,111,0.09)',  color: '#4A9B6F', border: 'rgba(74,155,111,0.28)' },
  bearish:    { bg: 'rgba(192,57,43,0.07)',   color: '#C0392B', border: 'rgba(192,57,43,0.22)' },
  oversold:   { bg: 'rgba(163,144,124,0.10)', color: '#A3907C', border: 'rgba(163,144,124,0.3)' },
  overbought: { bg: 'rgba(184,92,56,0.09)',   color: '#B85C38', border: 'rgba(184,92,56,0.28)' },
};

const SELECT_ST = {
  width: '100%', padding: '10px 12px', fontSize: '14px',
  background: '#F9F6F0', color: '#3E3A39',
  border: '1px solid #EDE9E2', outline: 'none', cursor: 'pointer',
  fontFamily: "'Noto Serif TC', serif", appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23B5ADA4'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  transition: 'border-color 0.2s',
};

const labelSt = {
  display: 'block', fontSize: '10px', fontFamily: 'monospace',
  letterSpacing: '1.5px', textTransform: 'uppercase', color: '#B5ADA4', marginBottom: '8px',
};

function ResultCard({ stock, index }) {
  const ind = stock.indicators || {};
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ boxShadow: '0 8px 32px rgba(0,0,0,0.07)', y: -2, transition: { duration: 0.3 } }}
      style={{
        background: '#FFFFFF', border: '1px solid #EDE9E2',
        padding: '18px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: '20px', fontWeight: 600, color: '#3E3A39' }}>
            {stock.stock_id}
          </span>
          <span style={{ fontSize: '13px', color: '#857870', fontFamily: 'monospace' }}>
            {stock.current_price} 元
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {ind.rsi != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', letterSpacing: '1px', color: '#B5ADA4', textTransform: 'uppercase' }}>RSI</div>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', color: ind.rsi < 30 || ind.rsi > 70 ? '#B85C38' : '#857870' }}>
                {ind.rsi.toFixed(1)}
              </div>
            </div>
          )}
          {ind.ma20 != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', letterSpacing: '1px', color: '#B5ADA4', textTransform: 'uppercase' }}>MA20</div>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', color: ind.above_ma20 ? '#4A9B6F' : '#C0392B' }}>
                {ind.ma20.toFixed(0)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pattern badges */}
      {stock.ta_patterns?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {stock.ta_patterns.map((p, i) => {
            const s = BADGE[p.type] || BADGE.oversold;
            return (
              <span key={i} style={{
                fontSize: '11px', padding: '2px 9px',
                background: s.bg, color: s.color,
                border: `1px solid ${s.border}`,
                borderRadius: '3px',
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

export default function Screener({ open, onClose }) {
  const [filters, setFilters] = useState({
    ma_status:     'all',
    rsi_condition: 'all',
    macd_condition:'all',
  });
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [screened, setScreened] = useState(0);
  const [error,    setError]    = useState('');

  async function runScreen() {
    setLoading(true); setResults([]); setDone(false); setError('');
    try {
      const { data } = await axios.post(`${API}/api/v1/screener`, filters, { timeout: 60000 });
      setResults(data.results || []);
      setScreened(data.screened || 0);
      setDone(true);
    } catch {
      setError('篩選失敗，請確認後端服務正在運行');
    } finally {
      setLoading(false);
    }
  }

  const F = (key, opts) => (
    <div>
      <label style={labelSt}>{opts.label}</label>
      <select
        style={SELECT_ST} value={filters[key]}
        onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
        onFocus={e => (e.target.style.borderColor = '#A3907C')}
        onBlur={e  => (e.target.style.borderColor = '#EDE9E2')}
      >
        {opts.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(62,58,57,0.4)', backdropFilter: 'blur(3px)' }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', top: '5vh', left: '50%', transform: 'translateX(-50%)',
              width: 'min(640px, 94vw)', maxHeight: '90vh',
              background: '#FFFFFF', border: '1px solid #EDE9E2',
              boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
              zIndex: 301, display: 'flex', flexDirection: 'column', overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #EDE9E2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#B5ADA4', marginBottom: '4px' }}>
                  Technical Screener
                </div>
                <h2 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: '18px', color: '#3E3A39', margin: 0, fontWeight: 500 }}>
                  彈性選股濾網
                </h2>
              </div>
              <button onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B5ADA4', fontSize: '20px', padding: '4px 8px', lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {/* Filters */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #EDE9E2', flexShrink: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                {F('ma_status', {
                  label: '均線條件',
                  options: [
                    { value: 'all',              label: '全部條件' },
                    { value: 'above_ma5',        label: '站上 5MA' },
                    { value: 'above_ma20',       label: '站上 20MA' },
                    { value: 'above_ma60',       label: '站上 60MA' },
                    { value: 'bullish_alignment',label: '多頭排列' },
                  ],
                })}
                {F('rsi_condition', {
                  label: 'RSI 條件',
                  options: [
                    { value: 'all',       label: '全部條件' },
                    { value: 'oversold',  label: 'RSI 超賣 < 30' },
                    { value: 'overbought',label: 'RSI 超買 > 70' },
                  ],
                })}
                {F('macd_condition', {
                  label: 'MACD 條件',
                  options: [
                    { value: 'all',          label: '全部條件' },
                    { value: 'bullish',      label: 'MACD 多頭' },
                    { value: 'golden_cross', label: '黃金交叉' },
                  ],
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '12px', color: '#B5ADA4', fontFamily: 'monospace', margin: 0 }}>
                  篩選台股熱門 24 支股票 · 約需 15–30 秒
                </p>
                <motion.button
                  onClick={runScreen} disabled={loading}
                  whileHover={{ y: -1, transition: { duration: 0.2 } }}
                  style={{
                    padding: '11px 28px', fontSize: '14px',
                    background: loading ? '#CFC9BF' : '#3E3A39',
                    color: '#FFFFFF', border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: "'Noto Serif TC', serif", letterSpacing: '1px',
                  }}
                >
                  {loading ? '篩選中⋯' : '🔎 開始篩選'}
                </motion.button>
              </div>
            </div>

            {/* Results */}
            <div style={{ padding: '24px 28px', flex: 1 }}>
              {loading && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#B5ADA4', fontSize: '13px', fontFamily: 'monospace' }}>
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                  >
                    正在逐一分析個股技術指標⋯
                  </motion.div>
                </div>
              )}

              {error && <p style={{ color: '#C0392B', fontSize: '13px', fontFamily: 'monospace' }}>{error}</p>}

              {done && !loading && (
                <>
                  <div style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#B5ADA4', marginBottom: '16px' }}>
                    符合條件 {results.length} / 已篩 {screened} 支
                  </div>

                  {results.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#B5ADA4', fontFamily: "'Noto Serif TC', serif", fontSize: '15px' }}>
                      目前無股票符合所有條件，請放寬篩選條件
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {results.map((s, i) => (
                        <ResultCard key={s.stock_id} stock={s} index={i} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
