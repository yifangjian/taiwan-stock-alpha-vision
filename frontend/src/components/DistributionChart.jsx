import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function DistributionChart({ data, stockId }) {
  if (!data || data.length === 0) return null;

  // 是否出現「黃金交叉」：大戶連兩週升 + 散戶連兩週降
  const golden = data.length >= 3 && (() => {
    const last = data.slice(-3);
    const whaleUp   = last[2].whale_pct  > last[1].whale_pct  && last[1].whale_pct  > last[0].whale_pct;
    const retailDown = last[2].retail_pct < last[1].retail_pct && last[1].retail_pct < last[0].retail_pct;
    return whaleUp && retailDown;
  })();

  const formatted = data.map(r => ({
    ...r,
    date: r.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
  }));

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>
          📊 {stockId} 籌碼 X 光機（集保股權分散）
        </h3>
        {golden && (
          <span style={{
            backgroundColor: '#7c2d12', color: '#fca5a5',
            padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold',
            border: '1px solid #ef4444', animation: 'pulse 1.5s infinite',
          }}>
            🔥 籌碼集中黃金交叉：主力吃貨中
          </span>
        )}
      </div>

      {data.length === 1 && (
        <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 12px' }}>
          ℹ️ 目前只有一週資料。每週查詢後系統會自動累積歷史，4週後可看到趨勢。
        </p>
      )}

      <div style={{ height: '240px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" domain={['auto', 'auto']} tickFormatter={v => `${v}%`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #38bdf8' }}
              formatter={(v) => [`${v}%`]}
            />
            <Legend />
            <Line type="monotone" dataKey="whale_pct"  name="千張大戶%" stroke="#ef4444" strokeWidth={3} dot={{ r: 5 }} />
            <Line type="monotone" dataKey="retail_pct" name="散戶羊群%" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
