/**
 * AnimatedBackground
 * 全站固定背景 — 職人山焙軟光暈
 * position: fixed, z-index: 0（在所有 z-index:1 的前景內容之下，在頁面底色之上）
 */

import { motion, useReducedMotion } from 'framer-motion';

const BLOBS = [
  /* 右上：陶土紅暈 */
  {
    size: 820,
    pos:  { top: '-15%', right: '-10%' },
    color: 'rgba(184,92,56,0.18)',
    anim: { x: [0, 60, -30, 40, 0], y: [0, -50, 35, -22, 0] },
    dur: 24, delay: 0,
  },
  /* 左中：溫砂棕暈 */
  {
    size: 720,
    pos:  { top: '15%', left: '-12%' },
    color: 'rgba(163,144,124,0.20)',
    anim: { x: [0, -50, 38, -58, 0], y: [0, 60, -28, 42, 0] },
    dur: 30, delay: 5,
  },
  /* 右下：霧灰綠暈 */
  {
    size: 620,
    pos:  { bottom: '0%', right: '5%' },
    color: 'rgba(92,113,94,0.14)',
    anim: { x: [0, 38, -58, 22, 0], y: [0, -40, 55, -45, 0] },
    dur: 20, delay: 9,
  },
  /* 中央大暈 */
  {
    size: 960,
    pos:  { top: '30%', left: '25%' },
    color: 'rgba(212,196,178,0.14)',
    anim: { x: [0, -28, 48, -32, 0], y: [0, 40, -45, 24, 0] },
    dur: 36, delay: 13,
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
            background:   `radial-gradient(circle at 50% 50%, ${blob.color} 0%, transparent 70%)`,
            ...blob.pos,
          }}
        />
      ))}

      {/* SVG 紙紋質地疊層 */}
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23grain)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '300px 300px',
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
