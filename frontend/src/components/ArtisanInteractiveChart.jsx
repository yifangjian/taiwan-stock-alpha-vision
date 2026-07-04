/**
 * ArtisanInteractiveChart v2
 * ─────────────────────────────────────────────────────
 * lightweight-charts v4 · 職人山焙風
 *
 * 功能：
 *  - 期間選擇器：1M / 3M / 6M / 1Y / 2Y
 *  - CandlestickSeries + MA5 / MA20 / MA60（可切換）
 *  - HistogramSeries（成交量，漲跌對應紅綠）
 *  - 技術指標子圖：RSI(14) | MACD(12,26,9) | KD(9,3,3)
 *  - 主子圖時間軸雙向同步（拖曳/縮放聯動）
 *  - 浮動 OHLCV Tooltip
 *  - ResizeObserver 全響應式
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ── Indicator math ────────────────────────────────────────────────

function calcMA(data, n) {
  return data.map((d, i) => {
    if (i < n - 1) return null;
    const avg = data.slice(i - n + 1, i + 1).reduce((s, x) => s + x.close, 0) / n;
    return { time: d.time, value: +avg.toFixed(2) };
  }).filter(Boolean);
}

function calcRSI(data, n = 14) {
  const out = [];
  if (data.length < n + 1) return out;
  let ag = 0, al = 0;
  for (let i = 1; i <= n; i++) {
    const d = data[i].close - data[i - 1].close;
    if (d > 0) ag += d; else al -= d;
  }
  ag /= n; al /= n;
  for (let i = n; i < data.length; i++) {
    if (i > n) {
      const d = data[i].close - data[i - 1].close;
      ag = (ag * (n - 1) + (d > 0 ? d : 0)) / n;
      al = (al * (n - 1) + (d < 0 ? -d : 0)) / n;
    }
    const rs = al === 0 ? 100 : ag / al;
    out.push({ time: data[i].time, value: +(100 - 100 / (1 + rs)).toFixed(2) });
  }
  return out;
}

function calcMACD(data, fast = 12, slow = 26, sigN = 9) {
  const k12 = 2 / (fast + 1), k26 = 2 / (slow + 1), ks = 2 / (sigN + 1);
  let e12 = null, e26 = null, sv = null;
  const macdArr = [], sigArr = [], hist = [];

  data.forEach((d, i) => {
    e12 = e12 === null ? d.close : d.close * k12 + e12 * (1 - k12);
    e26 = e26 === null ? d.close : d.close * k26 + e26 * (1 - k26);
    if (i < slow - 1) return;
    const mv = +(e12 - e26).toFixed(3);
    sv = sv === null ? mv : mv * ks + sv * (1 - ks);
    const hv = +(mv - sv).toFixed(3);
    macdArr.push({ time: d.time, value: mv });
    sigArr.push({ time: d.time, value: +sv.toFixed(3) });
    hist.push({ time: d.time, value: hv, color: hv >= 0 ? 'rgba(184,92,56,0.65)' : 'rgba(92,113,94,0.65)' });
  });
  return { macdLine: macdArr, signalLine: sigArr, histogram: hist };
}

function calcKD(data, n = 9) {
  const out = [];
  let K = 50, D = 50;
  for (let i = n - 1; i < data.length; i++) {
    const sl = data.slice(i - n + 1, i + 1);
    const hi = Math.max(...sl.map(d => d.high));
    const lo = Math.min(...sl.map(d => d.low));
    const RSV = hi === lo ? 50 : (data[i].close - lo) / (hi - lo) * 100;
    K = (1 / 3) * RSV + (2 / 3) * K;
    D = (1 / 3) * K   + (2 / 3) * D;
    out.push({ time: data[i].time, K: +K.toFixed(2), D: +D.toFixed(2) });
  }
  return out;
}

// ── Chart theme ───────────────────────────────────────────────────

const THEME = {
  layout:    { background: { color: '#F9F6F0' }, textColor: '#857870', fontSize: 11 },
  grid:      { vertLines: { color: 'rgba(237,233,226,0.6)' }, horzLines: { color: 'rgba(237,233,226,0.6)' } },
  crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#C5BDB5', labelBackgroundColor: '#3E3A39' }, horzLine: { color: '#C5BDB5', labelBackgroundColor: '#3E3A39' } },
  rightPriceScale: { borderColor: '#EDE9E2' },
  timeScale: { borderColor: '#EDE9E2', timeVisible: true, secondsVisible: false },
  handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
  handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: true } },
};

// ── Pill toggle ───────────────────────────────────────────────────

function Pill({ label, active, color, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '4px 11px', cursor: 'pointer', borderRadius: 20,
      border: `1px solid ${active ? 'rgba(163,144,124,0.35)' : '#EDE9E2'}`,
      background: active ? 'rgba(163,144,124,0.08)' : 'transparent',
      transition: 'all 0.18s',
    }}>
      <span style={{ display: 'block', width: 6, height: 6, borderRadius: '50%', background: active ? color : '#CFC9BF', transition: 'background 0.18s' }} />
      <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.07em', color: active ? '#3E3A39' : '#B5ADA4', userSelect: 'none' }}>
        {label}
      </span>
    </button>
  );
}

// ── OHLCV Tooltip ─────────────────────────────────────────────────

function Tooltip({ tip }) {
  if (!tip) return null;
  const dateStr = typeof tip.time === 'string' ? tip.time
    : `${tip.time.year}-${String(tip.time.month).padStart(2, '0')}-${String(tip.time.day).padStart(2, '0')}`;
  const isUp   = tip.close >= tip.open;
  const accent = isUp ? '#B85C38' : '#5C715E';
  return (
    <div style={{
      position: 'absolute', top: 10, left: 10, zIndex: 9, pointerEvents: 'none',
      background: 'rgba(249,246,240,0.96)', border: '1px solid #EDE9E2',
      boxShadow: '0 4px 20px rgba(0,0,0,0.07)', padding: '10px 14px', minWidth: 160,
    }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 7 }}>
        {dateStr}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {[['開', tip.open], ['高', tip.high], ['低', tip.low], ['收', tip.close]].map(([l, v]) => (
            <tr key={l}>
              <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#B5ADA4', paddingRight: 10, paddingBottom: 2 }}>{l}</td>
              <td style={{ fontFamily: 'monospace', fontSize: 11, color: accent, fontWeight: 600 }}>
                {typeof v === 'number' ? v.toFixed(2) : v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tip.volume > 0 && (
        <div style={{ marginTop: 7, paddingTop: 7, borderTop: '1px solid #F0ECE7', fontFamily: 'monospace', fontSize: 10, color: '#B5ADA4' }}>
          量&ensp;<span style={{ color: '#857870' }}>{(tip.volume / 1000).toFixed(0)} 張</span>
        </div>
      )}
    </div>
  );
}

// ── Period & indicator tabs ───────────────────────────────────────

const PERIODS = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y'  },
  { label: '2Y', value: '2y'  },
];

const INDICATORS = ['RSI', 'MACD', 'KD'];

// ── Main component ────────────────────────────────────────────────

export default function ArtisanInteractiveChart({ stockId }) {
  const mainRef = useRef(null);   // DOM container for main chart
  const subRef  = useRef(null);   // DOM container for sub chart

  const mainChart = useRef(null);
  const subChart  = useRef(null);
  const syncing   = useRef(false);

  // series refs
  const rCandle = useRef(null);
  const rVol    = useRef(null);
  const rMa5    = useRef(null);
  const rMa20   = useRef(null);
  const rMa60   = useRef(null);

  const [candles,    setCandles]    = useState([]);
  const [period,     setPeriod]     = useState('3mo');
  const [indicator,  setIndicator]  = useState('RSI');
  const [loading,    setLoading]    = useState(false);
  const [tip,        setTip]        = useState(null);
  const [show5,      setShow5]      = useState(true);
  const [show20,     setShow20]     = useState(true);
  const [show60,     setShow60]     = useState(false);
  const [showVol,    setShowVol]    = useState(true);

  // ── Derived price stats from candles ──
  const lastClose = candles.length ? candles[candles.length - 1].close : null;
  const prevClose = candles.length > 1 ? candles[candles.length - 2].close : null;
  const priceChg  = lastClose && prevClose ? +(lastClose - prevClose).toFixed(2) : null;
  const pricePct  = lastClose && prevClose ? +((lastClose - prevClose) / prevClose * 100).toFixed(2) : null;
  const priceColor = priceChg === null ? '#857870' : priceChg >= 0 ? '#B85C38' : '#5C715E';

  // ── Fetch candles ──────────────────────────────────────────────
  useEffect(() => {
    if (!stockId) return;
    setLoading(true);
    axios.get(`${API}/api/v1/chart/candles/${stockId}`, { params: { period } })
      .then(r => setCandles(r.data.candles ?? []))
      .catch(() => setCandles([]))
      .finally(() => setLoading(false));
  }, [stockId, period]);

  // ── Build / rebuild main chart ─────────────────────────────────
  useEffect(() => {
    const el = mainRef.current;
    if (!el || !candles.length) return;

    // Destroy old
    if (mainChart.current) { mainChart.current.remove(); mainChart.current = null; }

    const chart = createChart(el, { ...THEME, width: el.clientWidth || 800, height: 340 });
    mainChart.current = chart;

    // Candlestick
    const cs = chart.addCandlestickSeries({
      upColor: '#B85C38', downColor: '#5C715E',
      borderUpColor: '#B85C38', borderDownColor: '#5C715E',
      wickUpColor: '#B85C38', wickDownColor: '#5C715E',
    });
    cs.setData(candles);
    rCandle.current = cs;

    // Volume
    const vs = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    vs.setData(candles.map(d => ({
      time: d.time, value: d.volume,
      color: d.close >= d.open ? 'rgba(184,92,56,0.3)' : 'rgba(92,113,94,0.3)',
    })));
    rVol.current = vs;

    // MA lines
    const makeMA = (n, color) => {
      const s = chart.addLineSeries({ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      s.setData(calcMA(candles, n));
      return s;
    };
    rMa5.current  = makeMA(5,  'rgba(184,92,56,0.82)');
    rMa20.current = makeMA(20, 'rgba(163,144,124,0.9)');
    rMa60.current = makeMA(60, 'rgba(74,155,111,0.82)');

    // Apply current visibility
    rMa5.current.applyOptions({ visible: show5 });
    rMa20.current.applyOptions({ visible: show20 });
    rMa60.current.applyOptions({ visible: show60 });
    rVol.current.applyOptions({ visible: showVol });

    chart.timeScale().fitContent();

    // Tooltip
    chart.subscribeCrosshairMove(param => {
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) { setTip(null); return; }
      const ohlc = param.seriesData.get(cs);
      const vol  = param.seriesData.get(vs);
      if (!ohlc) { setTip(null); return; }
      setTip({ ...ohlc, time: param.time, volume: vol?.value ?? 0 });
    });

    // Resize observer
    const ro = new ResizeObserver(([e]) => {
      mainChart.current?.applyOptions({ width: e.contentRect.width });
      subChart.current?.applyOptions({ width: e.contentRect.width });
    });
    ro.observe(el);

    // Time sync: main → sub
    chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (syncing.current || !range || !subChart.current) return;
      syncing.current = true;
      subChart.current.timeScale().setVisibleLogicalRange(range);
      syncing.current = false;
    });

    return () => { ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles]);

  // ── Build / rebuild sub indicator chart ───────────────────────
  useEffect(() => {
    const el = subRef.current;
    if (!el || !candles.length) return;

    if (subChart.current) { subChart.current.remove(); subChart.current = null; }

    const chart = createChart(el, {
      ...THEME,
      width: el.clientWidth || 800,
      height: 130,
      timeScale: { ...THEME.timeScale, visible: false }, // hide time axis (shared with main)
    });
    subChart.current = chart;

    if (indicator === 'RSI') {
      const rsi = calcRSI(candles);
      const s = chart.addLineSeries({ color: '#A3907C', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
      s.setData(rsi);
      s.createPriceLine({ price: 70, color: 'rgba(184,92,56,0.5)',  lineWidth: 1, lineStyle: 2 });
      s.createPriceLine({ price: 50, color: 'rgba(181,173,164,0.4)', lineWidth: 1, lineStyle: 2 });
      s.createPriceLine({ price: 30, color: 'rgba(74,155,111,0.5)', lineWidth: 1, lineStyle: 2 });
      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
    }

    if (indicator === 'MACD') {
      const { macdLine, signalLine, histogram } = calcMACD(candles);
      const hist = chart.addHistogramSeries({ priceScaleId: 'right', lastValueVisible: false });
      hist.setData(histogram);
      const ml = chart.addLineSeries({ color: '#B85C38', lineWidth: 1.2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
      ml.setData(macdLine);
      const sl = chart.addLineSeries({ color: '#A3907C', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      sl.setData(signalLine);
      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.15, bottom: 0.15 } });
    }

    if (indicator === 'KD') {
      const kd = calcKD(candles);
      const kLine = chart.addLineSeries({ color: '#B85C38', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
      kLine.setData(kd.map(d => ({ time: d.time, value: d.K })));
      const dLine = chart.addLineSeries({ color: '#A3907C', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
      dLine.setData(kd.map(d => ({ time: d.time, value: d.D })));
      kLine.createPriceLine({ price: 80, color: 'rgba(184,92,56,0.5)',  lineWidth: 1, lineStyle: 2 });
      kLine.createPriceLine({ price: 20, color: 'rgba(74,155,111,0.5)', lineWidth: 1, lineStyle: 2 });
      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
    }

    chart.timeScale().fitContent();

    // Sync sub → main
    chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (syncing.current || !range || !mainChart.current) return;
      syncing.current = true;
      mainChart.current.timeScale().setVisibleLogicalRange(range);
      syncing.current = false;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, indicator]);

  // ── Overlay visibility ─────────────────────────────────────────
  useEffect(() => { rMa5.current?.applyOptions({ visible: show5 });   }, [show5]);
  useEffect(() => { rMa20.current?.applyOptions({ visible: show20 });  }, [show20]);
  useEffect(() => { rMa60.current?.applyOptions({ visible: show60 });  }, [show60]);
  useEffect(() => { rVol.current?.applyOptions({ visible: showVol }); }, [showVol]);

  // ── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      mainChart.current?.remove();
      subChart.current?.remove();
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%' }}>

      {/* Price header */}
      {lastClose && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
          <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 28, fontWeight: 300, color: priceColor }}>
            {lastClose.toFixed(2)}
          </span>
          {priceChg !== null && (
            <span style={{ fontFamily: 'monospace', fontSize: 13, color: priceColor }}>
              {priceChg >= 0 ? '+' : ''}{priceChg} ({pricePct >= 0 ? '+' : ''}{pricePct}%)
            </span>
          )}
        </div>
      )}

      {/* Period selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            style={{
              padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace',
              background: period === p.value ? '#3E3A39' : 'transparent',
              color: period === p.value ? '#F9F6F0' : '#B5ADA4',
              border: period === p.value ? '1px solid #3E3A39' : '1px solid #EDE9E2',
              transition: 'all 0.18s',
            }}
          >
            {p.label}
          </button>
        ))}
        {loading && (
          <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 10, color: '#CFC9BF' }}>載入中⋯</span>
        )}
      </div>

      {/* MA overlay pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#CFC9BF', marginRight: 2 }}>Overlay</span>
        <Pill label="MA5"  active={show5}   color="rgba(184,92,56,0.9)"  onToggle={() => setShow5(v => !v)} />
        <Pill label="MA20" active={show20}  color="rgba(163,144,124,0.95)" onToggle={() => setShow20(v => !v)} />
        <Pill label="MA60" active={show60}  color="rgba(74,155,111,0.9)" onToggle={() => setShow60(v => !v)} />
        <Pill label="量"   active={showVol} color="rgba(92,113,94,0.8)"  onToggle={() => setShowVol(v => !v)} />
        <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.07em', color: '#CFC9BF' }}>
          滾輪縮放 · 拖曳平移
        </span>
      </div>

      {/* Main chart */}
      <div style={{ position: 'relative', width: '100%' }}>
        <div ref={mainRef} style={{ width: '100%' }} />
        <Tooltip tip={tip} />
      </div>

      {/* Indicator sub-chart */}
      <div style={{ marginTop: 1 }}>
        {/* Indicator tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #EDE9E2', marginBottom: 0 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: '#CFC9BF', textTransform: 'uppercase', padding: '6px 10px', alignSelf: 'center' }}>
            指標
          </span>
          {INDICATORS.map(ind => (
            <button key={ind} onClick={() => setIndicator(ind)}
              style={{
                padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'monospace', fontSize: 11,
                color: indicator === ind ? '#3E3A39' : '#B5ADA4',
                borderBottom: indicator === ind ? '2px solid #B85C38' : '2px solid transparent',
                transition: 'all 0.18s', marginBottom: -1,
              }}
            >
              {ind}
            </button>
          ))}
          {/* Indicator legend */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px' }}>
            {indicator === 'RSI' && (
              <>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(184,92,56,0.7)' }}>70 超買</span>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(74,155,111,0.7)' }}>30 超賣</span>
              </>
            )}
            {indicator === 'MACD' && (
              <>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#B85C38' }}>MACD</span>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#A3907C' }}>Signal</span>
              </>
            )}
            {indicator === 'KD' && (
              <>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#B85C38' }}>K</span>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#A3907C' }}>D</span>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(184,92,56,0.6)' }}>80 超買</span>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(74,155,111,0.6)' }}>20 超賣</span>
              </>
            )}
          </div>
        </div>

        <div ref={subRef} style={{ width: '100%' }} />
      </div>
    </div>
  );
}
