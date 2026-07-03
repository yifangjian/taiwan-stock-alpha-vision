import { useState } from 'react';

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

  const inputStyle = {
    width: '100%', padding: '11px 14px', fontSize: '15px',
    background: '#0c0b07', color: '#f0ead6',
    border: '1px solid #2a2618', outline: 'none',
    boxSizing: 'border-box', marginTop: '6px',
    transition: 'border-color 0.2s',
  };
  const labelStyle = { color: '#9a8a68', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', fontFamily: 'monospace' };

  return (
    <div style={{ background: '#14120c', border: '1px solid #2a2618', padding: '28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {[
          { label: '總可用資金（元）', ph: '例：1000000', val: capital, set: setCapital },
          { label: '買入價格（元）',   ph: '例：150',     val: buyPrice,  set: setBuyPrice },
          { label: '停損價格（元）',   ph: '例：135',     val: stopLoss,  set: setStopLoss },
        ].map(({ label, ph, val, set }) => (
          <div key={label}>
            <label style={labelStyle}>{label}</label>
            <input style={inputStyle} type="number" placeholder={ph} value={val}
              onChange={e => set(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#6b5012'}
              onBlur={e  => e.target.style.borderColor = '#2a2618'} />
          </div>
        ))}
      </div>

      {maxShares !== null && (
        <div style={{ background: '#0c0b07', border: '1px solid #6b5012', padding: '28px', textAlign: 'center' }}>
          <div style={{ color: '#9a8a68', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>建議最多買入</div>
          <div style={{ fontSize: '64px', fontWeight: '800', color: '#c8a84b', lineHeight: 1 }}>
            {maxShares.toLocaleString()}
          </div>
          <div style={{ color: '#9a8a68', fontSize: '18px', marginTop: '8px' }}>股</div>
          <div style={{ color: '#5a5038', fontSize: '12px', marginTop: '16px' }}>
            最大虧損上限：NT${(parse(capital) * 0.02).toLocaleString()} 元（總資金 2%）
          </div>
        </div>
      )}

      {parse(buyPrice) > 0 && parse(stopLoss) > 0 && parse(buyPrice) <= parse(stopLoss) && (
        <div style={{ color: '#e05c5c', marginTop: '12px', fontSize: '13px' }}>
          ⚠️ 停損價必須低於買入價，請重新確認
        </div>
      )}
    </div>
  );
}
