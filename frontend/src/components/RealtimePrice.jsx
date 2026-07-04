/**
 * RealtimePrice
 * 即時報價 + 委買委賣五檔
 * - 資料來源：TWSE MIS API（免費，盤中 ~5 秒更新）
 * - 盤中（台股 09:00-13:30 週一到週五）每 30 秒自動刷新
 * - 盤後顯示「盤後」標籤，不自動刷新
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const LBL = {
  fontFamily: 'monospace', fontSize: 9, letterSpacing: 2,
  textTransform: 'uppercase', color: '#B5ADA4',
};

function isTwMarketOpen() {
  const utc = Date.now();
  const tw  = new Date(utc + 8 * 3600 * 1000);
  const day  = tw.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = tw.getUTCHours() * 60 + tw.getUTCMinutes();
  return mins >= 9 * 60 && mins <= 13 * 60 + 30;
}

// ── Five-Level Order Book ─────────────────────────────────────────

function OrderBook({ data }) {
  if (!data) return null;
  const { ask_prices, ask_vols, bid_prices, bid_vols, prev_close } = data;

  const maxVol = Math.max(...ask_vols, ...bid_vols, 1);

  const row = (price, vol, side) => {
    if (!price) return null;
    const pct  = vol / maxVol;
    const clr  = side === 'ask' ? 'rgba(92,113,94,0.18)' : 'rgba(184,92,56,0.18)';
    const tclr = side === 'ask' ? '#5C715E' : '#B85C38';
    const chgFromPrev = prev_close ? ((price - prev_close) / prev_close * 100).toFixed(2) : null;
    return (
      <div key={price} style={{ display: 'flex', alignItems: 'center', gap: 0, height: 28, position: 'relative' }}>
        {side === 'ask' ? (
          <>
            {/* Vol bar (left aligned for ask) */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingRight: 8, position: 'relative' }}>
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${pct * 100}%`, background: clr, transition: 'width 0.4s' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#857870', position: 'relative' }}>
                {vol.toLocaleString()}
              </span>
            </div>
            <div style={{ width: 76, textAlign: 'center', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: tclr }}>
              {price?.toFixed(2)}
            </div>
            <div style={{ width: 52, textAlign: 'right', fontFamily: 'monospace', fontSize: 10, color: chgFromPrev >= 0 ? '#B85C38' : '#5C715E' }}>
              {chgFromPrev ? `${chgFromPrev >= 0 ? '+' : ''}${chgFromPrev}%` : ''}
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 52, textAlign: 'left', fontFamily: 'monospace', fontSize: 10, color: chgFromPrev >= 0 ? '#B85C38' : '#5C715E' }}>
              {chgFromPrev ? `${chgFromPrev >= 0 ? '+' : ''}${chgFromPrev}%` : ''}
            </div>
            <div style={{ width: 76, textAlign: 'center', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: tclr }}>
              {price?.toFixed(2)}
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingLeft: 8, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, background: clr, transition: 'width 0.4s' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#857870', position: 'relative' }}>
                {vol.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2' }}>
      {/* Header */}
      <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #F0ECE7', background: '#FAFAF8' }}>
        <div style={{ flex: 1, textAlign: 'center', ...LBL }}>委賣量（張）</div>
        <div style={{ width: 76, textAlign: 'center', ...LBL }}>價格</div>
        <div style={{ flex: 1, textAlign: 'center', ...LBL }}>委買量（張）</div>
      </div>

      {/* Ask rows (sell side) — display from highest to lowest */}
      <div style={{ borderBottom: '2px solid #F0ECE7' }}>
        {[...ask_prices].reverse().map((p, i) => {
          const ri = ask_prices.length - 1 - i;
          return p ? (
            <div key={i} style={{ borderBottom: '1px solid #F9F6F0' }}>
              {row(p, ask_vols[ri], 'ask')}
            </div>
          ) : null;
        })}
      </div>

      {/* Bid rows (buy side) */}
      <div>
        {bid_prices.map((p, i) => p ? (
          <div key={i} style={{ borderBottom: '1px solid #F9F6F0' }}>
            {row(p, bid_vols[i], 'bid')}
          </div>
        ) : null)}
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '14px 16px' }}>
      <div style={LBL}>{label}</div>
      <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: color || '#3E3A39', marginTop: 6, fontWeight: 300 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#CFC9BF', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export default function RealtimePrice({ stockId }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const timerRef = useRef(null);

  const fetch = useCallback(async () => {
    if (!stockId) return;
    setLoading(true);
    try {
      const { data: d } = await axios.get(`${API}/api/v1/stock/realtime/${stockId}`);
      if (!d.error) { setData(d); setLastFetch(new Date()); }
    } catch { /* silently */ }
    finally { setLoading(false); }
  }, [stockId]);

  useEffect(() => {
    if (!stockId) return;
    setData(null);
    fetch();

    // Auto-refresh every 30s during market hours
    timerRef.current = setInterval(() => {
      if (isTwMarketOpen()) fetch();
    }, 30_000);

    return () => clearInterval(timerRef.current);
  }, [stockId, fetch]);

  if (!data) return null;

  const chgColor  = !data.change ? '#857870' : data.change >= 0 ? '#B85C38' : '#5C715E';
  const marketOpen = isTwMarketOpen();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 24 }}
    >
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ ...LBL, fontSize: 10, letterSpacing: 2 }}>即時報價 · Real-time</div>
        {marketOpen ? (
          <span style={{ ...LBL, fontSize: 9, color: '#4A9B6F', background: 'rgba(74,155,111,0.1)', padding: '2px 7px', border: '1px solid rgba(74,155,111,0.3)' }}>
            ● 盤中
          </span>
        ) : (
          <span style={{ ...LBL, fontSize: 9, color: '#B5ADA4', background: '#F9F6F0', padding: '2px 7px', border: '1px solid #EDE9E2' }}>
            盤後
          </span>
        )}
        <button
          onClick={fetch} disabled={loading}
          style={{ marginLeft: 'auto', background: 'none', border: '1px solid #EDE9E2', padding: '3px 10px', fontSize: 10, fontFamily: 'monospace', color: '#B5ADA4', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '更新中' : '↻ 刷新'}
        </button>
      </div>

      {/* Price header */}
      <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '20px 24px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...LBL, marginBottom: 6 }}>{data.name || stockId}</div>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 40, fontWeight: 300, color: chgColor, lineHeight: 1 }}>
              {data.price ? data.price.toFixed(2) : '—'}
            </div>
          </div>
          {data.change !== null && data.change !== undefined && (
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 16, color: chgColor }}>
                {data.change >= 0 ? '▲' : '▼'} {Math.abs(data.change).toFixed(2)}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: chgColor }}>
                ({data.change_pct >= 0 ? '+' : ''}{data.change_pct}%)
              </div>
            </div>
          )}
          {lastFetch && (
            <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 10, color: '#CFC9BF', alignSelf: 'flex-end' }}>
              {data.date} {data.time}
            </div>
          )}
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        <StatCard label="開盤"   value={data.open?.toFixed(2)} />
        <StatCard label="最高"   value={data.high?.toFixed(2)} color="#B85C38" />
        <StatCard label="最低"   value={data.low?.toFixed(2)}  color="#5C715E" />
        <StatCard label="成交量" value={data.volume ? `${data.volume.toLocaleString()} 張` : '—'} />
      </div>

      {/* Five-level order book */}
      {(data.ask_prices?.some(Boolean) || data.bid_prices?.some(Boolean)) && (
        <>
          <div style={{ ...LBL, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>委買委賣五檔</div>
          <OrderBook data={data} />
        </>
      )}
    </motion.div>
  );
}
