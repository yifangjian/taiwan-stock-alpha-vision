import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { supabase } from '../lib/supabase';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const LBL = { fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4' };
const INP = {
  padding: '9px 12px', fontSize: 13, width: '100%',
  background: '#F9F6F0', color: '#3E3A39',
  border: '1px solid #EDE9E2', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s', fontFamily: "'Noto Serif TC', serif",
};

const CONDITION_OPTIONS = [
  { value: 'price_above', label: '突破目標價' },
  { value: 'price_below', label: '跌破目標價' },
  { value: 'above_ma20',  label: '突破 20MA' },
  { value: 'below_ma20',  label: '跌破 20MA' },
  { value: 'above_ma60',  label: '突破 60MA' },
  { value: 'below_ma60',  label: '跌破 60MA' },
];

const needsThreshold = (t) => t === 'price_above' || t === 'price_below';

export default function AlertSettings({ user }) {
  const [conditions,   setConditions]   = useState([]);
  const [showForm,     setShowForm]     = useState(false);
  const [checking,     setChecking]     = useState(false);
  const [triggered,    setTriggered]    = useState([]);
  const [checkDone,    setCheckDone]    = useState(false);
  const [form, setForm] = useState({ stock_id: '', stock_name: '', condition_type: 'price_above', threshold: '' });

  useEffect(() => {
    if (!user || !supabase) return;
    supabase.from('alert_conditions').select('*').eq('user_id', user.id).order('created_at')
      .then(({ data }) => setConditions(data || []));
  }, [user]);

  const saveCondition = async () => {
    if (!user || !supabase || !form.stock_id || !form.condition_type) return;
    const row = {
      user_id:        user.id,
      stock_id:       form.stock_id.trim(),
      stock_name:     form.stock_name.trim(),
      condition_type: form.condition_type,
      threshold:      needsThreshold(form.condition_type) ? parseFloat(form.threshold) || null : null,
      enabled:        true,
    };
    const { data } = await supabase.from('alert_conditions').insert(row).select().single();
    setConditions(prev => [...prev, data]);
    setShowForm(false);
    setForm({ stock_id: '', stock_name: '', condition_type: 'price_above', threshold: '' });
  };

  const deleteCondition = async (id) => {
    if (!user || !supabase) return;
    await supabase.from('alert_conditions').delete().eq('id', id);
    setConditions(prev => prev.filter(c => c.id !== id));
  };

  const toggleEnabled = async (id, cur) => {
    if (!supabase) return;
    await supabase.from('alert_conditions').update({ enabled: !cur }).eq('id', id);
    setConditions(prev => prev.map(c => c.id === id ? { ...c, enabled: !cur } : c));
  };

  const checkNow = async () => {
    const enabled = conditions.filter(c => c.enabled);
    if (!enabled.length) return;
    setChecking(true); setCheckDone(false);
    try {
      const { data } = await axios.post(`${API}/api/v1/alerts/check`, { conditions: enabled });
      setTriggered(data.triggered || []);
    } catch { setTriggered([]); }
    finally { setChecking(false); setCheckDone(true); }
  };

  const condLabel = (c) => {
    const opt = CONDITION_OPTIONS.find(o => o.value === c.condition_type);
    const label = opt?.label || c.condition_type;
    if (needsThreshold(c.condition_type) && c.threshold != null) return `${label} ${c.threshold}元`;
    return label;
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#B5ADA4', fontFamily: "'Noto Serif TC', serif" }}>
        請先登入以使用條件推播功能
      </div>
    );
  }

  return (
    <div>
      <div style={{ ...LBL, marginBottom: 10 }}>Alert Settings</div>
      <h3 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, fontWeight: 400, color: '#3E3A39', margin: '0 0 6px' }}>
        條件型 LINE 推播
      </h3>
      <p style={{ fontSize: 13, color: '#B5ADA4', margin: '0 0 24px', fontFamily: 'monospace' }}>
        設定條件後點「立即檢查」，觸發時透過 LINE 通知你
      </p>

      {/* Condition list */}
      {conditions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <AnimatePresence>
            {conditions.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: '#FFFFFF', border: '1px solid #EDE9E2',
                  padding: '14px 18px', opacity: c.enabled ? 1 : 0.5,
                }}
              >
                <button
                  onClick={() => toggleEnabled(c.id, c.enabled)}
                  style={{
                    width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: c.enabled ? '#4A9B6F' : '#CFC9BF', position: 'relative',
                    flexShrink: 0, transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, left: c.enabled ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF',
                    transition: 'left 0.2s',
                  }} />
                </button>

                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13, color: '#3E3A39' }}>{c.stock_id}</span>
                  {c.stock_name && <span style={{ fontSize: 12, color: '#B5ADA4', marginLeft: 8 }}>{c.stock_name}</span>}
                  <span style={{ fontSize: 12, color: '#A3907C', marginLeft: 12, fontFamily: 'monospace' }}>{condLabel(c)}</span>
                </div>

                <button
                  onClick={() => deleteCondition(c.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFC9BF', fontSize: 16, padding: '2px 6px', lineHeight: 1 }}
                >✕</button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <motion.button
          onClick={() => setShowForm(true)}
          whileHover={{ y: -1 }}
          style={{ padding: '10px 20px', background: '#B85C38', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: "'Noto Serif TC', serif", fontSize: 13 }}
        >
          ＋ 新增條件
        </motion.button>

        {conditions.some(c => c.enabled) && (
          <motion.button
            onClick={checkNow} disabled={checking}
            whileHover={!checking ? { y: -1 } : {}}
            style={{
              padding: '10px 20px', fontSize: 13, cursor: checking ? 'not-allowed' : 'pointer',
              background: 'transparent', border: '1px solid #A3907C', color: '#A3907C',
              fontFamily: "'Noto Serif TC', serif", transition: 'all 0.2s',
            }}
          >
            {checking ? '檢查中⋯' : '立即檢查'}
          </motion.button>
        )}
      </div>

      {/* Check result */}
      <AnimatePresence>
        {checkDone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ background: '#F9F6F0', border: '1px solid #EDE9E2', padding: 20 }}
          >
            {triggered.length === 0 ? (
              <div style={{ color: '#4A9B6F', fontFamily: 'monospace', fontSize: 13 }}>
                ✓ 目前沒有條件被觸發
              </div>
            ) : (
              <>
                <div style={{ color: '#B85C38', fontFamily: 'monospace', fontSize: 12, letterSpacing: 1, marginBottom: 12 }}>
                  ⚡ {triggered.length} 個條件已觸發
                </div>
                {triggered.map((t, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#3E3A39', fontFamily: 'monospace', marginBottom: 6 }}>
                    {t.stock_id} — 現價 {t.current_price} 元
                    {t.ma20 && ` · MA20: ${t.ma20}`}
                    {t.ma60 && ` · MA60: ${t.ma60}`}
                  </div>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add form modal */}
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
                padding: 36, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
              }}
            >
              <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: '#3E3A39', marginBottom: 24 }}>新增條件</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: '股票代號',   key: 'stock_id',   ph: '例：2330',  type: 'text' },
                  { label: '股票名稱',   key: 'stock_name', ph: '例：台積電', type: 'text' },
                ].map(({ label, key, ph, type }) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={LBL}>{label}</label>
                    <input type={type} style={INP} placeholder={ph} value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      onFocus={e => e.target.style.borderColor = '#A3907C'}
                      onBlur={e  => e.target.style.borderColor = '#EDE9E2'}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={LBL}>條件類型</label>
                  <select
                    value={form.condition_type}
                    onChange={e => setForm(f => ({ ...f, condition_type: e.target.value }))}
                    style={{ ...INP, background: '#F9F6F0' }}
                  >
                    {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {needsThreshold(form.condition_type) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={LBL}>目標價（元）</label>
                    <input type="number" style={INP} placeholder="例：600" value={form.threshold}
                      onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
                      onFocus={e => e.target.style.borderColor = '#A3907C'}
                      onBlur={e  => e.target.style.borderColor = '#EDE9E2'}
                    />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <motion.button
                  onClick={saveCondition} whileHover={{ y: -1 }}
                  style={{ flex: 1, padding: '12px', background: '#B85C38', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: "'Noto Serif TC', serif", fontSize: 14 }}
                >確認</motion.button>
                <button onClick={() => setShowForm(false)}
                  style={{ padding: '12px 20px', background: 'none', border: '1px solid #EDE9E2', color: '#857870', cursor: 'pointer', fontFamily: "'Noto Serif TC', serif", fontSize: 14 }}>
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
