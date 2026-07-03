import { useState } from 'react';

const card = {
  backgroundColor: '#1e293b',
  padding: '24px',
  borderRadius: '12px',
  border: '1px solid #334155',
};

export default function PositionCalculator() {
  const [capital, setCapital] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');

  const parse = (v) => parseFloat(v.replace(/,/g, '')) || 0;

  const maxShares = (() => {
    const cap = parse(capital);
    const buy = parse(buyPrice);
    const stop = parse(stopLoss);
    if (!cap || !buy || !stop || buy <= stop) return null;
    const risk = cap * 0.02;          // 2% 最大虧損
    const lossPerShare = buy - stop;  // 每股虧損
    return Math.floor(risk / lossPerShare);
  })();

  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: '16px',
    backgroundColor: '#0f172a', color: '#f8fafc',
    border: '1px solid #475569', borderRadius: '8px',
    boxSizing: 'border-box', marginTop: '6px',
  };
  const labelStyle = { color: '#94a3b8', fontSize: '14px', display: 'block' };

  return (
    <div style={card}>
      <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>🧮 智慧倉位計算機</h2>
      <p style={{ color: '#64748b', marginTop: '-8px', fontSize: '14px' }}>
        依「單筆虧損不超過總資金 2%」原則計算安全買入股數
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>💰 我總共有多少閒錢？（元）</label>
          <input style={inputStyle} type="number" placeholder="例：100000"
            value={capital} onChange={(e) => setCapital(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>📈 我想買的股票現在多少錢？（元）</label>
          <input style={inputStyle} type="number" placeholder="例：150"
            value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>🛑 跌到多少錢我會認痛停損？（元）</label>
          <input style={inputStyle} type="number" placeholder="例：135"
            value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
        </div>
      </div>

      {maxShares !== null && (
        <div style={{
          backgroundColor: '#0f172a', padding: '20px', borderRadius: '10px',
          border: '1px solid #38bdf8', textAlign: 'center',
        }}>
          <div style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '8px' }}>
            為了您的安全，建議您最多只能買
          </div>
          <div style={{ fontSize: '56px', fontWeight: 'bold', color: '#38bdf8', lineHeight: 1 }}>
            {maxShares.toLocaleString()}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '20px', marginTop: '6px' }}>股</div>
          <div style={{ color: '#475569', fontSize: '13px', marginTop: '12px' }}>
            最大虧損上限：NT$ {(parse(capital) * 0.02).toLocaleString()} 元（總資金 2%）
          </div>
        </div>
      )}

      {parse(buyPrice) > 0 && parse(stopLoss) > 0 && parse(buyPrice) <= parse(stopLoss) && (
        <div style={{ color: '#ef4444', marginTop: '12px', fontSize: '14px' }}>
          ⚠️ 停損價必須低於買入價，請重新確認！
        </div>
      )}
    </div>
  );
}
