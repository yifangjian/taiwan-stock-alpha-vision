import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence, animate } from 'framer-motion';
import DistributionChart        from '../components/DistributionChart';
import ArtisanInteractiveChart  from '../components/ArtisanInteractiveChart';
import SmartMoneyChart          from '../components/SmartMoneyChart';
import NewsFilter               from '../components/NewsFilter';
import { supabase }             from '../lib/supabase';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/* ── framer-motion variants ── */
const FU = (d = 0) => ({
  initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 },
  viewport: { once: true }, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: d },
});

const STAGGER = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};
const CARD_VAR = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};
const SECTION_VAR = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

/* ── Skeleton shimmer ── */
const Shimmer = ({ h = 18, w = '100%', style = {} }) => (
  <motion.div
    animate={{ opacity: [0.45, 0.75, 0.45] }}
    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
    style={{ height: h, width: w, background: '#EDE9E2', borderRadius: 2, ...style }}
  />
);

function SkeletonSection() {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* 3-card row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '20px 24px' }}>
            <Shimmer h={8} w="45%" style={{ marginBottom: 14 }} />
            <Shimmer h={20} w="70%" style={{ marginBottom: 8 }} />
            <Shimmer h={10} w="55%" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '24px' }}>
        <Shimmer h={10} w="30%" style={{ marginBottom: 16 }} />
        <Shimmer h={300} />
      </div>
      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[0, 1].map(i => (
          <div key={i} style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '20px 24px' }}>
            <Shimmer h={8} w="40%" style={{ marginBottom: 14 }} />
            <Shimmer h={100} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

const signalBorder = { green: '#4A9B6F', red: '#B85C38', yellow: '#A3907C' };

/* ── Candles fetcher (for ArtisanInteractiveChart) ── */
async function fetchCandles(stockId, period = '3mo') {
  try {
    const { data } = await axios.get(`${API}/api/v1/chart/candles/${stockId}`, { params: { period } });
    return data.candles ?? [];
  } catch { return []; }
}

