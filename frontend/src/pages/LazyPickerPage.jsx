import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useResponsive } from '../hooks/useResponsive';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const RISK_OPTIONS = ['保守配息', '平衡型', '成長趨勢'];

const BADGE = {
  bullish:    { bg: 'rgba(74,155,111,0.09)',  color: '#4A9B6F', border: 'rgba(74,155,111,0.28)' },
  bearish:    { bg: 'rgba(192,57,43,0.07)',   color: '#C0392B', border: 'rgba(192,57,43,0.22)' },
  oversold:   { bg: 'rgba(163,144,124,0.10)', color: '#A3907C', border: 'rgba(163,144,124,0.3)' },
  overbought: { bg: 'rgba(184,92,56,0.09)',   color: '#B85C38', border: 'rgba(184,92,56,0.28)' },
};

const FU = (d = 0) => ({
  initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: d },
});

function PickCard({ pick, index }) {
  const { isMobile } = useResponsive();
  const bStyle = BADGE.bullish;
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{
        opacity: 1, y: 0,
        boxShadow: [
          '0 4px 20px rgba(0,0,0,0.04)',
          '0 8px 36px rgba(163,144,124,0.16)',
          '0 4px 20px rgba(0,0,0,0.04)',
        ],
      }}
      transition={{
        opacity: { duration: 0.6, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] },
        y:       { duration: 0.6, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] },
        boxShadow: { repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: index * 1.4 },
      }}
      style={{
        background: '#FFFFFF', border: '1px solid #EDE9E2',
        padding: isMobile ? '24px 20px' : '36px 40px', position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Stock identity */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 6 }}>
        <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 32, fontWeight: 600, color: '#3E3A39', lineHeight: 1 }}>
          {pick.name}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#B5ADA4', paddingBottom: 4 }}>
          {pick.stock_id}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1,
          color: '#A3907C', background: 'rgba(163,144,124,0.08)',
          border: '1px solid rgba(163,144,124,0.18)', padding: '3px 10px',
        }}>
          {pick.sector}
        </span>
      </div>

      {/* Stat row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? 16 : 24,
        marginBottom: 28, paddingTop: 16, borderTop: '1px solid #F0ECE7',
      }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 4 }}>
            Market Price
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 22, color: '#3E3A39' }}>
            {pick.current_price.toFixed(1)}
            <span style={{ fontSize: 12, color: '#B5ADA4', marginLeft: 4 }}>元</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 4 }}>
            建議零股
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 22, color: '#B85C38' }}>
            {pick.suggested_shares}
            <span style={{ fontSize: 12, color: '#B5ADA4', marginLeft: 4 }}>股</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 4 }}>
            預計花費
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 22, color: '#3E3A39' }}>
            {pick.estimated_cost.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}
            <span style={{ fontSize: 12, color: '#B5ADA4', marginLeft: 4 }}>元</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 4 }}>
            剩餘預備金
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 22, color: '#4A9B6F' }}>
            {Math.max(0, pick.remaining_budget).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}
            <span style={{ fontSize: 12, color: '#B5ADA4', marginLeft: 4 }}>元</span>
          </div>
        </div>
      </div>

      {/* AI rationale */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 10 }}>
          投資職人觀點
        </div>
        <p style={{
          fontFamily: "'Noto Serif TC', serif", fontSize: 15, color: '#3E3A39',
          lineHeight: 1.9, margin: '0 0 12px',
          paddingLeft: 14, borderLeft: '2px solid #EDE9E2',
        }}>
          {pick.rationale}
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#857870', margin: 0, lineHeight: 1.7 }}>
          {pick.allocation}
        </p>
      </div>

      {/* TA pattern badges */}
      {pick.ta_patterns?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 16, borderTop: '1px solid #F0ECE7' }}>
          {pick.ta_patterns.map((p, i) => {
            const s = BADGE[p.type] || bStyle;
            return (
              <span key={i} style={{
                fontSize: 12, padding: '4px 11px',
                background: s.bg, color: s.color,
                border: `1px solid ${s.border}`, borderRadius: 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)',
                fontFamily: "'Noto Serif TC', serif",
              }}>
                {p.label}
              </span>
            );
          })}
        </div>
      )}

      {/* rank badge */}
      <div style={{
        position: 'absolute', top: 24, right: 24,
        fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
        color: '#CFC9BF',
      }}>
        #{String(index + 1).padStart(2, '0')}
      </div>
    </motion.div>
  );
}

