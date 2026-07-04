import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const NAV = [
  { icon: '🤖', label: 'AI 選股助手', path: '/assistant', featured: true },
  { icon: '💰', label: '零股選股器',  path: '/lazy-picker' },
  { icon: '📊', label: '戰情中心',    path: '/dashboard' },
  { icon: '🔍', label: '個股分析',    path: '/analysis' },
  { icon: '🔎', label: '選股濾網',    path: '/screener' },
  { icon: '📓', label: '投資手札',    path: '/journal' },
];

export default function Sidebar({ open, onClose, onOpenProfile }) {
  const navigate  = useNavigate();
  const location  = useLocation();

  const go = (path) => { navigate(path); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(62,58,57,0.38)', backdropFilter: 'blur(3px)' }}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: 260, zIndex: 201,
              background: 'rgba(249,246,240,0.95)',
              backdropFilter: 'blur(18px)',
              borderRight: '1px solid #EDE9E2',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '28px 28px 24px', borderBottom: '1px solid #EDE9E2',
            }}>
              <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: '#3E3A39', fontWeight: 500 }}>
                AlphaVision
              </span>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B5ADA4', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>
                ✕
              </button>
            </div>

            {/* Nav */}
            <nav style={{ padding: '20px 12px', flex: 1 }}>
              {NAV.map((item, i) => {
                const active = location.pathname === item.path;
                return (
                  <motion.button
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => go(item.path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      width: '100%', padding: '13px 16px',
                      background: item.featured && !active
                        ? 'rgba(184,92,56,0.06)'
                        : active ? 'rgba(163,144,124,0.12)' : 'none',
                      border: 'none', cursor: 'pointer',
                      fontSize: 15,
                      color: active ? '#3E3A39' : item.featured ? '#B85C38' : '#857870',
                      fontFamily: "'Noto Serif TC', serif",
                      textAlign: 'left', borderRadius: 6,
                      transition: 'all 0.2s',
                      borderLeft: active ? '2px solid #A3907C' : item.featured ? '2px solid rgba(184,92,56,0.3)' : '2px solid transparent',
                    }}
                    onMouseEnter={e => !active && (e.currentTarget.style.background = 'rgba(163,144,124,0.06)')}
                    onMouseLeave={e => !active && (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </motion.button>
                );
              })}
            </nav>

            {/* Footer: profile + disclaimer */}
            <div style={{ padding: '16px 16px 20px', borderTop: '1px solid #EDE9E2' }}>
              {onOpenProfile && (
                <motion.button
                  whileHover={{ background: 'rgba(163,144,124,0.06)', transition: { duration: 0.2 } }}
                  onClick={onOpenProfile}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '10px 12px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: "'Noto Serif TC', serif", fontSize: 14,
                    color: '#A3907C', textAlign: 'left', borderRadius: 6,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 15 }}>⚙️</span>
                  <span>個人偏好設定</span>
                </motion.button>
              )}
              <p style={{ fontSize: 11, color: '#CFC9BF', fontFamily: 'monospace', letterSpacing: 1, margin: 0, paddingLeft: 12 }}>
                數據僅供參考，不構成投資建議
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
