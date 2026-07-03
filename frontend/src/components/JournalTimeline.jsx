import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const PRESET_TAGS = [
  '#FOMO追高', '#紀律停損', '#看對方向', '#過早出場',
  '#停損守住', '#猶豫錯過', '#順勢操作', '#逆勢硬撐',
  '#主力洗盤', '#散戶陷阱',
];

const ACTION_CLR = { '買入': '#4A9B6F', '賣出': '#C0392B', '觀察': '#A3907C' };

const labelSt = {
  display: 'block', fontSize: '10px', fontFamily: 'monospace',
  letterSpacing: '1.5px', textTransform: 'uppercase', color: '#B5ADA4', marginBottom: '6px',
};
const ulInput = {
  width: '100%', padding: '10px 0', fontSize: '15px',
  background: 'transparent', color: '#3E3A39',
  border: 'none', borderBottom: '1px solid #CFC9BF',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  fontFamily: "'Noto Serif TC', 'Georgia', serif",
};
const focus = e => (e.target.style.borderBottomColor = '#A3907C');
const blur  = e => (e.target.style.borderBottomColor = '#CFC9BF');

/* ── Deep Insights Card ──────────────────────────────────────── */
function DeepInsightsCard({ entries }) {
  const [insights, setInsights] = useState('');
  const [loading,  setLoading]  = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const allTags   = entries.flatMap(e => e.tags || []);
      const tagCounts = allTags.reduce((a, t) => ({ ...a, [t]: (a[t] || 0) + 1 }), {});
      const { data } = await axios.post(`${API}/api/v1/journal/insights`, {
        tag_counts: tagCounts, entry_count: entries.length,
      });
      setInsights(data.insights || '');
    } catch {
      setInsights('生成失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: '#FFFFFF', border: '1px solid #EDE9E2',
        padding: '28px 32px', marginBottom: '40px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: '16px', color: '#3E3A39', fontWeight: 500 }}>
          ✨ 職人沉澱報告
        </div>
        <motion.button
          onClick={generate} disabled={loading}
          whileHover={{ y: -1, transition: { duration: 0.2 } }}
          style={{
            padding: '7px 18px', fontSize: '12px',
            background: 'transparent', border: '1px solid #CFC9BF',
            color: '#857870', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Noto Serif TC', serif",
          }}
        >
          {loading ? '生成中⋯' : '生成報告'}
        </motion.button>
      </div>

      {insights ? (
        <p style={{
          fontFamily: "'Noto Serif TC', serif",
          fontSize: '15px', lineHeight: 1.9, color: '#857870', margin: 0,
        }}>
          {insights}
        </p>
      ) : (
        <p style={{ color: '#B5ADA4', fontSize: '12px', fontFamily: 'monospace', margin: 0 }}>
          已記錄 {entries.length} 筆交易。點擊「生成報告」，由 AI 統整你的操作習慣模式。
        </p>
      )}
    </motion.div>
  );
}