export default function LazyPickerPage() {
  const { isMobile } = useResponsive();
  const [budget,   setBudget]   = useState('5000');
  const [riskPref, setRiskPref] = useState('平衡型');
  const [picks,    setPicks]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');

  async function run() {
    const b = parseFloat(budget);
    if (!b || b < 100) { setError('請輸入有效預算（最低 100 元）'); return; }
    setLoading(true); setPicks([]); setDone(false); setError('');
    try {
      const { data } = await axios.post(`${API}/api/v1/lazy-picker`, { budget: b, risk_pref: riskPref }, { timeout: 90000 });
      setPicks(data.picks || []);
      setDone(true);
    } catch (err) {
      const msg = err.response?.data?.detail || '選股失敗，請確認後端服務正在運行';
      setError(msg);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '48px 52px 100px' }}>

      {/* Page header */}
      <motion.div {...FU()} style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 10 }}>
          Lazy Investor · Fractional Share Picker
        </div>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 32, fontWeight: 400, color: '#3E3A39', margin: '0 0 10px' }}>
          零股懶人選股器
        </h1>
        <p style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 14, color: '#857870', margin: 0, lineHeight: 1.9 }}>
          輸入可動用資金，AI 即時篩選籌碼集中、站上 60MA 多頭格局的台股標的<br />
          告訴你「買幾股」「花多少」「剩多少預備金」——懶人也能做出職人決策
        </p>
      </motion.div>

      {/* Input panel */}
      <motion.div {...FU(0.06)}
        style={{
          background: '#FFFFFF', border: '1px solid #EDE9E2',
          padding: isMobile ? '24px 20px' : '40px 44px', marginBottom: 40,
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 24 : 40, marginBottom: 36 }}>
          {/* Budget input */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 14 }}>
              可動用資金（元）
            </label>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '1px solid #EDE9E2', paddingBottom: 10 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 18, color: '#B5ADA4' }}>NT$</span>
              <input
                type="number" min={100} step={500}
                value={budget}
                onChange={e => setBudget(e.target.value)}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontFamily: 'monospace', fontSize: 26, color: '#3E3A39',
                  padding: 0,
                }}
                placeholder="5000"
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              {[3000, 5000, 10000, 20000].map(v => (
                <button key={v} onClick={() => setBudget(String(v))}
                  style={{
                    padding: '4px 10px', fontSize: 11,
                    background: budget === String(v) ? 'rgba(163,144,124,0.12)' : 'none',
                    border: '1px solid #EDE9E2', cursor: 'pointer',
                    color: budget === String(v) ? '#3E3A39' : '#B5ADA4',
                    fontFamily: 'monospace',
                  }}>
                  {v >= 10000 ? `${v / 10000}萬` : v}
                </button>
              ))}
            </div>
          </div>

          {/* Risk preference */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.5, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 14 }}>
              偏好風險屬性
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {RISK_OPTIONS.map(opt => {
                const active = riskPref === opt;
                const desc = {
                  '保守配息': '金融 · 公用 · 配息穩定',
                  '平衡型':   '科技 + 傳產 · 兼顧成長與穩定',
                  '成長趨勢': '半導體 · AI供應鏈 · 高成長',
                }[opt];
                return (
                  <button key={opt} onClick={() => setRiskPref(opt)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: active ? '#3E3A39' : '#FFFFFF',
                      border: `1px solid ${active ? '#3E3A39' : '#EDE9E2'}`,
                      cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                    }}>
                    <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 14, color: active ? '#F9F6F0' : '#3E3A39' }}>
                      {opt}
                    </span>
                    <span style={{ fontSize: 11, color: active ? 'rgba(249,246,240,0.55)' : '#B5ADA4', fontFamily: 'monospace' }}>
                      {desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit row */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 12 : 0 }}>
          <p style={{ fontSize: 12, color: '#B5ADA4', fontFamily: 'monospace', margin: 0, lineHeight: 1.7 }}>
            篩選條件：60MA 多頭 + 籌碼集中 · AI 職人觀點 · 平行運算約需 20–40 秒
          </p>
          <motion.button onClick={run} disabled={loading}
            whileHover={!loading ? { y: -1, backgroundColor: '#9E4E2F', transition: { duration: 0.3 } } : {}}
            style={{
              padding: '14px 40px', fontSize: 15,
              background: loading ? '#CFC9BF' : '#B85C38',
              color: '#FFFFFF', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Noto Serif TC', serif", letterSpacing: 1,
            }}>
            {loading ? '選股中⋯' : '💰 開始選股'}
          </motion.button>
        </div>
      </motion.div>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ padding: '52px 0', textAlign: 'center' }}
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              style={{ fontSize: 36, marginBottom: 20 }}
            >
              💰
            </motion.div>
            <motion.p
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              style={{ fontFamily: "'Noto Serif TC', serif", color: '#857870', fontSize: 15, margin: '0 0 8px' }}
            >
              正在為您搜尋最值得布局的零股⋯
            </motion.p>
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#CFC9BF', margin: 0, letterSpacing: 1 }}>
              平行分析 · AI 職人評估中
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p {...FU()} style={{ color: '#C0392B', fontSize: 13, fontFamily: 'monospace', marginBottom: 24 }}>
          {error}
        </motion.p>
      )}

      {/* Results */}
      <AnimatePresence>
        {done && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{
              fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
              color: '#B5ADA4', marginBottom: 24,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span>精選 {picks.length} 支標的</span>
              <div style={{ flex: 1, height: 1, background: '#EDE9E2' }} />
              <span>{riskPref} · 預算 NT$ {parseFloat(budget).toLocaleString('zh-TW', { maximumFractionDigits: 0 })} 元</span>
            </div>

            {picks.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', border: '1px dashed #EDE9E2' }}>
                <p style={{ fontFamily: "'Noto Serif TC', serif", color: '#857870', fontSize: 15 }}>
                  目前市況無符合 60MA 多頭條件的標的，請放寬偏好或稍後再試
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {picks.map((p, i) => <PickCard key={p.stock_id} pick={p} index={i} />)}
              </div>
            )}

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: picks.length * 0.15 + 0.5 }}
              style={{ marginTop: 36, padding: '20px 24px', background: 'rgba(163,144,124,0.06)', border: '1px solid #EDE9E2' }}
            >
              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#B5ADA4', margin: 0, lineHeight: 1.8, letterSpacing: 0.5 }}>
                ⚠ 以上選股結果僅供參考，不構成投資建議。零股交易存在流動性風險，請依個人財務狀況審慎評估。
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
