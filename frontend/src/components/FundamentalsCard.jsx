/**
 * FundamentalsCard
 * 基本面資料：EPS / 月營收 / 股利 / 財務比率
 * 資料來源：FinMind API（3 年歷史，每日 1000 次免費）
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const LBL = {
  fontFamily: 'monospace', fontSize: 9, letterSpacing: 2,
  textTransform: 'uppercase', color: '#B5ADA4',
};

const TABS = ['EPS', '月營收', '股利', '財務比率'];

// ── Custom Tooltip ─────────────────────────────────────────────────

function FmTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '10px 14px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#B5ADA4', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}{unit}
        </div>
      ))}
    </div>
  );
}

// ── EPS tab ────────────────────────────────────────────────────────

function EpsChart({ financials }) {
  const data = financials?.EPS || [];
  if (!data.length) return <Empty msg="無 EPS 資料（ETF 或資料未取得）" />;

  const colored = data.map(d => ({ ...d, fill: d.value >= 0 ? '#B85C38' : '#5C715E' }));

  return (
    <div>
      <SectionTitle>EPS 季報（元）</SectionTitle>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={colored} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE7" vertical={false} />
          <XAxis dataKey="date" tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false} interval={3} />
          <YAxis tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false} />
          <Tooltip content={<FmTooltip unit=" 元" />} />
          <ReferenceLine y={0} stroke="#EDE9E2" />
          <Bar dataKey="value" name="EPS" radius={[2, 2, 0, 0]}>
            {colored.map((entry, i) => (
              <rect key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Revenue tab ────────────────────────────────────────────────────

function RevenueChart({ revenue }) {
  if (!revenue?.length) return <Empty msg="無月營收資料" />;

  const fmtRevenue = revenue.map(r => ({
    ...r,
    rev_b: +(r.revenue / 1e8).toFixed(2),
  }));

  return (
    <div>
      <SectionTitle>月營收（億元，近 24 個月）</SectionTitle>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={fmtRevenue} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE7" vertical={false} />
          <XAxis dataKey="date" tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false} interval={5} />
          <YAxis tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false} />
          <Tooltip content={<FmTooltip unit=" 億" />} />
          <Bar dataKey="rev_b" name="月營收" fill="#C4A882" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Dividend tab ───────────────────────────────────────────────────

function DividendChart({ dividends }) {
  if (!dividends?.length) return <Empty msg="無股利資料" />;

  return (
    <div>
      <SectionTitle>歷年股利（元）</SectionTitle>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={dividends} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE7" vertical={false} />
          <XAxis dataKey="year" tick={{ fontFamily: 'monospace', fontSize: 10, fill: '#CFC9BF' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false} />
          <Tooltip content={<FmTooltip unit=" 元" />} />
          <Bar dataKey="cash"  name="現金股利" fill="#B85C38" radius={[2, 2, 0, 0]} stackId="a" />
          <Bar dataKey="stock" name="股票股利" fill="#C4A882" radius={[2, 2, 0, 0]} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        {[['#B85C38','現金股利'], ['#C4A882','股票股利']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, background: c }} />
            <span style={{ ...LBL, fontSize: 9 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ratio tab ─────────────────────────────────────────────────────

function RatioChart({ financials }) {
  const ratioKeys = ['毛利率','營業利益率','稅後淨利率'];
  const colors    = ['#5C715E','#B85C38','#C4A882'];

  // Merge all ratios onto the same date axis
  const byDate = {};
  ratioKeys.forEach(k => {
    (financials?.[k] || []).forEach(({ date, value }) => {
      if (!byDate[date]) byDate[date] = { date };
      byDate[date][k] = value;
    });
  });
  const data = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

  if (!data.length) return <Empty msg="無財務比率資料（ETF 類不適用）" />;

  return (
    <div>
      <SectionTitle>財務比率（%，近 3 年）</SectionTitle>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE7" vertical={false} />
          <XAxis dataKey="date" tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false} interval={3} />
          <YAxis tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false} unit="%" />
          <Tooltip content={<FmTooltip unit="%" />} />
          {ratioKeys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={colors[i]} dot={false} strokeWidth={1.5} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
        {ratioKeys.map((k, i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 16, height: 2, background: colors[i] }} />
            <span style={{ ...LBL, fontSize: 9 }}>{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return <div style={{ ...LBL, fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>{children}</div>;
}

function Empty({ msg }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'monospace', fontSize: 12, color: '#CFC9BF' }}>
      {msg}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export default function FundamentalsCard({ stockId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState(0);

  useEffect(() => {
    if (!stockId) return;
    setData(null);
    setLoading(true);
    axios.get(`${API}/api/v1/stock/fundamentals/${stockId}`)
      .then(r => { if (r.data?.status === 'success') setData(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stockId]);

  if (loading) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '32px 24px', textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#CFC9BF' }}>載入基本面資料中…</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      style={{ marginBottom: 24 }}
    >
      {/* Section label */}
      <div style={{ ...LBL, fontSize: 10, letterSpacing: 2, marginBottom: 14 }}>
        基本面資料 · Fundamentals
        <span style={{ marginLeft: 8, color: '#CFC9BF', fontSize: 9 }}>（FinMind API · 近 3 年）</span>
      </div>

      {/* Card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #EDE9E2' }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              flex: 1, padding: '11px 0', background: 'none', border: 'none',
              borderBottom: tab === i ? '2px solid #8B6F5C' : '2px solid transparent',
              fontFamily: 'monospace', fontSize: 11,
              color: tab === i ? '#3E3A39' : '#B5ADA4',
              cursor: 'pointer', transition: 'color 0.2s',
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 20px 16px' }}>
          {tab === 0 && <EpsChart     financials={data.financials} />}
          {tab === 1 && <RevenueChart revenue={data.revenue} />}
          {tab === 2 && <DividendChart dividends={data.dividends} />}
          {tab === 3 && <RatioChart   financials={data.financials} />}
        </div>
      </div>
    </motion.div>
  );
}
