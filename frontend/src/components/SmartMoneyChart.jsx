import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts';

const C = {
  axis:    '#CFC9BF',
  tick:    { fill: '#B5ADA4', fontSize: 11 },
  tip:     { backgroundColor: '#FFF', border: '1px solid #EDE9E2', color: '#3E3A39', fontSize: 13 },
  accent:  '#A3907C',
  terra:   '#B85C38',
};

const TAG_COLOR = {
  '在成本帶上方': { bg: 'rgba(74,155,111,0.08)', color: '#4A9B6F', border: 'rgba(74,155,111,0.25)' },
  '在成本帶下方': { bg: 'rgba(192,57,43,0.07)',  color: '#C0392B', border: 'rgba(192,57,43,0.2)' },
  default:       { bg: 'rgba(163,144,124,0.1)',  color: '#A3907C', border: 'rgba(163,144,124,0.3)' },
};

export default function SmartMoneyChart({ data }) {
  if (!data) return null;

  const {
    stock_id, current_price, smart_money_cost,
    cost_low, cost_high, price_vs_cost_pct,
    above_cost, chart_data, ai_conclusion, days_analyzed,
  } = data;

  const posLabel = above_cost ? '在成本帶上方' : '在成本帶下方';
  const tag      = TAG_COLOR[posLabel] || TAG_COLOR.default;

  const allValues = chart_data.map(d => d.close);
  const minY = Math.min(...allValues, cost_low) * 0.99;
  const maxY = Math.max(...allValues, cost_high) * 1.01;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
    >
      {/* 標題列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#B5ADA4', marginBottom: '8px' }}>
            主力成本帶估算 · 近 {days_analyzed} 日 VWAP
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: '32px', fontWeight: 600, color: '#3E3A39' }}>
              {current_price}
            </span>
            <span style={{ color: '#B5ADA4', fontSize: '13px' }}>元 / 現價</span>
            <span style={{
              fontSize: '12px', padding: '3px 10px',
              background: tag.bg, color: tag.color,
              border: `1px solid ${tag.border}`,
              fontFamily: "'Noto Serif TC', serif",
            }}>
              {posLabel}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', letterSpacing: '1px', color: '#B5ADA4', marginBottom: '4px' }}>主力成本</div>
          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: '22px', color: C.accent, fontWeight: 500 }}>
            {cost_low} – {cost_high}
          </div>
          <div style={{ fontSize: '12px', color: above_cost ? '#4A9B6F' : '#C0392B', marginTop: '2px' }}>
            {above_cost ? '+' : ''}{price_vs_cost_pct}% vs VWAP
          </div>
        </div>
      </div>

      {/* 圖表 */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chart_data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="smartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={C.accent} stopOpacity={0.22} />
              <stop offset="100%" stopColor={C.accent} stopOpacity={0.0}  />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="transparent" />
          <XAxis dataKey="date" tick={C.tick} axisLine={{ stroke: C.axis }} tickLine={false}
            tickFormatter={v => v.slice(5)} interval="preserveStartEnd" />
          <YAxis domain={[minY, maxY]} tick={C.tick} axisLine={false} tickLine={false}
            tickFormatter={v => v.toFixed(0)} width={44} />
          <Tooltip contentStyle={C.tip} labelStyle={{ color: '#B5ADA4' }} formatter={v => [`${v} 元`, '收盤價']} />

          {/* 成本區間帶 */}
          <ReferenceArea
            y1={cost_low} y2={cost_high}
            fill={C.accent} fillOpacity={0.12}
            stroke={C.accent} strokeOpacity={0.3} strokeDasharray="4 4"
          />

          {/* VWAP 中心線 */}
          <ReferenceLine
            y={smart_money_cost} stroke={C.accent} strokeWidth={1.5}
            strokeDasharray="6 3"
            label={{ value: `VWAP ${smart_money_cost}`, fill: C.accent, fontSize: 11, position: 'insideTopRight' }}
          />

          <Area dataKey="close" stroke={C.terra} strokeWidth={2}
            fill="url(#smartGrad)" dot={false} activeDot={{ r: 4, fill: C.terra }} />
        </AreaChart>
      </ResponsiveContainer>

      {/* AI 結論 */}
      {ai_conclusion && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{
            marginTop: '20px',
            padding: '16px 20px',
            background: '#F9F6F0',
            borderLeft: `3px solid ${C.accent}`,
          }}
        >
          <div style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px', color: '#B5ADA4', marginBottom: '8px', textTransform: 'uppercase' }}>
            AI 籌碼分析
          </div>
          <p style={{ fontFamily: "'Noto Serif TC', serif", fontSize: '15px', color: '#3E3A39', lineHeight: 1.8, margin: 0 }}>
            {ai_conclusion}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
