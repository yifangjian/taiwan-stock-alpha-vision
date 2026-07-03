import { motion } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const tipStyle = { backgroundColor: '#fff', border: '1px solid #EDE9E2', color: '#3E3A39', fontSize: 13 };
const axisLine = { stroke: '#EDE9E2' };
const tick     = { fill: '#B5ADA4', fontSize: 11 };

export default function DistributionChart({ data, stockId }) {
  if (!data || data.length === 0) return null;

  const golden = data.length >= 3 && (() => {
    const last = data.slice(-3);
    const whaleUp    = last[2].whale_pct  > last[1].whale_pct  && last[1].whale_pct  > last[0].whale_pct;
    const retailDown = last[2].retail_pct < last[1].retail_pct && last[1].retail_pct < last[0].retail_pct;
    return whaleUp && retailDown;
  })();

  const formatted = data.map(r => ({
    ...r,
    date: r.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
  }));

  return (
    <motion.div
      style={{ background: '#FFFFFF', border: '1px solid #EDE9E2', padding: '28px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <h3 style={{ fontFamily:"'Noto Serif TC', serif", fontWeight: 400, fontSize: '16px', color: '#3E3A39', margin: 0 }}>
          {stockId} 集保股權分散
        </h3>
        {golden && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              background: 'rgba(184,92,56,0.08)', color: '#B85C38',
              border: '1px solid rgba(184,92,56,0.25)',
              padding: '4px 14px', fontSize: '13px',
              fontFamily: "'Noto Serif TC', serif",
            }}>
            籌碼集中 · 主力吃貨訊號
          </motion.span>
        )}
      </div>

      {data.length === 1 && (
        <p style={{ color: '#B5ADA4', fontSize: '13px', margin: '0 0 16px', fontFamily: 'monospace', letterSpacing: '1px' }}>
          目前僅有一週資料，每週查詢後自動累積歷史趨勢
        </p>
      )}

      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted}>
            <CartesianGrid stroke="transparent" />
            <XAxis dataKey="date" stroke="#CFC9BF" axisLine={axisLine} tickLine={false} tick={tick} />
            <YAxis stroke="#CFC9BF" axisLine={axisLine} tickLine={false} tick={tick} domain={['auto','auto']} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={tipStyle} formatter={v => [`${v}%`]} />
            <Legend wrapperStyle={{ color: '#B5ADA4', fontSize: 12 }} />
            <Line type="monotone" dataKey="whale_pct"  name="千張大戶%" stroke="#B85C38" strokeWidth={2.5} dot={{ r:4, fill:'#B85C38', stroke:'#fff', strokeWidth:2 }} />
            <Line type="monotone" dataKey="retail_pct" name="散戶羊群%" stroke="#A3907C" strokeWidth={2} dot={{ r:3, fill:'#A3907C', stroke:'#fff', strokeWidth:2 }} strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