/* ════════════════════════════════════════════════════════════ */
export default function AnalysisPage({ user, watchlist, onWatchlistChange }) {
  const [stockInput,   setStockInput]   = useState('');
  const [stockHealth,  setStockHealth]  = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [smartMoney,   setSmartMoney]   = useState(null);
  const [newsData,     setNewsData]     = useState(null);
  const [candles,      setCandles]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const search = async (id) => {
    const sid = (id || stockInput).trim();
    if (!sid) return;
    setStockInput(sid);
    setLoading(true);
    setStockHealth(null); setDistribution(null); setSmartMoney(null);
    setNewsData(null); setCandles([]); setError('');

    try {
      const [hR, dR, smR, nR, cR] = await Promise.all([
        axios.get(`${API}/api/v1/chip/stock/${sid}`),
        axios.get(`${API}/api/v1/chip/distribution/${sid}`).catch(() => null),
        axios.get(`${API}/api/v1/chip/smart-money/${sid}`).catch(() => null),
        axios.get(`${API}/api/v1/news/filter/${sid}`).catch(() => null),
        fetchCandles(sid),
      ]);
      setStockHealth(hR.data);
      if (dR)  setDistribution(dR.data);
      if (smR) setSmartMoney(smR.data);
      if (nR)  setNewsData(nR.data);
      setCandles(cR);
    } catch (e) {
      setError(e.response?.data?.detail || '查詢失敗，請確認股票代號');
    } finally { setLoading(false); }
  };

  const addWatch = async (id) => {
    if (!user || !supabase || watchlist?.includes(id)) return;
    await supabase.from('user_portfolios').insert({ user_id: user.id, stock_id: id });
    onWatchlistChange?.([...(watchlist || []), id]);
  };
  const removeWatch = async (id) => {
    if (!user || !supabase) return;
    await supabase.from('user_portfolios').delete().eq('user_id', user.id).eq('stock_id', id);
    onWatchlistChange?.((watchlist || []).filter(s => s !== id));
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 52px 80px' }}>

      {/* Page header */}
      <motion.div {...FU()} style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 10 }}>
          Stock Analysis
        </div>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 32, fontWeight: 400, color: '#3E3A39', margin: 0 }}>
          個股 X 光機
        </h1>
      </motion.div>

      {/* Watchlist */}
      <AnimatePresence>
        {user && watchlist?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: 28, overflow: 'hidden' }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 12 }}>
              我的自選股
            </div>
            <motion.div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} layout>
              {watchlist.map((sid, i) => (
                <motion.div
                  key={sid} layout
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.07)', transition: { duration: 0.2 } }}
                  style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #EDE9E2' }}
                >
                  <motion.button onClick={() => search(sid)} whileTap={{ scale: 0.95 }}
                    style={{ padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#3E3A39', fontFamily: "'Noto Serif TC', serif" }}>
                    {sid}
                  </motion.button>
                  <motion.button onClick={() => removeWatch(sid)} whileTap={{ scale: 0.9 }}
                    style={{ padding: '7px 10px 7px 0', background: 'none', border: 'none', cursor: 'pointer', color: '#CFC9BF', fontSize: 12 }}
                    whileHover={{ color: '#B85C38', transition: { duration: 0.15 } }}>
                    ✕
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar */}
      <motion.div {...FU(0.08)} style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
        <motion.input
          value={stockInput}
          onChange={e => setStockInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="輸入股票代號，例如：2330"
          whileFocus={{ boxShadow: '0 0 0 3px rgba(163,144,124,0.14)' }}
          style={{
            flex: 1, padding: '14px 20px', fontSize: 16,
            background: '#FFFFFF', color: '#3E3A39',
            border: '1px solid #EDE9E2', outline: 'none',
            fontFamily: "'Noto Serif TC', serif",
            transition: 'border-color 0.22s',
          }}
          onFocus={e => (e.target.style.borderColor = '#A3907C')}
          onBlur={e  => (e.target.style.borderColor = '#EDE9E2')}
        />
        <motion.button
          onClick={() => search()} disabled={loading}
          whileHover={!loading ? { y: -1, backgroundColor: '#9E4E2F', transition: { duration: 0.25 } } : {}}
          whileTap={!loading ? { scale: 0.97 } : {}}
          style={{
            padding: '14px 32px', fontSize: 15,
            background: loading ? '#CFC9BF' : '#B85C38',
            color: '#FFFFFF', border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Noto Serif TC', serif", letterSpacing: 1,
          }}>
          {loading ? '分析中⋯' : '開始健檢'}
        </motion.button>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ color: '#C0392B', fontSize: 14, marginBottom: 20, fontFamily: 'monospace' }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Loading progress bar */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="progress"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: 2, background: 'linear-gradient(90deg, #A3907C, #B85C38)',
              transformOrigin: 'left', marginBottom: 32, borderRadius: 1,
            }}
          />
        )}
      </AnimatePresence>

      {/* Skeleton while loading */}
      <AnimatePresence mode="wait">
        {loading && <SkeletonSection key="skeleton" />}
      </AnimatePresence>

      {/* Results — keyed to stock_id so AnimatePresence replays on new search */}
      <AnimatePresence mode="wait">
        {!loading && stockHealth && (
          <motion.div
            key={stockHealth.stock_id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            transition={{ duration: 0.3 }}
          >
            {/* Distribution chart */}
            <AnimatePresence>
              {distribution && (
                <motion.div
                  variants={SECTION_VAR} initial="hidden" animate="show"
                  style={{ marginBottom: 24 }}
                >
                  <DistributionChart data={distribution.data} stockId={distribution.stock_id} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Health cards — staggered */}
            <motion.div
              variants={STAGGER} initial="hidden" animate="show"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}
            >
              {[
                { label: '外資短線態度', value: stockHealth.foreign_status,  ok: stockHealth.foreign_bullish },
                { label: '股價 vs MA20', value: stockHealth.price_status,    ok: stockHealth.above_ma20 },
                {
                  label: `綜合結論（${stockHealth.stock_id}）`,
                  value: stockHealth.conclusion,
                  detail: stockHealth.conclusion_detail,
                  color: signalBorder[stockHealth.signal],
                },
              ].map((item, i) => {
                const c = item.color ?? (item.ok === true ? '#4A9B6F' : item.ok === false ? '#C0392B' : '#A3907C');
                return (
                  <motion.div
                    key={i}
                    variants={CARD_VAR}
                    whileHover={{ y: -3, boxShadow: '0 10px 32px rgba(0,0,0,0.08)', transition: { duration: 0.3 } }}
                    style={{
                      background: '#FFFFFF',
                      border: `1px solid ${c}`, borderTop: `3px solid ${c}`,
                      padding: '20px 24px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, color: '#B5ADA4', textTransform: 'uppercase', marginBottom: 10 }}>
                      {item.label}
                    </div>
                    <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: c, fontWeight: 500 }}>
                      {item.value}
                    </div>
                    {item.detail && (
                      <div style={{ fontSize: 12, color: '#857870', marginTop: 6 }}>{item.detail}</div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Watchlist CTA */}
            {supabase && user && (
              <motion.div variants={SECTION_VAR} initial="hidden" animate="show" style={{ marginBottom: 28 }}>
                {watchlist?.includes(stockHealth.stock_id) ? (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    style={{ color: '#4A9B6F', fontSize: 13, fontFamily: 'monospace' }}
                  >
                    ✓ 已加入自選股
                  </motion.span>
                ) : (
                  <motion.button
                    onClick={() => addWatch(stockHealth.stock_id)}
                    whileHover={{ y: -1, borderColor: '#A3907C', color: '#A3907C', transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '7px 18px', fontSize: 13,
                      background: 'transparent', border: '1px solid #CFC9BF',
                      color: '#857870', cursor: 'pointer',
                      fontFamily: "'Noto Serif TC', serif",
                      transition: 'border-color 0.2s, color 0.2s',
                    }}
                  >
                    ＋ 加入自選股
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* Interactive K-line chart */}
            <motion.div
              variants={SECTION_VAR} initial="hidden" animate="show"
              style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '24px 28px', marginBottom: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
            >
              <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 16 }}>
                K 線 · 均線 · 成交量
              </div>
              <ArtisanInteractiveChart candles={candles.length ? candles : null} height={440} />
            </motion.div>

            {/* Smart money */}
            {smartMoney && (
              <motion.div variants={SECTION_VAR} initial="hidden" animate="show" style={{ marginBottom: 28 }}>
                <SmartMoneyChart data={smartMoney} />
              </motion.div>
            )}

            {/* News */}
            {newsData && (
              <motion.div variants={SECTION_VAR} initial="hidden" animate="show">
                <NewsFilter data={newsData} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
