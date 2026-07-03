import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import './App.css';

function App() {
  const [macroData, setMacroData] = useState([]);
  const [chipData, setChipData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [macroRes, chipRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/v1/macro/signal'),
          axios.get('http://127.0.0.1:8000/api/v1/chip/institutional')
        ]);
        setMacroData(macroRes.data.data.slice(0, 36).reverse());
        setChipData(chipRes.data.data);
      } catch (error) {
        console.error("資料載入失敗", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ color: 'white', padding: '50px', fontSize: '24px' }}>載入戰情數據中...</div>;

  return (
    <div style={{ padding: '30px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#38bdf8' }}>AlphaVision Pro 戰情中心</h1>
        <p style={{ margin: '10px 0 0 0', color: '#94a3b8' }}>台股宏觀與籌碼透視系統</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '30px' }}>

        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>國發會景氣對策信號 (近三年)</h2>
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={macroData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="Date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" domain={[0, 50]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #38bdf8' }} />
                <ReferenceLine y={38} label="紅燈線(38)" stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={16} label="藍燈線(16)" stroke="#3b82f6" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="Signal_Score" name="景氣分數" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, color: '#e2e8f0' }}>今日三大法人買賣超 (單位: 元)</h2>
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chipData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="單位名稱" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" width={100} tickFormatter={(value) => `${(value / 100000000).toFixed(0)}億`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #38bdf8' }}
                  formatter={(value) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' }).format(value)}
                />
                <Legend />
                <Bar dataKey="買進金額" fill="#10b981" name="買進" />
                <Bar dataKey="賣出金額" fill="#ef4444" name="賣出" />
                <Bar dataKey="買賣差額" fill="#38bdf8" name="淨買賣超" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App
