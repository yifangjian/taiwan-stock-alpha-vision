import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence, animate } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import BacktestModal        from '../components/BacktestModal';
import PositionCalculator   from '../components/PositionCalculator';
import MorningBriefBanner   from '../components/MorningBriefBanner';
import { useResponsive }    from '../hooks/useResponsive';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const FU = (d = 0) => ({
  initial: { opacity: 0, y: 36 }, whileInView: { opacity: 1, y: 0 },
  viewport: { once: true }, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: d },
});
const STAGGER = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1 } },
};
const GRID_ITEM = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const C = {
  axis: '#CFC9BF', tick: { fill: '#B5ADA4', fontSize: 11 },
  tip: { backgroundColor: '#FFF', border: '1px solid #EDE9E2', color: '#3E3A39', fontSize: 13 },
  accent: '#A3907C', green: '#4A9B6F', red: '#B85C38',
};
const axisLine = { stroke: '#EDE9E2' };
const sentColor = s => s >= 60 ? C.red : s <= 40 ? C.green : C.accent;

/* ── 數字 count-up 組件（DOM 直寫，不觸發 React re-render） ── */
function AnimatedCounter({ value, style, className }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current == null || value == null) return;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        if (ref.current) ref.current.textContent = Math.round(v);
      },
    });
    return controls.stop;
  }, [value]);

  return <span ref={ref} style={style} className={className}>0</span>;
}

