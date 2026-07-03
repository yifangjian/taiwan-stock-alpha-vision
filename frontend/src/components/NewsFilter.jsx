import { motion } from 'framer-motion';

const TAG_META = {
  '實質利多': { color: '#4A9B6F', bg: 'rgba(74,155,111,0.08)',  border: 'rgba(74,155,111,0.25)', dot: '#4A9B6F' },
  '情緒恐慌': { color: '#A3907C', bg: 'rgba(163,144,124,0.09)', border: 'rgba(163,144,124,0.3)', dot: '#A3907C' },
  '出貨警戒': { color: '#C0392B', bg: 'rgba(192,57,43,0.07)',   border: 'rgba(192,57,43,0.2)',  dot: '#C0392B' },
  '未分析':   { color: '#B5ADA4', bg: 'rgba(181,173,164,0.08)', border: 'rgba(181,173,164,0.25)', dot: '#B5ADA4' },
};

function NewsCard({ item, index }) {
  const meta = TAG_META[item.tag] || TAG_META['未分析'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.06 }}
      whileHover={{
        borderColor: '#A3907C',
        boxShadow: '0 8px 32px rgba(163,144,124,0.15)',
        y: -2,
        transition: { duration: 0.3 },
      }}
      style={{
        background: '#FFFFFF',
        border: '1px solid #EDE9E2',
        padding: '20px 22px',
        cursor: 'default',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
      }}
    >
      {/* 色點 */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: meta.dot, flexShrink: 0, marginTop: 7,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* tag */}
        <span style={{
          display: 'inline-block',
          fontSize: '11px', padding: '2px 9px',
          background: meta.bg, color: meta.color,
          border: `1px solid ${meta.border}`,
          fontFamily: "'Noto Serif TC', serif",
          marginBottom: '8px',
        }}>
          {item.tag}
        </span>

        {/* 標題 */}
        <div style={{
          fontSize: '14px', lineHeight: 1.6, color: '#3E3A39',
          fontWeight: 500, marginBottom: '6px',
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {item.title}
        </div>

        {/* 摘要 + 日期 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          {item.summary && (
            <div style={{ fontSize: '12px', color: '#857870', fontFamily: "'Noto Serif TC', serif" }}>
              {item.summary}
            </div>
          )}
          {item.date && (
            <div style={{ fontSize: '11px', color: '#B5ADA4', fontFamily: 'monospace', flexShrink: 0 }}>
              {item.date}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function NewsFilter({ data }) {
  if (!data || !data.news || data.news.length === 0) return null;

  const counts = data.news.reduce((acc, n) => {
    acc[n.tag] = (acc[n.tag] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* 標題 + 統計 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#B5ADA4' }}>
          新聞抗噪濾鏡 · {data.count} 則
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {Object.entries(counts).map(([tag, cnt]) => {
            const meta = TAG_META[tag] || TAG_META['未分析'];
            return (
              <span key={tag} style={{
                fontSize: '11px', padding: '2px 9px',
                background: meta.bg, color: meta.color,
                border: `1px solid ${meta.border}`,
                fontFamily: "'Noto Serif TC', serif",
              }}>
                {tag} {cnt}
              </span>
            );
          })}
        </div>
      </div>

      {/* 卡片列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.news.map((item, i) => (
          <NewsCard key={i} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
