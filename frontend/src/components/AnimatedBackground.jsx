/**
 * AnimatedBackground
 * 全站固定背景 — 職人山焙風格軟光暈
 *
 * 四顆大色塊用 radial-gradient 疊加，各自以不同週期緩慢漂移。
 * 完全 GPU 合成（transform only），不影響頁面效能。
 * useReducedMotion 自動尊重系統「減少動態效果」設定。
 */

import { useReducedMotion } from 'framer-motion';
import { motion } from 'framer-motion';

const BLOBS = [
  /* 右上：陶土紅暈 */
  {
    size: 780,
    pos:  { top: '-12%', right: '-8%' },
    color:'rgba(184,92,56,0.09)',
    anim: { x: [0, 55, -25, 35, 0], y: [0, -45, 30, -20, 0] },
    dur:  24,
    delay:0,
  },
  /* 左中：溫砂棕暈 */
  {
    size: 680,
    pos:  { top: '18%', left: '-10%' },
    color:'rgba(163,144,124,0.10)',
    anim: { x: [0, -45, 35, -55, 0], y: [0, 55, -25, 38, 0] },
    dur:  30,
    delay:4,
  },
  /* 右下：霧灰綠暈 */
  {
    size: 580,
    pos:  { bottom: '2%', right: '8%' },
    color:'rgba(92,113,94,0.07)',
    anim: { x: [0, 35, -55, 20, 0], y: [0, -35, 50, -40, 0] },
    dur:  20,
    delay:8,
  },
  /* 中央：淡米色大暈（最淡） */
  {
    size: 900,
    pos:  { top: '35%', left: '30%' },
    color:'rgba(212,196,178,0.07)',
    anim: { x: [0, -25, 45, -30, 0], y: [0, 38, -42, 22, 0] },
    dur:  36,
    delay:12,
  },
];

export default function AnimatedBackground() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          animate={reduced ? {} : blob.anim}
          transition={{
            duration:   blob.dur,
            delay:      blob.delay,
            repeat:     Infinity,
            repeatType: 'mirror',
            ease:       'easeInOut',
          }}
          style={{
            position:     'absolute',
            width:        blob.size,
            height:       blob.size,
            borderRadius: '50%',
            background:   `radial-gradient(circle at 50% 50%, ${blob.color} 0%, transparent 72%)`,
            ...blob.pos,
          }}
        />
      ))}

      {/* 靜態紙紋疊層：SVG feTurbulence，給背景增加職人手感質地 */}
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23grain)' opacity='0.038'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '300px 300px',
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
}
