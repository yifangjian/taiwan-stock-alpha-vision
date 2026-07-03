import { useState } from 'react';
import { motion } from 'framer-motion';

const labelStyle = {
  fontFamily: 'monospace', fontSize: '11px', letterSpacing: '1px',
  textTransform: 'uppercase', color: '#B5ADA4', display: 'block', marginBottom: '6px',
};
const inputStyle = {
  width: '100%', padding: '11px 14px', fontSize: '15px',
  background: '#F9F6F0', color: '#3E3A39',
  border: '1px solid #EDE9E2', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

export default function PositionCalculator() {
  const [capital,   setCapital]   = useState('');
  const [buyPrice,  setBuyPrice]  = useState('');
  const [stopLoss,  setStopLoss]  = useState('');

  const parse = v => parseFloat(v.replace(/,/g, '')) || 0;

  const maxShares = (() => {
    const cap = parse(capital), buy = parse(buyPrice), stop = parse(stopLoss);
    if (!cap || !buy || !stop || buy <= stop) return null;
    return Math.floor((cap * 0.02) / (buy - stop));
  })();

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {[
          { label: '總可用資金（元）', ph: '例：1,000,000', val: capital,   set: setCapital },
          { label: '買入價格（元）',   ph: '例：150',       val: buyPrice,  set: setBuyPrice },
          { label: '停損價格（元）',   ph: '例：135',       val: stopLoss,  set: setStopLoss },
        ].map(({ label, ph, val, set }) => (
          <div key={label}>
            <label style={labelStyle}>{label}</label>
            <input
              style={inputStyle} type="number" placeholder={ph} value={val}
              onChange={e => set(e.target.value)}
              onFocus={e  => e.target.style.borderColor = '#A3907C'}
              onBlur={e   => e.target.style.borderColor = '#EDE9E2'} />
          </div>
        ))}
      </div>

      {maxShares !== null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: '#F9F6F0', border: '1px solid #EDE9E2', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#B5ADA4', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>
            建議最多買入
          </div>
          <div style={{ fontFamily:"'Noto Serif TC', serif", fontSize: '64px', fontWeight: 600, color: '#B85C38', lineHeight: 1 }}>
            {maxShares.toLocaleString()}
          </div>
          <div style={{ color: '#857870', fontSize: '18px', marginTop: '8px', fontFamily:"'Noto Serif TC', serif" }}>股</div>
          <div style={{ fontFamily: 'monospace', color: '#B5ADA4', fontSize: '12px', marginTop: '16px', letterSpacing: '1px' }}>
            最大虧損上限：NT${(parse(capital) * 0.02).toLocaleString()} 元（總資金 2%）
          </div>
        </motion.div>
      )}

      {parse(buyPrice) > 0 && parse(stopLoss) > 0 && parse(buyPrice) <= parse(stopLoss) && (
        <p style={{ color: '#B85C38', marginTop: '12px', fontSize: '13px' }}>
          ⚠ 停損價必須低於買入價，請重新確認
        </p>
      )}
    </div>
  );
}
