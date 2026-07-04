import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

const ROW = { display: 'flex', flexDirection: 'column', gap: 6 };
const LBL = { fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#B5ADA4' };
const INP = {
  padding: '11px 14px', fontSize: 15, width: '100%',
  background: '#F9F6F0', color: '#3E3A39',
  border: '1px solid #EDE9E2', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s', fontFamily: "'Noto Serif TC', serif",
};

const FEE_RATE  = 0.001425;   // 手續費 0.1425%
const TAX_DAY   = 0.0015;     // 當沖交易稅 0.15%（一般 0.3%）
const MIN_FEE   = 20;         // 最低手續費

function calcFee(amount, discount) {
  return Math.max(Math.round(amount * FEE_RATE * discount), MIN_FEE);
}

export default function DayTradeCalculator() {
  const [buyPrice,  setBuyPrice]  = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [shares,    setShares]    = useState('');
  const [discount,  setDiscount]  = useState('60');   // 手續費折數

  const p = (v) => parseFloat(v) || 0;

  const result = useMemo(() => {
    const buy  = p(buyPrice);
    const sell = p(sellPrice);
    const qty  = p(shares);
    const disc = p(discount) / 100;

    if (!buy || !qty) return null;

    const buyTotal  = buy  * qty;
    const sellTotal = sell * qty;

    const buyFee  = calcFee(buyTotal,  disc);
    const sellFee = calcFee(sellTotal, disc);
    const tax     = Math.round(sellTotal * TAX_DAY);
    const totalCost = buyFee + sellFee + tax;

    const profit = sellTotal - buyTotal - totalCost;

    // 損益平衡點：sell_be × qty × (1 - fee_rate×disc - TAX_DAY) = buyTotal + buyFee + MIN_SELL_FEE
    // Simplified: solve for sell_be per share
    const denom = 1 - FEE_RATE * disc - TAX_DAY;
    const breakEven = denom > 0
      ? Math.ceil(((buyTotal + buyFee + MIN_FEE) / denom) / qty * 10) / 10
      : null;

    return { buyTotal, sellTotal, buyFee, sellFee, tax, totalCost, profit, breakEven };
  }, [buyPrice, sellPrice, shares, discount]);

  const profitColor = result
    ? result.profit > 0 ? '#4A9B6F' : result.profit < 0 ? '#C0392B' : '#857870'
    : '#857870';

  return (
    <div>
      <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 16 }}>
        Day Trade Calculator
      </div>
      <h3 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, fontWeight: 400, color: '#3E3A39', margin: '0 0 24px' }}>
        當沖損益計算器
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: '買入價（元）',   val: buyPrice,  set: setBuyPrice,  ph: '例：150' },
          { label: '賣出價（元）',   val: sellPrice, set: setSellPrice, ph: '例：153' },
          { label: '股數',           val: shares,    set: setShares,    ph: '例：1000' },
          { label: '手續費折數（%）', val: discount,  set: setDiscount,  ph: '例：60（六折）' },
        ].map(({ label, val, set, ph }) => (
          <div key={label} style={ROW}>
            <label style={LBL}>{label}</label>
            <input
              type="number" style={INP} placeholder={ph} value={val}
              onChange={e => set(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#A3907C'}
              onBlur={e  => e.target.style.borderColor = '#EDE9E2'}
            />
          </div>
        ))}
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: '#F9F6F0', border: '1px solid #EDE9E2', padding: 24 }}
        >
          {/* 損益大數字 */}
          <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #EDE9E2' }}>
            <div style={LBL}>預估損益</div>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 48, fontWeight: 300, color: profitColor, lineHeight: 1.1, marginTop: 6 }}>
              {result.profit >= 0 ? '+' : ''}{result.profit.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: '#B5ADA4', marginTop: 4 }}>元（含費用稅）</div>
          </div>

          {/* 明細 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            {[
              ['買入金額', result.buyTotal.toLocaleString()],
              ['賣出金額', result.sellTotal.toLocaleString()],
              ['買入手續費', result.buyFee.toLocaleString()],
              ['賣出手續費', result.sellFee.toLocaleString()],
              ['當沖交易稅 0.15%', result.tax.toLocaleString()],
              ['總費用稅', result.totalCost.toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #F5F1EC' }}>
                <span style={{ color: '#B5ADA4', fontFamily: 'monospace' }}>{k}</span>
                <span style={{ color: '#3E3A39' }}>NT$ {v}</span>
              </div>
            ))}
          </div>

          {result.breakEven && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#FFFFFF', border: '1px solid #EDE9E2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#B5ADA4', letterSpacing: 1 }}>損益平衡點</span>
              <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: '#B85C38' }}>
                {result.breakEven} 元
              </span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
