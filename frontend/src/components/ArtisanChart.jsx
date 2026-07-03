import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { motion } from 'framer-motion';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const MA_CFG = [
  { key: 'ma5',  label: '5MA',  period: 5,  color: 'rgba(184,92,56,0.65)' },
  { key: 'ma20', label: '20MA', period: 20, color: 'rgba(163,144,124,0.8)' },
  { key: 'ma60', label: '60MA', period: 60, color: 'rgba(92,113,94,0.65)' },
];

const BADGE = {
  bullish:    { bg: 'rgba(74,155,111,0.09)',  color: '#4A9B6F', border: 'rgba(74,155,111,0.28)' },
  bearish:    { bg: 'rgba(192,57,43,0.07)',   color: '#C0392B', border: 'rgba(192,57,43,0.22)' },
  oversold:   { bg: 'rgba(163,144,124,0.10)', color: '#A3907C', border: 'rgba(163,144,124,0.3)' },
  overbought: { bg: 'rgba(184,92,56,0.09)',   color: '#B85C38', border: 'rgba(184,92,56,0.28)' },
};

const PERIODS = [
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: '1y',  label: '1Y' },
];

function calcMA(candles, period) {
  const out = [];
  for (let i = period - 1; i < candles.length; i++) {
    const sum = candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0);
    out.push({ time: candles[i].time, value: parseFloat((sum / period).toFixed(3)) });
  }
  return out;
}

export default function ArtisanChart({ stockId }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef({});

  const [candles,    setCandles]    = useState([]);
  const [patterns,   setPatterns]   = useState([]);
  const [indicators, setIndicators] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [period,     setPeriod]     = useState('3mo');
  const [maOn,       setMaOn]       = useState({ ma5: false, ma20: true, ma60: false });

  // Fetch on stock / period change
  useEffect(() => {
    if (!stockId) return;
    setLoading(true);
    setCandles([]); setPatterns([]); setIndicators(null);
    axios.get(`${API}/api/v1/chart/candles/${stockId}?period=${period}`)
      .then(({ data }) => {
        setCandles(data.candles || []);
        setPatterns(data.ta_patterns || []);
        setIndicators(data.indicators || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stockId, period]);

  // Build / rebuild chart when candle data arrives
  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#F9F6F0' },
        textColor: '#B5ADA4',
        fontFamily: 'monospace',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#EDE9E2', style: 0 },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#EDE9E2' },
      timeScale:        { borderColor: '#EDE9E2', timeVisible: true },
      width:  containerRef.current.clientWidth,
      height: 340,
    });

    const candle = chart.addCandlestickSeries({
      upColor: '#B85C38', downColor: '#5C715E',
      borderUpColor: '#B85C38', borderDownColor: '#5C715E',
      wickUpColor: '#B85C38', wickDownColor: '#5C715E',
    });
    candle.setData(candles);

    const maSeries = {};
    MA_CFG.forEach(({ key, period: p, color }) => {
      const s = chart.addLineSeries({
        color, lineWidth: 1.5,
        priceLineVisible: false, lastValueVisible: false,
        visible: maOn[key],
      });
      s.setData(calcMA(candles, p));
      maSeries[key] = s;
    });

    chart.timeScale().fitContent();
    chartRef.current  = chart;
    seriesRef.current = maSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current)
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); };
  }, [candles]);

  // Toggle MA visibility without rebuilding
  useEffect(() => {
    Object.entries(maOn).forEach(([key, visible]) => {
      seriesRef.current[key]?.applyOptions({ visible });
    });
  }, [maOn]);

  const toggle = (key) => setMaOn(p => ({ ...p, [key]: !p[key] }));

  if (!stockId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', marginTop: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
    >
      {/* ── Header ── */}
      <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#B5ADA4', marginBottom: '10px' }}>
            職人 K 線畫布 · {stockId}
          </div>

          {/* Pattern badges */}
          {patterns.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {patterns.map((p, i) => {
                const s = BADGE[p.type] || BADGE.oversold;
                return (
                  <motion.span key={i}
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    style={{
                      fontSize: '12px', padding: '3px 11px',
                      background: s.bg, color: s.color,
                      border: `1px solid ${s.border}`,
                      borderRadius: '3px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                      fontFamily: "'Noto Serif TC', serif",
                    }}>
                    {p.label}
                  </motion.span>
                );
              })}
            </div>
          )}

          {/* Indicator pills */}
          {indicators && (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {[
                { label: 'RSI', value: indicators.rsi?.toFixed(1), warn: indicators.rsi < 30 || indicators.rsi > 70 },
                { label: 'MACD', value: indicators.macd_hist > 0 ? '↑' : '↓', warn: false },
                { label: 'MA20', value: indicators.ma20?.toFixed(0), warn: false },
              ].map(({ label, value, warn }) => (
                <div key={label} style={{ display: 'flex', gap: '5px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', letterSpacing: '1px', color: '#B5ADA4', textTransform: 'uppercase' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', color: warn ? '#B85C38' : '#857870' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls: period + MA toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {PERIODS.map(({ key, label }) => (
              <button key={key} onClick={() => setPeriod(key)}
                style={{
                  padding: '3px 9px', fontSize: '11px',
                  background: period === key ? '#3E3A39' : 'transparent',
                  color: period === key ? '#FFFFFF' : '#B5ADA4',
                  border: `1px solid ${period === key ? '#3E3A39' : '#EDE9E2'}`,
                  cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.2s',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* MA toggles */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {MA_CFG.map(({ key, label, color }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="checkbox" checked={maOn[key]} onChange={() => toggle(key)}
                  style={{ accentColor: color, width: 13, height: 13, cursor: 'pointer' }} />
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: maOn[key] ? '#3E3A39' : '#B5ADA4', transition: 'color 0.2s' }}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart canvas ── */}
      <div style={{ paddingTop: '12px' }}>
        {loading ? (
          <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B5ADA4', fontSize: '12px', fontFamily: 'monospace' }}>
            載入 K 線資料⋯
          </div>
        ) : (
          <div ref={containerRef} />
        )}
      </div>
    </motion.div>
  );
}
