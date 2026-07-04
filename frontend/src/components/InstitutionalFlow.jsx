/**
 * InstitutionalFlow
 * 三大法人買賣超（外資 / 投信 / 自營商）+ 週轉率
 * 資料來源：FinMind TaiwanStockInstitutionalInvestorsBuySell + yfinance
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
  LineChart,
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const LBL = {
  fontFamily: 'monospace', fontSize: 9, letterSpacing: 2,
  textTransform: 'uppercase', color: '#B5ADA4',
};

const TABS = [
  { key: 'foreign', label: '外資',  barColor: '#B85C38', lineColor: '#8B3A20', cumKey: 'foreign_cum' },
  { key: 'trust',   label: '投信',  barColor: '#5C715E', lineColor: '#3A5040', cumKey: 'trust_cum'   },
  { key: 'dealer',  label: '自營商', barColor: '#8B6F5C', lineColor: '#6B4F3C', cumKey: 'dealer_cum'  },
  { key: 'turnover',label: '週轉率', barColor: null,      lineColor: '#A3907C', cumKey: null          },
];

function fmtKilo(v) {
  if (v == null) return '—';
  const abs = Math.abs(v);
  if (abs >= 10000) return `${(v / 10000).toFixed(1)}萬`;
  return v.toLocaleString();
}

// ── Custom Tooltip ─────────────────────────────────────────────

function InstTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '10px 14px', minWidth: 140 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#B5ADA4', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, color: p.color, marginBottom: 2 }}>
          {p.name}：{typeof p.value === 'number'
            ? (p.name.includes('轉率') ? `${p.value.toFixed(2)}%` : fmtKilo(p.value) + ' 張')
            : p.value}
        </div>
      ))}
    </div>
  );
}

function TurnoverTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '10px 14px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#B5ADA4', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#A3907C' }}>
        週轉率：{payload[0]?.value?.toFixed(4)}%
      </div>
    </div>
  );
}

// ── Institutional bar+line chart ──────────────────────────────

function InstChart({ data, tabCfg }) {
  if (!data?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: 'monospace', fontSize: 12, color: '#CFC9BF' }}>
        無{tabCfg.label}買賣超資料（ETF 類投信持股較少屬正常）
      </div>
    );
  }

  // Net buy/sell summary
  const lastRow = data[data.length - 1] || {};
  const total   = data.reduce((s, r) => s + (r[tabCfg.key] || 0), 0);

  return (
    <div>
      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { l: '近60日累計買賣超', v: `${total >= 0 ? '+' : ''}${fmtKilo(total)} 張`, c: total >= 0 ? '#B85C38' : '#5C715E' },
          { l: '最後一日',         v: `${lastRow[tabCfg.key] >= 0 ? '+' : ''}${fmtKilo(lastRow[tabCfg.key])} 張`, c: (lastRow[tabCfg.key] || 0) >= 0 ? '#B85C38' : '#5C715E' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: '#FAFAF8', border: '1px solid #EDE9E2', padding: '8px 14px' }}>
            <div style={{ ...LBL, fontSize: 8, marginBottom: 4 }}>{l}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 14, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 48, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE7" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }}
            tickLine={false} axisLine={false}
            interval={Math.floor(data.length / 8)}
            tickFormatter={d => d?.slice(5)}
          />
          {/* Left axis: daily diff */}
          <YAxis
            yAxisId="bar"
            tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }}
            tickLine={false} axisLine={false}
            tickFormatter={v => fmtKilo(v)}
          />
          {/* Right axis: cumulative */}
          <YAxis
            yAxisId="cum"
            orientation="right"
            tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }}
            tickLine={false} axisLine={false}
            tickFormatter={v => fmtKilo(v)}
          />
          <Tooltip content={<InstTooltip />} />
          <ReferenceLine yAxisId="bar" y={0} stroke="#EDE9E2" />
          <Bar
            yAxisId="bar"
            dataKey={tabCfg.key}
            name="日買賣超"
            radius={[2, 2, 0, 0]}
            fill={tabCfg.barColor}
            isAnimationActive={false}
            // Per-bar coloring: positive = warm, negative = cool
            label={false}
          >
            {data.map((entry, i) => {
              const v = entry[tabCfg.key] || 0;
              return <rect key={i} fill={v >= 0 ? tabCfg.barColor : tabCfg.barColor + '66'} />;
            })}
          </Bar>
          <Line
            yAxisId="cum"
            type="monotone"
            dataKey={tabCfg.cumKey}
            name="累計買賣超"
            stroke={tabCfg.lineColor}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        {[
          [tabCfg.barColor, '日買賣超（張，左軸）'],
          [tabCfg.lineColor, '累計買賣超（張，右軸）'],
        ].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 3, background: c }} />
            <span style={{ ...LBL, fontSize: 8 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Turnover rate chart ────────────────────────────────────────

function TurnoverChart({ data }) {
  if (!data?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: 'monospace', fontSize: 12, color: '#CFC9BF' }}>
        無週轉率資料
      </div>
    );
  }

  // 5-day MA
  const withMA = data.map((d, i) => {
    if (i < 4) return { ...d, ma5: null };
    const slice = data.slice(i - 4, i + 1).map(x => x.rate);
    return { ...d, ma5: +(slice.reduce((a, b) => a + b, 0) / 5).toFixed(4) };
  });

  const avgRate = +(data.reduce((s, d) => s + d.rate, 0) / data.length).toFixed(4);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ background: '#FAFAF8', border: '1px solid #EDE9E2', padding: '8px 14px' }}>
          <div style={{ ...LBL, fontSize: 8, marginBottom: 4 }}>近60日均值</div>
          <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#A3907C' }}>{avgRate}%</div>
        </div>
        <div style={{ background: '#FAFAF8', border: '1px solid #EDE9E2', padding: '8px 14px' }}>
          <div style={{ ...LBL, fontSize: 8, marginBottom: 4 }}>最後一日</div>
          <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#3E3A39' }}>{data[data.length - 1]?.rate?.toFixed(4)}%</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={withMA} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE7" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }}
            tickLine={false} axisLine={false}
            interval={Math.floor(data.length / 8)}
            tickFormatter={d => d?.slice(5)}
          />
          <YAxis
            tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }}
            tickLine={false} axisLine={false}
            unit="%"
          />
          <Tooltip content={<TurnoverTooltip />} />
          <Line type="monotone" dataKey="rate" name="週轉率" stroke="#C4A882" dot={false} strokeWidth={1} isAnimationActive={false} />
          <Line type="monotone" dataKey="ma5"  name="MA5"   stroke="#A3907C" dot={false} strokeWidth={2} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        {[['#C4A882', '日週轉率'], ['#A3907C', '5日均週轉率']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 16, height: 2, background: c }} />
            <span style={{ ...LBL, fontSize: 8 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export default function InstitutionalFlow({ stockId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState(0);

  useEffect(() => {
    if (!stockId) return;
    setData(null);
    setLoading(true);
    axios.get(`${API}/api/v1/stock/flow/${stockId}`)
      .then(r => { if (r.data?.status === 'success') setData(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stockId]);

  if (loading) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '32px 24px', textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#CFC9BF' }}>載入三大法人資料中…</div>
      </div>
    );
  }

  if (!data) return null;

  const activeTab = TABS[tab];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 24 }}
    >
      <div style={{ ...LBL, fontSize: 10, letterSpacing: 2, marginBottom: 14 }}>
        三大法人籌碼 · Institutional Flow
        <span style={{ marginLeft: 8, color: '#CFC9BF', fontSize: 9 }}>（近 60 個交易日）</span>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #EDE9E2' }}>
          {TABS.map((t, i) => (
            <button key={t.key} onClick={() => setTab(i)} style={{
              flex: 1, padding: '11px 0', background: 'none', border: 'none',
              borderBottom: tab === i ? `2px solid ${t.lineColor || '#A3907C'}` : '2px solid transparent',
              fontFamily: 'monospace', fontSize: 11,
              color: tab === i ? '#3E3A39' : '#B5ADA4',
              cursor: 'pointer', transition: 'color 0.2s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 20px 16px' }}>
          {tab < 3 ? (
            <InstChart data={data.institutional} tabCfg={activeTab} />
          ) : (
            <TurnoverChart data={data.turnover} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
