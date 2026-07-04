import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useResponsive } from '../hooks/useResponsive';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const RISK_OPTIONS     = ['保守', '穩健', '積極'];
const LEVEL_OPTIONS    = ['新手', '進階', '專業'];
const INDUSTRY_OPTIONS = ['半導體', 'AI', '金融', '傳產', '科技製造', '生技', '電商', '伺服器', '石化'];

/* ── LINE 綁定區塊 ── */
function LineBindSection({ user, lineBound, onBound }) {
  const [code,      setCode]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [copied,    setCopied]    = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const generateCode = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/v1/line/generate-code`, { user_id: user.id });
      setCode(data.code);
      setCountdown(300);
      clearInterval(timer.current);
      timer.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timer.current); setCode(''); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch { /* silently fail */ }
    setLoading(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const fmtCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 13, color: '#857870', marginBottom: 12, fontFamily: "'Noto Serif TC', serif", display: 'flex', alignItems: 'center', gap: 10 }}>
        LINE 推播綁定
        {lineBound && (
          <span style={{ fontSize: 11, color: '#4A9B6F', fontFamily: 'monospace', background: 'rgba(74,155,111,0.1)', padding: '2px 8px', border: '1px solid rgba(74,155,111,0.3)' }}>
            ✓ 已綁定
          </span>
        )}
      </div>

      {lineBound ? (
        <div style={{ fontSize: 13, color: '#B5ADA4', fontFamily: 'monospace', lineHeight: 1.8 }}>
          LINE 帳號已連結。條件觸發時會直接推播給你，在 LINE 也可以直接問 AI 助手。
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 12, color: '#B5ADA4', fontFamily: 'monospace', marginBottom: 12, lineHeight: 1.7 }}>
            1. 點下方按鈕取得驗證碼<br />
            2. 加入 AlphaVision LINE 官方帳號<br />
            3. 把 6 位數驗證碼傳給 LINE bot
          </div>

          {!code ? (
            <motion.button
              onClick={generateCode} disabled={loading}
              whileHover={!loading ? { y: -1 } : {}}
              style={{
                padding: '10px 20px', fontSize: 13, cursor: loading ? 'wait' : 'pointer',
                background: 'transparent', border: '1px solid #A3907C', color: '#A3907C',
                fontFamily: "'Noto Serif TC', serif", transition: 'all 0.2s',
              }}
            >
              {loading ? '產生中⋯' : '產生驗證碼'}
            </motion.button>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
              >
                <div style={{
                  fontFamily: 'monospace', fontSize: 28, letterSpacing: 8,
                  color: '#3E3A39', padding: '10px 20px',
                  background: '#F9F6F0', border: '1px solid #EDE9E2',
                }}>
                  {code}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    onClick={copyCode}
                    style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer', background: copied ? '#4A9B6F' : 'transparent', color: copied ? '#FFFFFF' : '#857870', border: '1px solid #EDE9E2', fontFamily: 'monospace', transition: 'all 0.2s' }}
                  >
                    {copied ? '✓ 已複製' : '複製'}
                  </button>
                  <span style={{ fontSize: 11, color: '#CFC9BF', fontFamily: 'monospace' }}>
                    剩 {fmtCountdown(countdown)}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main modal ── */
export default function ProfileModal({ profile, saving, onSave, onClose, user }) {
  const { isMobile } = useResponsive();
  const [draft, setDraft] = useState({ ...profile });

  useEffect(() => { setDraft({ ...profile }); }, [profile]);

  const toggleIndustry = (ind) => {
    setDraft(prev => ({
      ...prev,
      industries: prev.industries.includes(ind)
        ? prev.industries.filter(x => x !== ind)
        : [...prev.industries, ind],
    }));
  };

  const handleSave = async () => {
    await onSave(draft);
    onClose();
  };

  const lineBound = Boolean(profile?.line_user_id);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(62,58,57,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, overflowY: 'auto',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF', border: '1px solid #EDE9E2',
          boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
          width: '100%', maxWidth: 520,
          padding: isMobile ? '28px 20px' : '40px 44px',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 6 }}>
              Investor Profile
            </div>
            <h2 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 400, color: '#3E3A39', margin: 0 }}>
              個人化偏好設定
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B5ADA4', fontSize: 20, padding: '4px 8px' }}>
            ✕
          </button>
        </div>

        {/* Risk */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: '#857870', marginBottom: 12, fontFamily: "'Noto Serif TC', serif" }}>風險承受度</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {RISK_OPTIONS.map(opt => (
              <button key={opt} onClick={() => setDraft(d => ({ ...d, risk_tolerance: opt }))}
                style={{ flex: 1, padding: '10px 0', fontSize: 14, cursor: 'pointer', fontFamily: "'Noto Serif TC', serif",
                  background: draft.risk_tolerance === opt ? '#3E3A39' : '#F9F6F0',
                  color: draft.risk_tolerance === opt ? '#F9F6F0' : '#857870',
                  border: draft.risk_tolerance === opt ? '1px solid #3E3A39' : '1px solid #EDE9E2', transition: 'all 0.2s' }}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Knowledge */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: '#857870', marginBottom: 12, fontFamily: "'Noto Serif TC', serif" }}>投資知識水平</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {LEVEL_OPTIONS.map(opt => (
              <button key={opt} onClick={() => setDraft(d => ({ ...d, knowledge_level: opt }))}
                style={{ flex: 1, padding: '10px 0', fontSize: 14, cursor: 'pointer', fontFamily: "'Noto Serif TC', serif",
                  background: draft.knowledge_level === opt ? '#B85C38' : '#F9F6F0',
                  color: draft.knowledge_level === opt ? '#FFFFFF' : '#857870',
                  border: draft.knowledge_level === opt ? '1px solid #B85C38' : '1px solid #EDE9E2', transition: 'all 0.2s' }}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Industries */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: '#857870', marginBottom: 12, fontFamily: "'Noto Serif TC', serif" }}>關注產業（可複選）</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {INDUSTRY_OPTIONS.map(ind => {
              const active = draft.industries.includes(ind);
              return (
                <button key={ind} onClick={() => toggleIndustry(ind)}
                  style={{ padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontFamily: "'Noto Serif TC', serif",
                    background: active ? 'rgba(163,144,124,0.15)' : 'transparent',
                    color: active ? '#A3907C' : '#B5ADA4',
                    border: active ? '1px solid #A3907C' : '1px solid #EDE9E2', transition: 'all 0.2s' }}>
                  {active ? '✓ ' : ''}{ind}
                </button>
              );
            })}
          </div>
        </div>

        {/* LINE binding */}
        <div style={{ borderTop: '1px solid #EDE9E2', paddingTop: 24, marginBottom: 28 }}>
          <LineBindSection user={user} lineBound={lineBound} />
        </div>

        {/* Save */}
        <motion.button
          whileHover={{ y: -1, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.985 }}
          onClick={handleSave} disabled={saving}
          style={{
            width: '100%', padding: '14px 0', fontSize: 15,
            background: '#3E3A39', color: '#F9F6F0',
            border: 'none', cursor: saving ? 'wait' : 'pointer',
            fontFamily: "'Noto Serif TC', serif", letterSpacing: 1, opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? '儲存中⋯' : '儲存設定'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
