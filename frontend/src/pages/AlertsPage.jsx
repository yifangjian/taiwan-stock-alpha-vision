import { motion } from 'framer-motion';
import AlertSettings from '../components/AlertSettings';
import { useResponsive } from '../hooks/useResponsive';

export default function AlertsPage({ user }) {
  const { isMobile } = useResponsive();
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '48px 52px 80px' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: 40 }}
      >
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 10 }}>
          Conditional Alerts
        </div>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 32, fontWeight: 400, color: '#3E3A39', margin: 0 }}>
          條件型 LINE 推播
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: 32 }}
      >
        <AlertSettings user={user} />
      </motion.div>
    </div>
  );
}
