import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function MorningBriefBanner({ portfolio, profile }) {
  const [brief,     setBrief]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!portfolio || !profile || dismissed) return;
    setLoading(true);
    axios.post(`${API}/api/v1/morning-brief`, { portfolio, profile })
      .then(r => setBrief(r.data))
      .catch(() => setBrief(null))
      .finally(() => setLoading(false));
  }, []);                          // fetch once on mount

  if (dismissed) return null;

  return (
    <AnimatePresence mode="wait">
      {(loading || brief) && (
        <motion.div
          key="brief-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: '#FFFFFF', border: '1px solid #EDE9E2',
            borderLeft: '3px solid #B85C38',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            marginBottom: 32, overflow: 'hidden',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px', cursor: 'pointer',
            }}
            onClick={() => setExpanded(e => !e)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.span
                animate={{ rotate: [0, 15, -10, 5, 0] }}
                transition={{ delay: 1, duration: 0.7 }}
                style={{ fontSize: 16 }}
              >
                ✦
              </motion.span>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#B85C38', textTransform: 'uppercase' }}>
                  Morning Brief · {brief?.date || '今日'}
                </div>
                <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 14, color: '#3E3A39', marginTop: 2 }}>
                  {loading ? '正在生成個人化早報⋯' : '今日個人化早報已就緒'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {!loading && (
                <motion.span
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ color: '#B5ADA4', fontSize: 12 }}
                >
                  ▼
                </motion.span>
              )}
              <button
                onClick={e => { e.stopPropagation(); setDismissed(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CFC9BF', fontSize: 14, padding: '2px 4px' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <AnimatePresence>
            {expanded && brief && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '0 24px 24px', borderTop: '1px solid #F5F1EC' }}>
                  <p style={{
                    fontFamily: "'Noto Serif TC', serif", fontSize: 15,
                    color: '#3E3A39', lineHeight: 2, margin: '20px 0 16px',
                  }}>
                    {brief.brief}
                  </p>

                  {brief.news_used?.length > 0 && (
                    <div style={{ borderTop: '1px solid #EDE9E2', paddingTop: 14 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#B5ADA4', textTransform: 'uppercase', marginBottom: 10 }}>
                        參考新聞來源
                      </div>
                      {brief.news_used.map((title, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#B5ADA4', lineHeight: 1.7 }}>
                          · {title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading shimmer */}
          {loading && (
            <div style={{ padding: '0 24px 24px' }}>
              {[80, 95, 70].map((w, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.2 }}
                  style={{ height: 12, background: '#EDE9E2', borderRadius: 2, marginBottom: 10, width: `${w}%` }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
