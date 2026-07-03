import { motion } from 'framer-motion';
import JournalTimeline from '../components/JournalTimeline';

const FU = (d = 0) => ({
  initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: d },
});

export default function JournalPage({ user, supabase, onShowAuth }) {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 52px 80px' }}>

      {/* Page header */}
      <motion.div {...FU()} style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 10 }}>Trade Journal</div>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 32, fontWeight: 400, color: '#3E3A39', margin: '0 0 10px' }}>投資時光軸手札</h1>
        <p style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 14, color: '#857870', margin: 0 }}>
          記錄每筆交易心得，AI 評語 × 職人沉澱報告
        </p>
      </motion.div>

      {user && supabase ? (
        <motion.div {...FU(0.08)}>
          <JournalTimeline supabase={supabase} user={user} />
        </motion.div>
      ) : (
        <motion.div {...FU(0.08)}
          style={{
            padding: '72px 40px', textAlign: 'center',
            background: '#FFFFFF', border: '1px solid #EDE9E2',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          }}>
          <p style={{ fontFamily: "'Noto Serif TC', serif", color: '#857870', fontSize: 17, marginBottom: 28 }}>
            登入後才能開啟你的投資手札
          </p>
          <motion.button onClick={onShowAuth}
            whileHover={{ y: -2, backgroundColor: '#9E4E2F', transition: { duration: 0.35 } }}
            style={{
              padding: '13px 40px', fontSize: 15,
              background: '#B85C38', color: '#FFFFFF',
              border: 'none', cursor: 'pointer',
              fontFamily: "'Noto Serif TC', serif", letterSpacing: 1,
            }}>
            立即登入 / 註冊
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
