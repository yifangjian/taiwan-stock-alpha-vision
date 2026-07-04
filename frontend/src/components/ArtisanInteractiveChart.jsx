/**
 * ArtisanInteractiveChart
 * ────────────────────────────────────────────────────────────────
 * lightweight-charts v4 · 職人山焙風 · 完整互動 K 線組件
 *
 * 功能：
 *  - CandlestickSeries（主 K 線）
 *  - HistogramSeries（成交量，漲跌對應紅綠色）
 *  - LineSeries × 2（5MA / 20MA）
 *  - 十字游標 + 浮動 OHLCV Tooltip
 *  - Pill 控制面板：即時 show/hide 各 Series，不重建圖表
 *  - ResizeObserver 全響應式
 *  - useEffect cleanup 確保 chart.remove() 防止 memory leak
 */

import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';

/* ════════════════════════════════════════════════════════════════
   Mock Data — 90 個交易日，台積電風格（起始約 855 元）
   props.candles 傳入時以外部資料優先
   ════════════════════════════════════════════════════════════════ */
const MOCK_CANDLES = (() => {
  const out = [];
  let close = 855;
  const base = new Date('2024-07-01');
  let offset = 0;

  while (out.length < 90) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset++);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // 跳過週末

    const body = (Math.random() - 0.46) * 13; // 微幅多頭偏移
    const open = +(close + (Math.random() - 0.5) * 3).toFixed(1);
    close      = +(open + body).toFixed(1);
    const top  = Math.max(open, close);
    const bot  = Math.min(open, close);

    out.push({
      time:   d.toISOString().split('T')[0], // 'YYYY-MM-DD'
      open,
      high:   +(top + Math.random() * 9 + 1).toFixed(1),
      low:    +(bot - Math.random() * 9 - 1).toFixed(1),
      close,
      volume: Math.round(3e6 + Math.random() * 8e6),
    });
  }
  return out;
})();

/* ════════════════════════════════════════════════════════════════
   Simple Moving Average
   ════════════════════════════════════════════════════════════════ */
function calcMA(data, n) {
  return data
    .map((d, i) => {
      if (i < n - 1) return null;
      const avg = data.slice(i - n + 1, i + 1).reduce((s, x) => s + x.close, 0) / n;
      return { time: d.time, value: +avg.toFixed(1) };
    })
    .filter(Boolean);
}

/* ════════════════════════════════════════════════════════════════
   Pill — 控制面板切換按鈕
   ════════════════════════════════════════════════════════════════ */
function Pill({ label, active, dotColor, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 13px', cursor: 'pointer',
        borderRadius: 20,
        border: `1px solid ${active ? 'rgba(163,144,124,0.38)' : '#EDE9E2'}`,
        background: active ? 'rgba(163,144,124,0.09)' : 'transparent',
        transition: 'border-color 0.18s, background 0.18s',
      }}
    >
      <span style={{
        display: 'block', width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: active ? dotColor : '#CFC9BF',
        transition: 'background 0.18s',
      }} />
      <span style={{
        fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.07em',
        color: active ? '#3E3A39' : '#B5ADA4', userSelect: 'none',
      }}>
        {label}
      </span>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════
   Tooltip — 浮動 OHLCV 資訊框
   ════════════════════════════════════════════════════════════════ */