/* ── Timeline Entry Card ─────────────────────────────────────── */
function TimelineEntry({ entry, index }) {
  const clr  = ACTION_CLR[entry.action] || '#A3907C';
  const date = entry.created_at
    ? new Date(entry.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: index * 0.06 }}
      style={{ display: 'flex', gap: '0', marginBottom: '28px' }}
    >
      {/* Circle node */}
      <div style={{
        width: 40, flexShrink: 0, display: 'flex',
        justifyContent: 'center', paddingTop: 22, position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', background: clr,
          boxShadow: `0 0 0 3px #F9F6F0, 0 0 0 4px ${clr}55`,
        }} />
      </div>

      {/* Card */}
      <motion.div
        whileHover={{ boxShadow: '0 8px 32px rgba(0,0,0,0.07)', transition: { duration: 0.3 } }}
        style={{
          flex: 1, background: '#FFFFFF',
          border: '1px solid #EDE9E2', padding: '20px 24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: '17px', fontWeight: 600, color: '#3E3A39' }}>
              {entry.stock_symbol}
            </span>
            <span style={{
              fontSize: '11px', padding: '2px 9px',
              background: `${clr}14`, color: clr,
              border: `1px solid ${clr}38`,
              fontFamily: "'Noto Serif TC', serif",
            }}>
              {entry.action}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#B5ADA4', fontFamily: 'monospace' }}>{date}</span>
        </div>

        {/* Note */}
        {entry.note && (
          <p style={{ fontSize: '14px', color: '#3E3A39', lineHeight: 1.8, margin: '0 0 14px 0' }}>
            {entry.note}
          </p>
        )}

        {/* Tags — embossed pill style */}
        {entry.tags && entry.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {entry.tags.map(tag => (
              <span key={tag} style={{
                fontSize: '11px', padding: '3px 10px',
                background: '#F9F6F0', color: '#857870',
                border: '1px solid #E8E3DC',
                borderRadius: '3px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
                fontFamily: 'monospace', letterSpacing: '0.3px',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* AI Feedback */}
        {entry.ai_feedback && (
          <div style={{
            padding: '12px 16px',
            background: '#FAFAF8',
            borderLeft: '2px solid #CFC9BF',
            marginTop: '4px',
          }}>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', letterSpacing: '1.5px', color: '#C5BDB4', marginBottom: '6px', textTransform: 'uppercase' }}>
              AI 評語
            </div>
            <p style={{
              fontFamily: "'Noto Serif TC', serif",
              fontSize: '13px', color: '#9A928A', lineHeight: 1.85, margin: 0,
            }}>
              {entry.ai_feedback}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export default function JournalTimeline({ supabase, user }) {
  const [entries,       setEntries]       = useState([]);
  const [showForm,      setShowForm]      = useState(false);
  const [form,          setForm]          = useState({ stock_symbol: '', action: '買入', note: '' });
  const [selectedTags,  setSelectedTags]  = useState([]);
  const [customTag,     setCustomTag]     = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error,         setError]         = useState('');

  useEffect(() => {
    if (user && supabase) load();
  }, [user]);

  async function load() {
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);
    setEntries(data || []);
  }

  function toggleTag(tag) {
    setSelectedTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);
  }

  function addCustom() {
    const t = customTag.trim().startsWith('#') ? customTag.trim() : `#${customTag.trim()}`;
    if (t.length > 1 && !selectedTags.includes(t)) setSelectedTags(p => [...p, t]);
    setCustomTag('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.stock_symbol || !form.note) { setError('請填寫股票代號和覆盤筆記'); return; }
    setError(''); setSubmitLoading(true);
    try {
      let aiFeedback = '';
      try {
        const { data } = await axios.post(`${API}/api/v1/journal/entry-feedback`, {
          stock_symbol: form.stock_symbol, action: form.action, note: form.note,
        });
        aiFeedback = data.feedback || '';
      } catch {}

      await supabase.from('journal_entries').insert({
        user_id: user.id,
        stock_symbol: form.stock_symbol.toUpperCase(),
        action: form.action, note: form.note,
        tags: selectedTags, ai_feedback: aiFeedback,
      });

      setForm({ stock_symbol: '', action: '買入', note: '' });
      setSelectedTags([]); setShowForm(false);
      load();
    } catch {
      setError('儲存失敗，請稍後再試');
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div>
      {/* Deep Insights */}
      {entries.length >= 3 && <DeepInsightsCard entries={entries} />}

      {/* Toggle form button */}
      <div style={{ marginBottom: '32px' }}>
        <motion.button
          onClick={() => setShowForm(!showForm)}
          whileHover={{ y: -1, transition: { duration: 0.2 } }}
          style={{
            padding: '11px 26px', fontSize: '14px',
            background: showForm ? '#3E3A39' : 'transparent',
            color: showForm ? '#FFFFFF' : '#3E3A39',
            border: '1px solid #3E3A39', cursor: 'pointer',
            fontFamily: "'Noto Serif TC', serif", transition: 'all 0.25s',
          }}
        >
          {showForm ? '✕ 收起' : '＋ 新增覆盤'}
        </motion.button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4 }}
            style={{ overflow: 'hidden', marginBottom: '40px' }}
          >
            <form onSubmit={handleSubmit} style={{
              background: '#FFFFFF', border: '1px solid #EDE9E2',
              padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            }}>
              {/* Stock + Action */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '32px', marginBottom: '28px', alignItems: 'end' }}>
                <div>
                  <label style={labelSt}>股票代號</label>
                  <input style={ulInput} placeholder="例：2330" value={form.stock_symbol}
                    onChange={e => setForm(f => ({ ...f, stock_symbol: e.target.value }))}
                    onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelSt}>動作</label>
                  <div style={{ display: 'flex', gap: '6px', paddingBottom: '1px' }}>
                    {['買入', '賣出', '觀察'].map(a => (
                      <button key={a} type="button" onClick={() => setForm(f => ({ ...f, action: a }))}
                        style={{
                          padding: '7px 14px', fontSize: '13px',
                          background: form.action === a ? ACTION_CLR[a] : 'transparent',
                          color: form.action === a ? '#FFFFFF' : '#857870',
                          border: `1px solid ${form.action === a ? ACTION_CLR[a] : '#EDE9E2'}`,
                          cursor: 'pointer', fontFamily: "'Noto Serif TC', serif", transition: 'all 0.2s',
                        }}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Note */}
              <div style={{ marginBottom: '28px' }}>
                <label style={labelSt}>覆盤筆記</label>
                <textarea style={{ ...ulInput, resize: 'vertical', minHeight: '84px', lineHeight: 1.8 }}
                  placeholder="這筆交易哪裡做對了？哪裡可以改善？"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  onFocus={focus} onBlur={blur} />
              </div>

              {/* Tags */}
              <div style={{ marginBottom: '28px' }}>
                <label style={labelSt}>標籤（可多選）</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '10px' }}>
                  {PRESET_TAGS.map(tag => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)}
                      style={{
                        fontSize: '12px', padding: '4px 12px', cursor: 'pointer',
                        background: selectedTags.includes(tag) ? '#3E3A39' : '#F9F6F0',
                        color: selectedTags.includes(tag) ? '#FFFFFF' : '#857870',
                        border: `1px solid ${selectedTags.includes(tag) ? '#3E3A39' : '#EDE9E2'}`,
                        fontFamily: 'monospace', transition: 'all 0.2s',
                      }}>
                      {tag}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <input style={{ ...ulInput, flex: 1 }} placeholder="自訂標籤（Enter 加入）"
                    value={customTag} onChange={e => setCustomTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                    onFocus={focus} onBlur={blur} />
                  <button type="button" onClick={addCustom}
                    style={{ padding: '0 16px', background: 'none', border: '1px solid #EDE9E2', color: '#857870', cursor: 'pointer', fontSize: '13px' }}>
                    加入
                  </button>
                </div>
              </div>

              {error && <p style={{ color: '#C0392B', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

              <motion.button type="submit" disabled={submitLoading}
                whileHover={{ y: -1, transition: { duration: 0.2 } }}
                style={{
                  padding: '13px 36px', fontSize: '14px',
                  background: submitLoading ? '#CFC9BF' : '#3E3A39',
                  color: '#FFFFFF', border: 'none',
                  cursor: submitLoading ? 'not-allowed' : 'pointer',
                  fontFamily: "'Noto Serif TC', serif", letterSpacing: '1px',
                }}>
                {submitLoading ? '記錄中⋯' : '送出並請求 AI 評語'}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      {entries.length > 0 ? (
        <div style={{ position: 'relative' }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute', left: 19, top: 28, bottom: 28,
            width: 1,
            background: 'linear-gradient(to bottom, transparent, #A3907C 8%, #A3907C 92%, transparent)',
            opacity: 0.45,
            pointerEvents: 'none',
          }} />
          {entries.map((entry, i) => (
            <TimelineEntry key={entry.id} entry={entry} index={i} />
          ))}
        </div>
      ) : (
        <div style={{
          padding: '64px 32px', textAlign: 'center',
          border: '1px dashed #EDE9E2', color: '#B5ADA4',
        }}>
          <p style={{ fontFamily: "'Noto Serif TC', serif", fontSize: '15px', marginBottom: '8px', color: '#857870' }}>
            尚未記錄任何交易
          </p>
          <p style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            點擊上方「新增覆盤」開始你的第一筆手札
          </p>
        </div>
      )}
    </div>
  );
}
