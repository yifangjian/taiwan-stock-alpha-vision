import { motion, AnimatePresence } from 'framer-motion';

const NAV = [
  { icon: '📊', label: '戰情中心',    id: 's01' },
  { icon: '🔍', label: '籌碼 X 光機', id: 's03' },
  { icon: '📓', label: '投資手札',    id: 's06' },
];

export default function Sidebar({ open, onClose }) {
  const go = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(62,58,57,0.38)',
              backdropFilter: 'blur(3px)',
            }}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: 264, zIndex: 201,
              background: 'rgba(249,246,240,0.94)',
              backdropFilter: 'blur(18px)',
              borderRight: '1px solid #EDE9E2',
              display: 'flex', flexDirection: 'column',
              padding: '0',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '28px 28px 24px',
              borderBottom: '1px solid #EDE9E2',
            }}>
              <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: '16px', color: '#3E3A39', fontWeight: 500 }}>
                AlphaVision
              </span>
              <button onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#B5ADA4', fontSize: '18px', lineHeight: 1, padding: '2px 4px',
              }}>
                ✕
              </button>
            </div>

            {/* Nav */}
            <nav style={{ padding: '20px 16px', flex: 1 }}>
              {NAV.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => go(item.id)}
                  whileHover={{ x: 5, color: '#A3907C', transition: { duration: 0.2 } }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    width: '100%', padding: '14px 14px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '15px', color: '#3E3A39',
                    fontFamily: "'Noto Serif TC', serif",
                    textAlign: 'left', borderRadius: '6px',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(163,144,124,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </motion.button>
              ))}
            </nav>

            {/* Footer */}
            <div style={{ padding: '20px 28px', borderTop: '1px solid #EDE9E2' }}>
              <p style={{ fontSize: '11px', color: '#B5ADA4', fontFamily: 'monospace', letterSpacing: '1px', margin: 0 }}>
                數據僅供參考，不構成投資建議
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
