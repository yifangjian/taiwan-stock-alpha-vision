import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const FU = (d = 0) => ({
  initial: { opacity: 0, y: 36 }, whileInView: { opacity: 1, y: 0 },
  viewport: { once: true }, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: d },
});

const CARDS = [
  {
    num: '01', path: '/dashboard', icon: '📊',
    title: '戰情中心',
    desc: '即時景氣燈號、三大法人籌碼日報、PTT 散戶恐慌貪婪指數',
    cta: '進入戰情室',
  },
  {
    num: '02', path: '/analysis', icon: '🔍',
    title: '個股 X 光機',
    desc: '職人 K 線 · 主力成本帶 · AI 新聞濾鏡 · 集保股權分散分析',
    cta: '開始分析',
  },
  {
    num: '03', path: '/screener', icon: '🔎',
    title: '選股濾網',
    desc: '均線多頭排列、MACD 黃金交叉、RSI 超賣——複合條件篩出好股',
    cta: '啟動篩選',
  },
  {
    num: '04', path: '/journal', icon: '📓',
    title: '投資手札',
    desc: '時光軸覆盤日記 · AI 毒舌評語 · 職人沉澱報告——和自己的帳單誠實相對',
    cta: '打開手札',
  },
];

export default function HomePage({ user }) {
  const nav = useNavigate();

  return (
    <div>
      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '120px 52px 80px', textAlign: 'center',
        background: 'linear-gradient(180deg, #F9F6F0 0%, #F2EDE6 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ width: 1, height: 60, background: 'linear-gradient(to bottom, transparent, #CFC9BF)', marginBottom: 32 }} />

        <motion.div {...FU(0)} style={{
          fontFamily: 'monospace', fontSize: 11, letterSpacing: 4,
          textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 28,
        }}>
          Taiwan Stock Intelligence Platform
        </motion.div>

        <motion.h1 {...FU(0.08)} style={{
          fontFamily: "'Noto Serif TC', serif", fontSize: 'clamp(52px, 7vw, 88px)',
          fontWeight: 300, color: '#3E3A39', lineHeight: 1.2, margin: '0 0 12px',
        }}>
          {user ? (
            <>Hi, {user.email?.split('@')[0]}<br /><em style={{ color: '#B85C38', fontStyle: 'normal' }}>歡迎回來</em></>
          ) : (
            <>看穿市場<br /><em style={{ color: '#B85C38', fontStyle: 'normal' }}>比主力早一步</em></>
          )}
        </motion.h1>

        <motion.div {...FU(0.15)} style={{ width: 40, height: 1, background: '#CFC9BF', margin: '28px auto' }} />

        <motion.p {...FU(0.2)} style={{
          fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: '#857870',
          lineHeight: 1.9, maxWidth: 480, margin: '0 auto 48px',
        }}>
          整合國發會景氣燈號、三大法人籌碼、PTT 散戶情緒<br />
          為散戶打造的機構級決策平台
        </motion.p>

        <motion.button
          {...FU(0.28)}
          onClick={() => nav('/dashboard')}
          whileHover={{ y: -2, backgroundColor: '#9E4E2F', transition: { duration: 0.35 } }}
          style={{
            padding: '15px 44px', fontSize: 15,
            background: '#B85C38', color: '#FFFFFF',
            border: 'none', cursor: 'pointer',
            fontFamily: "'Noto Serif TC', serif", letterSpacing: 2,
          }}
        >
          進入戰情室
        </motion.button>

        <div style={{ position: 'absolute', bottom: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#CFC9BF', textTransform: 'uppercase' }}>Scroll</span>
          <motion.div
            animate={{ height: [20, 40, 20] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            style={{ width: 1, background: 'linear-gradient(to bottom, #CFC9BF, transparent)' }}
          />
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section style={{ padding: '80px 52px 100px', maxWidth: 1200, margin: '0 auto' }}>
        <motion.div {...FU()} style={{ marginBottom: 56, textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 16 }}>
            Platform Modules
          </div>
          <h2 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 28, fontWeight: 400, color: '#3E3A39', margin: 0 }}>
            四大功能模組
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          {CARDS.map((c, i) => (
            <motion.div
              key={c.path}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.4 } }}
              onClick={() => nav(c.path)}
              style={{
                background: '#FFFFFF', border: '1px solid #EDE9E2',
                padding: '40px 44px', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                transition: 'box-shadow 0.4s',
                display: 'flex', flexDirection: 'column',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#CFC9BF' }}>#{c.num}</span>
                <span style={{ fontSize: 24 }}>{c.icon}</span>
              </div>
              <h3 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 500, color: '#3E3A39', margin: '0 0 12px' }}>
                {c.title}
              </h3>
              <p style={{ fontSize: 14, color: '#857870', lineHeight: 1.8, margin: '0 0 32px', flex: 1 }}>
                {c.desc}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#A3907C', fontSize: 13, fontFamily: "'Noto Serif TC', serif" }}>
                {c.cta}
                <span style={{ fontSize: 16, marginTop: 1 }}>→</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #EDE9E2', padding: '32px 52px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Noto Serif TC', serif", color: '#B5ADA4', fontSize: 13 }}>AlphaVision Taiwan</span>
        <span style={{ fontSize: 12, color: '#CFC9BF', fontFamily: 'monospace' }}>數據僅供參考，不構成投資建議</span>
      </footer>
    </div>
  );
}
