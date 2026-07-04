import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import DayTradeCalculator from '../components/DayTradeCalculator';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const FU  = (d = 0) => ({
  initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 },
  viewport: { once: true }, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: d },
});
const LBL = { fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4' };
const INP = {
  padding: '10px 14px', fontSize: 14, width: '100%',
  background: '#F9F6F0', color: '#3E3A39',
  border: '1px solid #EDE9E2', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s', fontFamily: "'Noto Serif TC', serif",
};

/* ─── Month chip ──────────────────────────────────────────── */
const MONTHS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
function MonthChip({ month, hasDiv }) {
  return (
    <div style={{
      width: 44, height: 44, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 2, fontSize: 11,
      background: hasDiv ? 'rgba(74,155,111,0.1)' : '#F9F6F0',
      border: `1px solid ${hasDiv ? '#4A9B6F' : '#EDE9E2'}`,
      color: hasDiv ? '#4A9B6F' : '#CFC9BF',
    }}>
      <span>{month}</span>
      {hasDiv && <span style={{ fontSize: 8 }}>●</span>}
    </div>
  );
}

/* ─── Compound Calculator ────────────────────────────────── */
function CompoundCalculator() {
  const [principal, setPrincipal] = useState('100000');
  const [yield_,    setYield_]    = useState('5');
  const [years,     setYears]     = useState('10');
  const [reinvest,  setReinvest]  = useState(true);

  const rows = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const r = (parseFloat(yield_) || 0) / 100;
    const y = Math.min(parseInt(years) || 10, 30);
    const result = [];
    let acc = p;
    for (let i = 1; i <= y; i++) {
      const div = acc * r;
      if (reinvest) acc += div;
      else acc = p;
      result.push({ year: i, value: Math.round(acc), div: Math.round(div) });
    }
    return result;
  }, [principal, yield_, years, reinvest]);

  const final = rows[rows.length - 1];
  const totalDiv = rows.reduce((s, r) => s + r.div, 0);

  return (
    <div>
      <div style={{ ...LBL, marginBottom: 10 }}>Compound Calculator</div>
      <h3 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, fontWeight: 400, color: '#3E3A39', margin: '0 0 20px' }}>
        股息再投入複利試算
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: '本金（元）',   val: principal, set: setPrincipal, ph: '100000' },
          { label: '年殖利率（%）', val: yield_,    set: setYield_,    ph: '5' },
          { label: '投資年數',      val: years,     set: setYears,     ph: '10' },
        ].map(({ label, val, set, ph }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={LBL}>{label}</label>
            <input type="number" style={INP} placeholder={ph} value={val}
              onChange={e => set(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#A3907C'}
              onBlur={e  => e.target.style.borderColor = '#EDE9E2'}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => setReinvest(!reinvest)}
          style={{
            padding: '7px 16px', fontSize: 13, cursor: 'pointer',
            background: reinvest ? '#4A9B6F' : 'transparent',
            color: reinvest ? '#FFFFFF' : '#857870',
            border: `1px solid ${reinvest ? '#4A9B6F' : '#CFC9BF'}`,
            fontFamily: "'Noto Serif TC', serif", transition: 'all 0.2s',
          }}
        >
          {reinvest ? '✓ 股息再投入' : '股息不再投入'}
        </button>
      </div>

      {final && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: `${years} 年後本利合`, val: `NT$ ${final.value.toLocaleString()}`, color: '#3E3A39' },
              { label: '累計股息',            val: `NT$ ${totalDiv.toLocaleString()}`,    color: '#4A9B6F' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: '#F9F6F0', border: '1px solid #EDE9E2', padding: 16 }}>
                <div style={LBL}>{label}</div>
                <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 24, color, marginTop: 8, fontWeight: 300 }}>
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, padding: '8px 0' }}>
            {rows.map((r) => {
              const max = rows[rows.length - 1].value;
              const h   = Math.max(4, Math.round((r.value / max) * 72));
              return (
                <div key={r.year} title={`第${r.year}年 NT$${r.value.toLocaleString()}`}
                  style={{ flex: 1, height: h, background: '#4A9B6F', opacity: 0.3 + (r.year / rows.length) * 0.7, transition: 'all 0.3s' }} />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#CFC9BF', fontFamily: 'monospace', marginTop: 4 }}>
            <span>第1年</span><span>第{Math.ceil(rows.length / 2)}年</span><span>第{rows.length}年</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Holdings row ────────────────────────────────────────── */
function HoldingRow({ h, price, onEdit, onDelete }) {
  const cost     = parseFloat(h.avg_cost)  || 0;
  const qty      = parseInt(h.shares)      || 0;
  const cur      = parseFloat(price)       || 0;
  const costVal  = Math.round(cost * qty);
  const curVal   = cur ? Math.round(cur  * qty) : null;
  const pnl      = curVal != null ? curVal - costVal : null;
  const pnlPct   = pnl != null && costVal ? (pnl / costVal * 100).toFixed(2) : null;
  const pnlColor = pnl == null ? '#857870' : pnl >= 0 ? '#4A9B6F' : '#C0392B';

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ borderBottom: '1px solid #F5F1EC' }}
    >
      {[
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#3E3A39' }}>{h.stock_id}</span>,
        <span style={{ color: '#857870' }}>{h.stock_name || '-'}</span>,
        <span>{qty.toLocaleString()}</span>,
        <span>NT$ {cost.toFixed(2)}</span>,
        <span>NT$ {cur ? cur.toFixed(2) : '—'}</span>,
        curVal != null
          ? <span style={{ color: pnlColor }}>{pnl >= 0 ? '+' : ''}{pnl.toLocaleString()} ({pnlPct}%)</span>
          : <span style={{ color: '#CFC9BF' }}>—</span>,
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onEdit(h)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A3907C', fontSize: 13, fontFamily: 'monospace' }}>編輯</button>
          <button onClick={() => onDelete(h.stock_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFC9BF', fontSize: 13, fontFamily: 'monospace' }}>刪除</button>
        </div>,
      ].map((el, i) => (
        <td key={i} style={{ padding: '12px 14px', fontSize: 13, color: '#3E3A39', whiteSpace: 'nowrap' }}>{el}</td>
      ))}
    </motion.tr>
  );
}

/* ─── Main page ───────────────────────────────────────────── */
export default function PortfolioPage({ user }) {
  const [tab,        setTab]        = useState('holdings');  // holdings | dividend | compound | daytrade
  const [holdings,   setHoldings]   = useState([]);
  const [prices,     setPrices]     = useState({});
  const [dividends,  setDividends]  = useState({});
  const [loading,    setLoading]    = useState(false);

  // Add/edit form
  const [editItem,   setEditItem]   = useState(null);   // null = new
  const [showForm,   setShowForm]   = useState(false);
  const [form, setForm] = useState({ stock_id: '', stock_name: '', shares: '', avg_cost: '' });

  /* ── Load holdings from Supabase ── */
  useEffect(() => {
    if (!user || !supabase) return;
    supabase.from('holdings').select('*').eq('user_id', user.id).order('created_at')
      .then(({ data }) => setHoldings(data || []));
  }, [user]);

  /* ── Fetch current prices when holdings change ── */
  useEffect(() => {
    if (!holdings.length) return;
    const ids = holdings.map(h => h.stock_id).join(',');
    axios.get(`${API}/api/v1/portfolio/prices`, { params: { stocks: ids } })
      .then(({ data }) => setPrices(data.prices || {}))
      .catch(() => {});
  }, [holdings]);

  /* ── Fetch dividends when on dividend tab ── */
  useEffect(() => {
    if (tab !== 'dividend' || !holdings.length) return;
    const ids = holdings.map(h => h.stock_id).join(',');
    axios.get(`${API}/api/v1/portfolio/dividends`, { params: { stocks: ids } })
      .then(({ data }) => {
        const map = {};
        (data.data || []).forEach(d => { map[d.stock_id] = d; });
        setDividends(map);
      })
      .catch(() => {});
  }, [tab, holdings]);

  /* ── CRUD ── */
  const openNew  = () => { setForm({ stock_id: '', stock_name: '', shares: '', avg_cost: '' }); setEditItem(null); setShowForm(true); };
  const openEdit = (h)  => { setForm({ stock_id: h.stock_id, stock_name: h.stock_name || '', shares: String(h.shares), avg_cost: String(h.avg_cost) }); setEditItem(h); setShowForm(true); };

  const saveHolding = async () => {
    if (!user || !supabase) return;
    const row = { user_id: user.id, stock_id: form.stock_id.trim(), stock_name: form.stock_name.trim(), shares: parseInt(form.shares) || 0, avg_cost: parseFloat(form.avg_cost) || 0 };
    if (!row.stock_id || !row.shares) return;
    setLoading(true);
    try {
      if (editItem) {
        await supabase.from('holdings').update(row).eq('user_id', user.id).eq('stock_id', editItem.stock_id);
        setHoldings(prev => prev.map(h => h.stock_id === editItem.stock_id ? { ...h, ...row } : h));
      } else {
        const { data } = await supabase.from('holdings').insert(row).select().single();
        setHoldings(prev => [...prev, data]);
      }
      setShowForm(false);
    } finally { setLoading(false); }
  };

  const deleteHolding = async (stock_id) => {
    if (!user || !supabase) return;
    await supabase.from('holdings').delete().eq('user_id', user.id).eq('stock_id', stock_id);
    setHoldings(prev => prev.filter(h => h.stock_id !== stock_id));
  };

  /* ── Summary ── */
  const totalCost   = holdings.reduce((s, h) => s + (parseFloat(h.avg_cost) || 0) * (parseInt(h.shares) || 0), 0);
  const totalCur    = holdings.reduce((s, h) => s + (parseFloat(prices[h.stock_id]) || 0) * (parseInt(h.shares) || 0), 0);
  const totalPnl    = totalCur - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost * 100).toFixed(2) : null;

  const TABS = [
    { id: 'holdings',  label: '持倉追蹤' },
    { id: 'dividend',  label: '配息月曆' },
    { id: 'compound',  label: '複利試算' },
    { id: 'daytrade',  label: '當沖計算機' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 52px 80px' }}>
      <motion.div {...FU()} style={{ marginBottom: 40 }}>
        <div style={{ ...LBL, marginBottom: 10 }}>Portfolio</div>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 32, fontWeight: 400, color: '#3E3A39', margin: 0 }}>
          我的投資組合
        </h1>
      </motion.div>

      {/* Tab bar */}
      <motion.div {...FU(0.06)} style={{ display: 'flex', gap: 0, marginBottom: 36, borderBottom: '1px solid #EDE9E2' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '12px 22px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Noto Serif TC', serif", fontSize: 14,
              color: tab === t.id ? '#3E3A39' : '#B5ADA4',
              borderBottom: tab === t.id ? '2px solid #B85C38' : '2px solid transparent',
              transition: 'all 0.2s', marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* ── Holdings tab ── */}
      {tab === 'holdings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
          {!user ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#B5ADA4', fontFamily: "'Noto Serif TC', serif" }}>
              請先登入以使用持倉追蹤功能
            </div>
          ) : (
            <>
              {/* Summary cards */}
              {holdings.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
                  {[
                    { label: '投入成本', val: `NT$ ${Math.round(totalCost).toLocaleString()}` },
                    { label: '目前市值', val: totalCur > 0 ? `NT$ ${Math.round(totalCur).toLocaleString()}` : '—' },
                    {
                      label: '浮動損益',
                      val: totalCur > 0 ? `${totalPnl >= 0 ? '+' : ''}${Math.round(totalPnl).toLocaleString()} (${totalPnlPct}%)` : '—',
                      color: totalPnl >= 0 ? '#4A9B6F' : '#C0392B',
                    },
                  ].map(({ label, val, color }) => (
                    <motion.div key={label} {...FU()} style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '20px 24px' }}>
                      <div style={LBL}>{label}</div>
                      <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, color: color || '#3E3A39', marginTop: 10, fontWeight: 300 }}>
                        {val}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Table */}
              {holdings.length > 0 && (
                <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', marginBottom: 20, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #EDE9E2' }}>
                        {['代號', '名稱', '股數', '均成本', '現價', '浮動損益', '操作'].map(h => (
                          <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#B5ADA4', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map(h => (
                        <HoldingRow key={h.stock_id} h={h} price={prices[h.stock_id]} onEdit={openEdit} onDelete={deleteHolding} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <motion.button
                onClick={openNew}
                whileHover={{ y: -1, backgroundColor: '#9E4E2F', transition: { duration: 0.2 } }}
                style={{ padding: '11px 24px', background: '#B85C38', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: "'Noto Serif TC', serif", fontSize: 14 }}
              >
                ＋ 新增持倉
              </motion.button>
            </>
          )}
        </motion.div>
      )}

      {/* ── Dividend Calendar tab ── */}
      {tab === 'dividend' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
          {!user || holdings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#B5ADA4', fontFamily: "'Noto Serif TC', serif" }}>
              {!user ? '請先登入' : '請先在持倉追蹤新增股票'}
            </div>
          ) : (
            <>
              <div style={{ ...LBL, marginBottom: 16 }}>Dividend Calendar</div>
              <h3 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, fontWeight: 400, color: '#3E3A39', margin: '0 0 24px' }}>配息月曆</h3>

              {/* Month grid */}
              <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: 24, marginBottom: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 8 }}>
                  {MONTHS.map((m, i) => {
                    const month = i + 1;
                    const hasDiv = Object.values(dividends).some(d => d.ex_months?.includes(month));
                    return <MonthChip key={m} month={`${m}月`} hasDiv={hasDiv} />;
                  })}
                </div>
              </div>

              {/* Per-stock detail */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {holdings.map(h => {
                  const d = dividends[h.stock_id];
                  return (
                    <div key={h.stock_id} style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 14, color: '#3E3A39' }}>{h.stock_id}</div>
                        <div style={{ fontSize: 12, color: '#B5ADA4' }}>{h.stock_name}</div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <div>
                          <div style={LBL}>殖利率</div>
                          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: d?.dividend_yield ? '#4A9B6F' : '#CFC9BF', marginTop: 4 }}>
                            {d?.dividend_yield ? `${d.dividend_yield}%` : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={LBL}>年配息</div>
                          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: '#3E3A39', marginTop: 4 }}>
                            {d?.annual_dividend ? `NT$ ${d.annual_dividend}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={LBL}>除息月份</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#857870', marginTop: 4 }}>
                            {d?.ex_months?.length ? d.ex_months.map(m => `${m}月`).join('、') : '查無資料'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* ── Compound Calculator tab ── */}
      {tab === 'compound' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: 32 }}>
            <CompoundCalculator />
          </div>
        </motion.div>
      )}

      {/* ── Day Trade Calculator tab ── */}
      {tab === 'daytrade' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: 32 }}>
            <DayTradeCalculator />
          </div>
        </motion.div>
      )}

      {/* ── Add/Edit form modal ── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(62,58,57,0.38)', backdropFilter: 'blur(3px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.38 }}
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                zIndex: 301, background: '#FFFFFF', border: '1px solid #EDE9E2',
                padding: 36, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
              }}
            >
              <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: '#3E3A39', marginBottom: 24 }}>
                {editItem ? '編輯持倉' : '新增持倉'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: '股票代號',     key: 'stock_id',   ph: '例：2330',  disabled: !!editItem },
                  { label: '股票名稱',     key: 'stock_name', ph: '例：台積電', disabled: false },
                  { label: '持有股數',     key: 'shares',     ph: '例：1000',  disabled: false, type: 'number' },
                  { label: '均成本（元）', key: 'avg_cost',   ph: '例：500.5', disabled: false, type: 'number' },
                ].map(({ label, key, ph, disabled, type = 'text' }) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={LBL}>{label}</label>
                    <input type={type} style={{ ...INP, opacity: disabled ? 0.6 : 1 }}
                      placeholder={ph} value={form[key]} disabled={disabled}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      onFocus={e => { if (!disabled) e.target.style.borderColor = '#A3907C'; }}
                      onBlur={e  => e.target.style.borderColor = '#EDE9E2'}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <motion.button
                  onClick={saveHolding} disabled={loading}
                  whileHover={!loading ? { y: -1 } : {}}
                  style={{ flex: 1, padding: '12px', background: '#B85C38', color: '#FFFFFF', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Noto Serif TC', serif", fontSize: 14 }}
                >
                  {loading ? '儲存中⋯' : '確認'}
                </motion.button>
                <button onClick={() => setShowForm(false)} style={{ padding: '12px 20px', background: 'none', border: '1px solid #EDE9E2', color: '#857870', cursor: 'pointer', fontFamily: "'Noto Serif TC', serif", fontSize: 14 }}>
                  取消
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
