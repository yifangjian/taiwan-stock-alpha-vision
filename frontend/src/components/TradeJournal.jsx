import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const underlineInput = {
  width: '100%', padding: '10px 0', fontSize: '15px',
  background: 'transparent', color: '#3E3A39',
  border: 'none', borderBottom: '1px solid #CFC9BF',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  fontFamily: "'Noto Serif TC', 'Georgia', serif",
};

const labelStyle = {
  display: 'block', fontSize: '11px',
  fontFamily: 'monospace', letterSpacing: '1px',
  textTransform: 'uppercase', color: '#B5ADA4',
  marginBottom: '4px',
};

const EMPTY = {
  stock_id: '', buy_date: '', sell_date: '', buy_price: '',
  sell_price: '', quantity: '1', notes: '',
};

export default function TradeJournal({ supabase, user }) {
  const [form,      setForm]      = useState(EMPTY);
  const [journals,  setJournals]  = useState([]);
  const [review,    setReview]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [fetching,  setFetching]  = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (user && supabase) loadJournals();
  }, [user]);

  async function loadJournals() {
    if (!supabase) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('trade_journals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error) setJournals(data || []);
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.stock_id || !form.buy_date || !form.buy_price) {
      setError('請填寫：股票代號、買入日期、買入價格');
      return;
    }
    setError('');
    setLoading(true);
    setReview('');

    try {
      // AI 覆盤
      const pnl = form.sell_price && form.buy_price
        ? ((parseFloat(form.sell_price) - parseFloat(form.buy_price)) / parseFloat(form.buy_price) * 100)
        : null;

      const { data: revData } = await axios.post(`${API}/api/v1/journal/review`, {
        stock_id:   form.stock_id,
        buy_date:   form.buy_date,
        sell_date:  form.sell_date || null,
        buy_price:  parseFloat(form.buy_price),
        sell_price: form.sell_price ? parseFloat(form.sell_price) : null,
        pnl_pct:    pnl ? parseFloat(pnl.toFixed(2)) : null,
        notes:      form.notes || null,
      });

      const aiReview = revData.review || '';
      setReview(aiReview);

      // 儲存到 Supabase
      if (supabase && user) {
        await supabase.from('trade_journals').insert({
          user_id:    user.id,
          stock_id:   form.stock_id,
          buy_date:   form.buy_date,
          sell_date:  form.sell_date || null,
          buy_price:  parseFloat(form.buy_price),
          sell_price: form.sell_price ? parseFloat(form.sell_price) : null,
          quantity:   parseInt(form.quantity) || 1,
          pnl_pct:    pnl ? parseFloat(pnl.toFixed(2)) : null,
          notes:      form.notes || null,
          ai_review:  aiReview,
        });
        loadJournals();
      }

      setForm(EMPTY);
    } catch (err) {
      setError(err?.response?.data?.detail || '請求失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  function Field({ label, name, type = 'text', placeholder }) {
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        <input
          style={underlineInput}
          type={type} placeholder={placeholder}
          value={form[name]}
          onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
          onFocus={e  => e.target.style.borderBottomColor = '#A3907C'}
          onBlur={e   => e.target.style.borderBottomColor = '#CFC9BF'}
        />
      </div>
    );
  }

  const pnlColor = v => v > 0 ? '#4A9B6F' : v < 0 ? '#C0392B' : '#857870';

  return (
    <div>
      {/* 新增表單 */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '28px 32px', marginBottom: '24px' }}>
          <Field label="股票代號" name="stock_id" placeholder="例：2330" />
          <Field label="買入日期" name="buy_date" type="date" />
          <Field label="買入價格（元）" name="buy_price" type="number" placeholder="例：800" />
          <Field label="賣出日期" name="sell_date" type="date" />
          <Field label="賣出價格（元）" name="sell_price" type="number" placeholder="留空表示持有中" />
          <Field label="股數" name="quantity" type="number" placeholder="1" />
        </div>

        <div style={{ marginBottom: '28px' }}>
          <label style={labelStyle}>備注（可選）</label>
          <textarea
            style={{ ...underlineInput, resize: 'vertical', minHeight: '60px', lineHeight: 1.7 }}
            placeholder="進出場理由、市場情況..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            onFocus={e  => e.target.style.borderBottomColor = '#A3907C'}
            onBlur={e   => e.target.style.borderBottomColor = '#CFC9BF'}
          />
        </div>

        {error && (
          <p style={{ color: '#C0392B', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
        )}

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ y: -1 }} whileTap={{ y: 0 }}
          style={{
            padding: '13px 36px', fontSize: '14px',
            background: loading ? '#CFC9BF' : '#3E3A39',
            color: '#FFFFFF', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Noto Serif TC', serif", letterSpacing: '1px',
            transition: 'background 0.2s',
          }}
        >
          {loading ? '分析中⋯' : '送出並請求 AI 覆盤'}
        </motion.button>
      </form>

      {/* AI 覆盤結果 */}
      <AnimatePresence>
        {review && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              marginTop: '28px', padding: '20px 24px',
              background: '#F9F6F0', borderLeft: '3px solid #A3907C',
            }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px', color: '#B5ADA4', marginBottom: '10px', textTransform: 'uppercase' }}>
              AI 教練覆盤
            </div>
            <p style={{ fontFamily: "'Noto Serif TC', serif", fontSize: '15px', color: '#3E3A39', lineHeight: 1.9, margin: 0 }}>
              {review}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 歷史紀錄 */}
      {journals.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#B5ADA4', marginBottom: '16px' }}>
            歷史紀錄 · {journals.length} 筆
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {journals.map((j, i) => {
              const pnl = j.pnl_pct;
              return (
                <motion.div
                  key={j.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.5 }}
                  style={{
                    display: 'grid', gridTemplateColumns: '60px 1fr 1fr 80px',
                    alignItems: 'center', gap: '16px',
                    padding: '14px 18px',
                    background: '#FFFFFF', border: '1px solid #EDE9E2',
                    fontSize: '14px',
                  }}
                >
                  <span style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 600, color: '#3E3A39' }}>
                    {j.stock_id}
                  </span>
                  <span style={{ color: '#857870', fontSize: '12px' }}>
                    {j.buy_date} → {j.sell_date || '持有中'}
                  </span>
                  <span style={{ color: '#B5ADA4', fontSize: '12px' }}>
                    {j.buy_price} 元{j.sell_price ? ` → ${j.sell_price} 元` : ''}
                  </span>
                  <span style={{
                    fontFamily: "'Noto Serif TC', serif", fontWeight: 500,
                    color: pnl != null ? pnlColor(pnl) : '#B5ADA4',
                    textAlign: 'right',
                  }}>
                    {pnl != null ? `${pnl > 0 ? '+' : ''}${pnl}%` : '—'}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {fetching && (
        <p style={{ color: '#B5ADA4', fontSize: '13px', marginTop: '20px', fontFamily: 'monospace' }}>
          載入紀錄中⋯
        </p>
      )}
    </div>
  );
}