/* ════════════════════════════════════════════════════════════ */
export default function DashboardPage({ portfolio, profile }) {
  const { isMobile } = useResponsive();
  const [macroData,     setMacroData]     = useState([]);
  const [chipData,      setChipData]      = useState([]);
  const [sentimentData, setSentimentData] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [showBacktest,  setShowBacktest]  = useState(false);

  useEffect(() => {
    (async () => {
      const [mR, cR, sR] = await Promise.all([
        axios.get(`${API}/api/v1/macro/signal`).catch(() => null),
        axios.get(`${API}/api/v1/chip/institutional`).catch(() => null),
        axios.get(`${API}/api/v1/sentiment/ptt`).catch(() => null),
      ]);
      if (mR) setMacroData(mR.data.data.slice(0, 36).reverse());
      if (cR) setChipData(cR.data.data);
      if (sR) setSentimentData(sR.data);
      setLoading(false);
    })();
  }, []);

  /* ── Loading state ── */
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 20 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        style={{ width: 24, height: 24, border: '2px solid #EDE9E2', borderTop: '2px solid #A3907C', borderRadius: '50%' }}
      />
      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        style={{ fontFamily: "'Noto Serif TC', serif", color: '#A3907C', fontSize: 14, letterSpacing: 4, margin: 0 }}
      >
        連線至市場⋯
      </motion.p>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '48px 52px 80px' }}>

      {/* 個人化早報 Banner */}
      <MorningBriefBanner portfolio={portfolio || []} profile={profile || {}} />

      {/* Page header */}
      <motion.div {...FU()} style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 10 }}>
          Dashboard
        </div>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 32, fontWeight: 400, color: '#3E3A39', margin: 0 }}>
          戰情中心
        </h1>
      </motion.div>

      {/* AI 建議橫幅 */}
      <AnimatePresence>
        {sentimentData?.eli5_advice && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ borderLeftColor: '#B85C38', transition: { duration: 0.25 } }}
            style={{
              display: 'flex', gap: 16, alignItems: 'flex-start',
              padding: '20px 28px', background: '#FFFFFF',
              border: '1px solid #EDE9E2', borderLeft: '3px solid #A3907C',
              marginBottom: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              transition: 'border-left-color 0.25s',
            }}
          >
            <motion.span
              animate={{ rotate: [0, 15, -10, 5, 0] }}
              transition={{ delay: 0.8, duration: 0.6 }}
              style={{ color: '#A3907C', fontSize: 16, flexShrink: 0, marginTop: 2 }}
            >
              ✦
            </motion.span>
            <p style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 15, color: '#3E3A39', lineHeight: 1.8, margin: 0 }}>
              <strong>今日建議：</strong>{sentimentData.eli5_advice}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts grid — staggered entrance */}
      <motion.div
        variants={STAGGER} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 16 : 24, marginBottom: 40 }}
      >
        {/* Macro signal */}
        <motion.div
          variants={GRID_ITEM}
          whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.08)', transition: { duration: 0.35 } }}
          style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '24px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
        >
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 16 }}>
            景氣對策信號
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={macroData}>
              <defs>
                <linearGradient id="macroGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.accent} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="transparent" />
              <XAxis dataKey="Date" stroke={C.axis} axisLine={axisLine} tickLine={false} tick={{ ...C.tick, fontSize: 10 }} />
              <YAxis stroke={C.axis} domain={[0, 50]} axisLine={axisLine} tickLine={false} tick={C.tick} />
              <Tooltip contentStyle={C.tip} />
              <ReferenceLine y={38} stroke={C.red}    strokeDasharray="4 3" strokeOpacity={0.6} label={{ value: '紅燈', fill: C.red,    fontSize: 10, position: 'right' }} />
              <ReferenceLine y={16} stroke={C.accent} strokeDasharray="4 3" strokeOpacity={0.6} label={{ value: '藍燈', fill: C.accent, fontSize: 10, position: 'right' }} />
              <Area type="monotone" dataKey="Signal_Score" name="景氣分數"
                stroke={C.accent} strokeWidth={2.5} fill="url(#macroGrad)"
                dot={false} activeDot={{ r: 5, fill: C.accent, stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Institutional chip */}
        <motion.div
          variants={GRID_ITEM}
          whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.08)', transition: { duration: 0.35 } }}
          style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '24px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
        >
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 16 }}>
            三大法人買賣超
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chipData} barGap={4}>
              <CartesianGrid stroke="transparent" />
              <XAxis dataKey="單位名稱" stroke={C.axis} axisLine={axisLine} tickLine={false} tick={{ ...C.tick, fontSize: 11 }} />
              <YAxis stroke={C.axis} axisLine={axisLine} tickLine={false} tick={C.tick} width={90} tickFormatter={v => `${(v / 1e8).toFixed(0)}億`} />
              <Tooltip contentStyle={C.tip} formatter={v => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' }).format(v)} />
              <Legend wrapperStyle={{ color: '#B5ADA4', fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="買進金額" fill={C.green}  name="買進"    radius={[4, 4, 0, 0]} />
              <Bar dataKey="賣出金額" fill={C.red}    name="賣出"    radius={[4, 4, 0, 0]} />
              <Bar dataKey="買賣差額" fill={C.accent} name="淨買賣超" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      {/* Sentiment card with count-up */}
      {sentimentData && (
        <motion.div
          {...FU(0.08)}
          whileHover={{ y: -3, boxShadow: '0 16px 52px rgba(0,0,0,0.07)', transition: { duration: 0.35 } }}
          style={{
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 20 : 48, alignItems: isMobile ? 'center' : 'flex-start',
            background: '#FFFFFF', border: '1px solid #EDE9E2',
            padding: isMobile ? '24px 20px' : '36px 44px', marginBottom: 40,
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          {/* Count-up score */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{
              fontFamily: "'Noto Serif TC', serif", fontSize: 72, fontWeight: 300, lineHeight: 1,
              color: sentColor(sentimentData.fear_greed_score),
            }}>
              <AnimatedCounter value={sentimentData.fear_greed_score} />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 14, color: sentColor(sentimentData.fear_greed_score), marginTop: 8 }}
            >
              {sentimentData.sentiment_label}
            </motion.div>
          </div>

          <div style={{ borderLeft: isMobile ? 'none' : '1px solid #EDE9E2', borderTop: isMobile ? '1px solid #EDE9E2' : 'none', paddingLeft: isMobile ? 0 : 40, paddingTop: isMobile ? 20 : 0, width: '100%' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 14 }}>
              AI 盤後摘要
            </div>
            <p style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 15, color: '#3E3A39', lineHeight: 1.9, margin: '0 0 16px' }}>
              {sentimentData.summary}
            </p>
            <span style={{ fontSize: 12, color: '#B5ADA4', fontFamily: 'monospace' }}>
              分析文章 {sentimentData.article_count} 篇
            </span>
          </div>
        </motion.div>
      )}

      {/* Tools row */}
      <motion.div
        variants={STAGGER} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 16 : 24 }}
      >
        {/* Backtest card */}
        <motion.div
          variants={GRID_ITEM}
          onClick={() => setShowBacktest(true)}
          whileHover={{ y: -3, boxShadow: '0 16px 52px rgba(0,0,0,0.16)', transition: { duration: 0.35 } }}
          whileTap={{ scale: 0.985, transition: { duration: 0.12 } }}
          style={{
            background: '#3E3A39', padding: isMobile ? '28px 24px' : '40px 44px', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#857870', marginBottom: 16 }}>
            Backtest
          </div>
          <h3 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 400, color: '#F9F6F0', margin: '0 0 12px' }}>
            策略回測沙盒
          </h3>
          <p style={{ fontSize: 13, color: '#857870', lineHeight: 1.8, margin: '0 0 28px' }}>
            景氣燈號 × 0050 歷史驗證，無程式碼操作
          </p>
          <motion.span
            animate={{ x: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            style={{ color: '#A3907C', fontSize: 13, fontFamily: "'Noto Serif TC', serif" }}
          >
            啟動時光機 →
          </motion.span>
        </motion.div>

        {/* Position calculator */}
        <motion.div
          variants={GRID_ITEM}
          whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.07)', transition: { duration: 0.35 } }}
          style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: isMobile ? '24px 20px' : '36px 44px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
        >
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 16 }}>
            Position Sizing
          </div>
          <h3 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 400, color: '#3E3A39', margin: '0 0 20px' }}>
            智慧倉位計算
          </h3>
          <PositionCalculator />
        </motion.div>
      </motion.div>

      {showBacktest && <BacktestModal onClose={() => setShowBacktest(false)} />}
    </div>
  );
}
