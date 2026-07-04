import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RISK_OPTIONS = ['保守', '穩健', '積極'];
const LEVEL_OPTIONS = ['新手', '進階', '專業'];
const INDUSTRY_OPTIONS = ['半導體', 'AI', '金融', '傳產', '科技製造', '生技', '電商', '伺服器', '石化'];

export default function ProfileModal({ profile, saving, onSave, onClose }) {
  const [draft, setDraft] = useState({ ...profile });

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

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(62,58,57,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
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
          padding: '40px 44px',
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
              <button
                key={opt}
                onClick={() => setDraft(d => ({ ...d, risk_tolerance: opt }))}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 14, cursor: 'pointer',
                  fontFamily: "'Noto Serif TC', serif",
                  background: draft.risk_tolerance === opt ? '#3E3A39' : '#F9F6F0',
                  color: draft.risk_tolerance === opt ? '#F9F6F0' : '#857870',
                  border: draft.risk_tolerance === opt ? '1px solid #3E3A39' : '1px solid #EDE9E2',
                  transition: 'all 0.2s',
                }}
              >
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
              <button
                key={opt}
                onClick={() => setDraft(d => ({ ...d, knowledge_level: opt }))}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 14, cursor: 'pointer',
                  fontFamily: "'Noto Serif TC', serif",
                  background: draft.knowledge_level === opt ? '#B85C38' : '#F9F6F0',
                  color: draft.knowledge_level === opt ? '#FFFFFF' : '#857870',
                  border: draft.knowledge_level === opt ? '1px solid #B85C38' : '1px solid #EDE9E2',
                  transition: 'all 0.2s',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Industries */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 13, color: '#857870', marginBottom: 12, fontFamily: "'Noto Serif TC', serif" }}>
            關注產業（可複選）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {INDUSTRY_OPTIONS.map(ind => {
              const active = draft.industries.includes(ind);
              return (
                <button
                  key={ind}
                  onClick={() => toggleIndustry(ind)}
                  style={{
                    padding: '7px 16px', fontSize: 13, cursor: 'pointer',
                    fontFamily: "'Noto Serif TC', serif",
                    background: active ? 'rgba(163,144,124,0.15)' : 'transparent',
                    color: active ? '#A3907C' : '#B5ADA4',
                    border: active ? '1px solid #A3907C' : '1px solid #EDE9E2',
                    transition: 'all 0.2s',
                  }}
                >
                  {active ? '✓ ' : ''}{ind}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <motion.button
          whileHover={{ y: -1, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.985 }}
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px 0', fontSize: 15,
            background: '#3E3A39', color: '#F9F6F0',
            border: 'none', cursor: saving ? 'wait' : 'pointer',
            fontFamily: "'Noto Serif TC', serif", letterSpacing: 1,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? '儲存中⋯' : '儲存設定'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