function Tooltip({ tip }) {
  if (!tip) return null;

  const dateStr = typeof tip.time === 'string'
    ? tip.time
    : `${tip.time.year}-${String(tip.time.month).padStart(2, '0')}-${String(tip.time.day).padStart(2, '0')}`;

  const isUp   = tip.close >= tip.open;
  const accent = isUp ? '#B85C38' : '#5C715E';
  const rows   = [['開', tip.open], ['高', tip.high], ['低', tip.low], ['收', tip.close]];

  return (
    <div
      style={{
        position: 'absolute', top: 10, left: 10,
        zIndex: 9, pointerEvents: 'none',
        background: 'rgba(249,246,240,0.96)',
        border: '1px solid #EDE9E2',
        boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
        padding: '10px 16px',
        minWidth: 172,
      }}
    >
      {/* Date */}
      <div style={{
        fontFamily: 'monospace', fontSize: 10,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: '#B5ADA4', marginBottom: 8,
      }}>
        {dateStr}
      </div>

      {/* OHLC table */}
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {rows.map(([label, val]) => (
            <tr key={label}>
              <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#B5ADA4', paddingRight: 12, paddingBottom: 2 }}>
                {label}
              </td>
              <td style={{ fontFamily: 'monospace', fontSize: 12, color: accent, fontWeight: 600 }}>
                {typeof val === 'number' ? val.toFixed(1) : val}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Volume */}
      {tip.volume > 0 && (
        <div style={{
          marginTop: 8, paddingTop: 8, borderTop: '1px solid #F0ECE7',
          fontFamily: 'monospace', fontSize: 10, color: '#B5ADA4',
        }}>
          成交量&ensp;
          <span style={{ color: '#857870' }}>
            {(tip.volume / 10000).toFixed(1)} 萬股
          </span>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ArtisanInteractiveChart — 主組件
   ════════════════════════════════════════════════════════════════ */
export default function ArtisanInteractiveChart({
  candles: externalData = null,
  height  = 460,
}) {
  /* DOM ref（ResizeObserver 目標 + chart 容器） */
  const containerRef = useRef(null);

  /* lightweight-charts 實例 refs（不觸發 re-render） */
  const chartRef  = useRef(null);
  const candleRef = useRef(null);
  const volRef    = useRef(null);
  const ma5Ref    = useRef(null);
  const ma20Ref   = useRef(null);

  /* UI state */
  const [tip,     setTip]     = useState(null);  // crosshair tooltip data
  const [show5,   setShow5]   = useState(true);
  const [show20,  setShow20]  = useState(true);
  const [showVol, setShowVol] = useState(true);

  /* ──────────────────────────────────────────────────────────────
     Effect 1：圖表初始化
     依賴：externalData / height（通常只跑一次）
     ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const data = externalData?.length ? externalData : MOCK_CANDLES;

    /* ── 建立 chart 實例 ── */
    const chart = createChart(el, {
      width:  el.clientWidth || 720,
      height,
      layout: {
        background: { color: '#F9F6F0' },
        textColor:  '#857870',
        fontSize:   11,
      },
      grid: {
        vertLines: { color: 'rgba(237,233,226,0.65)' },
        horzLines: { color: 'rgba(237,233,226,0.65)' },
      },
      crosshair: {
        mode:     CrosshairMode.Normal,
        vertLine: { color: '#C5BDB5', labelBackgroundColor: '#3E3A39' },
        horzLine: { color: '#C5BDB5', labelBackgroundColor: '#3E3A39' },
      },
      rightPriceScale: { borderColor: '#EDE9E2' },
      timeScale: {
        borderColor:    '#EDE9E2',
        timeVisible:    true,
        secondsVisible: false,
      },
      /* 滾輪縮放 + 拖曳平移 */
      handleScroll: {
        mouseWheel:        true,
        pressedMouseMove:  true,
        horzTouchDrag:     true,
        vertTouchDrag:     false,
      },
      handleScale: {
        mouseWheel:            true,
        pinch:                 true,
        axisPressedMouseMove:  { time: true, price: true },
      },
    });
    chartRef.current = chart;

    /* ── CandlestickSeries ── */
    const cSeries = chart.addCandlestickSeries({
      upColor:         '#B85C38',  // 陶土紅 (陽線)
      downColor:       '#5C715E',  // 霧灰綠 (陰線)
      borderUpColor:   '#B85C38',
      borderDownColor: '#5C715E',
      wickUpColor:     '#B85C38',
      wickDownColor:   '#5C715E',
    });
    cSeries.setData(data);
    candleRef.current = cSeries;

    /* ── HistogramSeries (成交量) ── */
    const vSeries = chart.addHistogramSeries({
      priceFormat:  { type: 'volume' },
      priceScaleId: 'vol_scale',        // 命名獨立 Scale
    });
    chart.priceScale('vol_scale').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }, // 佔底部 20%
    });
    vSeries.setData(
      data.map(d => ({
        time:  d.time,
        value: d.volume,
        color: d.close >= d.open
          ? 'rgba(184,92,56,0.32)'   // 漲：陶土紅半透明
          : 'rgba(92,113,94,0.32)',  // 跌：霧灰綠半透明
      }))
    );
    volRef.current = vSeries;

    /* ── 5MA LineSeries ── */
    const m5 = chart.addLineSeries({
      color:                  'rgba(184,92,56,0.78)',
      lineWidth:              1,
      priceLineVisible:       false,
      lastValueVisible:       false,
      crosshairMarkerVisible: false,
    });
    m5.setData(calcMA(data, 5));
    ma5Ref.current = m5;

    /* ── 20MA LineSeries ── */
    const m20 = chart.addLineSeries({
      color:                  'rgba(163,144,124,0.88)',
      lineWidth:              1,
      priceLineVisible:       false,
      lastValueVisible:       false,
      crosshairMarkerVisible: false,
    });
    m20.setData(calcMA(data, 20));
    ma20Ref.current = m20;

    /* 自動適應全部資料 */
    chart.timeScale().fitContent();

    /* ── 十字游標訂閱 → tooltip state ── */
    chart.subscribeCrosshairMove(param => {
      if (
        !param.time ||
        !param.point ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        setTip(null);
        return;
      }
      const ohlc = param.seriesData.get(cSeries);
      const vol  = param.seriesData.get(vSeries);
      if (!ohlc) { setTip(null); return; }
      setTip({ ...ohlc, time: param.time, volume: vol?.value ?? 0 });
    });

    /* ── ResizeObserver：監聽容器寬度變化 ── */
    const ro = new ResizeObserver(([entry]) => {
      if (chartRef.current) {
        chartRef.current.applyOptions({ width: entry.contentRect.width });
      }
    });
    ro.observe(el);

    /* ── Cleanup：組件卸載時釋放資源 ── */
    return () => {
      ro.disconnect();
      chart.remove();           // 銷毀 canvas、取消所有監聽
      chartRef.current  = null;
      candleRef.current = null;
      volRef.current    = null;
      ma5Ref.current    = null;
      ma20Ref.current   = null;
    };
  // externalData/height 改變時重建圖表；其餘 toggle 透過 Effect 2/3/4 即時切換
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalData, height]);

  /* ──────────────────────────────────────────────────────────────
     Effect 2/3/4：Series 可見性切換
     透過 series.applyOptions({ visible }) 即時生效，不重建圖表
     ────────────────────────────────────────────────────────────── */
  useEffect(() => { ma5Ref.current?.applyOptions({ visible: show5 });   }, [show5]);
  useEffect(() => { ma20Ref.current?.applyOptions({ visible: show20 });  }, [show20]);
  useEffect(() => { volRef.current?.applyOptions({ visible: showVol }); }, [showVol]);

  /* ────────────────────────────────────────────────────────────── */

  return (
    <div style={{ width: '100%' }}>

      {/* ── 控制面板 ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 10, flexWrap: 'wrap',
      }}>
        <span style={{
          fontFamily: 'monospace', fontSize: 10,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#B5ADA4', marginRight: 4,
        }}>
          Overlay
        </span>

        <Pill
          label="5 MA"
          active={show5}
          dotColor="rgba(184,92,56,0.9)"
          onToggle={() => setShow5(v => !v)}
        />
        <Pill
          label="20 MA"
          active={show20}
          dotColor="rgba(163,144,124,0.95)"
          onToggle={() => setShow20(v => !v)}
        />
        <Pill
          label="Volume"
          active={showVol}
          dotColor="rgba(92,113,94,0.8)"
          onToggle={() => setShowVol(v => !v)}
        />

        <span style={{
          marginLeft: 'auto',
          fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.08em',
          color: '#CFC9BF',
        }}>
          滾輪縮放 · 拖曳平移
        </span>
      </div>

      {/* ── 圖表容器（相對定位，供 Tooltip 絕對定位） ── */}
      <div style={{ position: 'relative', width: '100%' }}>
        {/*
          lightweight-charts 在此 div 內部建立 canvas 元素。
          React 的 Tooltip 作為同層兄弟節點疊加於圖表之上。
        */}
        <div ref={containerRef} style={{ width: '100%', height }} />

        <Tooltip tip={tip} />
      </div>
    </div>
  );
}
