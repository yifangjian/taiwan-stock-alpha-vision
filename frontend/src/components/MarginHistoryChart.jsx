/**
 * MarginHistoryChart
 * 融資融券 60 天歷史走勢
 * 資料來源：FinMind TaiwanStockMarginPurchaseShortSale
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  ComposedChart, Area, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const LBL = {
  fontFamily: 'monospace', fontSize: 9, letterSpacing: 2,
  textTransform: 'uppercase', color: '#B5ADA4',
};

const TABS = ['融資餘額', '融券餘額', '融資買賣', '融券買賣'];

function fmtK(v) {
  if (v == null) return '—';
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}萬`;
  return v.toLocaleString();
}

function MgTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '10px 14px', minWidth: 160 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#B5ADA4', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, color: p.color || p.stroke, marginBottom: 2 }}>
          {p.name}：{fmtK(p.value)} 張
        </div>
      ))}
    </div>
  );
}

// ── Margin balance area chart ────────────────────────────────

function MarginBalanceChart({ history }) {
  if (!history?.length) return <Empty msg="無融資餘額資料" />;

  const last  = history[history.length - 1];
  const prev  = history[history.length - 2] || last;
  const chg   = last.margin_balance - prev.margin_balance;
  const trend = history.slice(-5).reduce((s, r) => s + (r.margin_balance - (history[history.indexOf(r) - 1]?.margin_balance || r.margin_balance)), 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { l: '當前融資餘額', v: `${fmtK(last.margin_balance)} 張`, c: '#B85C38' },
          { l: '較前日',       v: `${chg >= 0 ? '+' : ''}${fmtK(chg)} 張`, c: chg >= 0 ? '#B85C38' : '#5C715E' },
          { l: '近5日趨勢',   v: trend >= 0 ? '↑ 增加（偏多）' : '↓ 減少（偏空）', c: trend >= 0 ? '#B85C38' : '#5C715E' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: '#FAFAF8', border: '1px solid #EDE9E2', padding: '8px 14px' }}>
            <div style={{ ...LBL, fontSize: 8, marginBottom: 4 }}>{l}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={history} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE7" vertical={false} />
          <XAxis dataKey="date" tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false}
            interval={Math.floor(history.length / 8)} tickFormatter={d => d?.slice(5)} />
          <YAxis tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false}
            tickFormatter={v => fmtK(v)} />
          <Tooltip content={<MgTooltip />} />
          <Area type="monotone" dataKey="margin_balance" name="融資餘額"
            stroke="#B85C38" fill="rgba(184,92,56,0.1)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Short balance area chart ─────────────────────────────────

function ShortBalanceChart({ history }) {
  if (!history?.length) return <Empty msg="無融券餘額資料" />;

  const last = history[history.length - 1];
  const prev = history[history.length - 2] || last;
  const chg  = last.short_balance - prev.short_balance;

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { l: '當前融券餘額', v: `${fmtK(last.short_balance)} 張`, c: '#5C715E' },
          { l: '較前日',       v: `${chg >= 0 ? '+' : ''}${fmtK(chg)} 張`, c: chg >= 0 ? '#B85C38' : '#5C715E' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: '#FAFAF8', border: '1px solid #EDE9E2', padding: '8px 14px' }}>
            <div style={{ ...LBL, fontSize: 8, marginBottom: 4 }}>{l}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: c }}>{v}</div>
          </div>
        ))}
        <div style={{ background: '#FAFAF8', border: '1px solid #EDE9E2', padding: '8px 14px' }}>
          <div style={{ ...LBL, fontSize: 8, marginBottom: 4 }}>券資比（當日）</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#A3907C' }}>
            {last.margin_balance > 0 ? `${(last.short_balance / last.margin_balance * 100).toFixed(2)}%` : '—'}
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={history} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE7" vertical={false} />
          <XAxis dataKey="date" tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false}
            interval={Math.floor(history.length / 8)} tickFormatter={d => d?.slice(5)} />
          <YAxis tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false}
            tickFormatter={v => fmtK(v)} />
          <Tooltip content={<MgTooltip />} />
          <Area type="monotone" dataKey="short_balance" name="融券餘額"
            stroke="#5C715E" fill="rgba(92,113,94,0.12)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Margin buy/sell bar chart ─────────────────────────────────

function MarginFlowChart({ history, mode }) {
  if (!history?.length) return <Empty msg="無資料" />;

  const buyKey  = mode === 'margin' ? 'margin_buy'  : 'short_buy';
  const sellKey = mode === 'margin' ? 'margin_sell' : 'short_sell';
  const buyLbl  = mode === 'margin' ? '融資買進' : '融券買進';
  const sellLbl = mode === 'margin' ? '融資賣出' : '融券賣出';
  const buyClr  = mode === 'margin' ? '#B85C38' : '#5C715E';
  const sellClr = mode === 'margin' ? 'rgba(184,92,56,0.4)' : 'rgba(92,113,94,0.4)';

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={history} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE7" vertical={false} />
          <XAxis dataKey="date" tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false}
            interval={Math.floor(history.length / 8)} tickFormatter={d => d?.slice(5)} />
          <YAxis tick={{ fontFamily: 'monospace', fontSize: 9, fill: '#CFC9BF' }} tickLine={false} axisLine={false}
            tickFormatter={v => fmtK(v)} />
          <Tooltip content={<MgTooltip />} />
          <Bar dataKey={buyKey}  name={buyLbl}  fill={buyClr}  radius={[2, 2, 0, 0]} isAnimationActive={false} />
          <Bar dataKey={sellKey} name={sellLbl} fill={sellClr} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
        {[[buyClr, buyLbl], [sellClr, sellLbl]].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, background: c }} />
            <span style={{ ...LBL, fontSize: 8 }}>{l}（張）</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'monospace', fontSize: 12, color: '#CFC9BF' }}>
      {msg}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export default function MarginHistoryChart({ stockId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState(0);

  useEffect(() => {
    if (!stockId) return;
    setData(null);
    setLoading(true);
    axios.get(`${API}/api/v1/stock/margin-history/${stockId}`)
      .then(r => { if (r.data?.status === 'success') setData(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stockId]);

  if (loading) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '32px 24px', textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#CFC9BF' }}>載入融資融券資料中…</div>
      </div>
    );
  }

  if (!data?.history?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 24 }}
    >
      <div style={{ ...LBL, fontSize: 10, letterSpacing: 2, marginBottom: 14 }}>
        融資融券籌碼 · Margin Trading
        <span style={{ marginLeft: 8, color: '#CFC9BF', fontSize: 9 }}>（近 60 個交易日）</span>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #EDE9E2' }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              flex: 1, padding: '11px 0', background: 'none', border: 'none',
              borderBottom: tab === i ? '2px solid #B85C38' : '2px solid transparent',
              fontFamily: 'monospace', fontSize: 11,
              color: tab === i ? '#3E3A39' : '#B5ADA4',
              cursor: 'pointer', transition: 'color 0.2s',
            }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 20px 16px' }}>
          {tab === 0 && <MarginBalanceChart history={data.history} />}
          {tab === 1 && <ShortBalanceChart  history={data.history} />}
          {tab === 2 && <MarginFlowChart    history={data.history} mode="margin" />}
          {tab === 3 && <MarginFlowChart    history={data.history} mode="short"  />}
        </div>
      </div>
    </motion.div>
  );
}
