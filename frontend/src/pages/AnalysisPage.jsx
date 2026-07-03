import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import DistributionChart from '../components/DistributionChart';
import ArtisanChart      from '../components/ArtisanChart';
import SmartMoneyChart   from '../components/SmartMoneyChart';
import NewsFilter        from '../components/NewsFilter';
import { supabase }      from '../lib/supabase';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const FU = (d = 0) => ({
  initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 },
  viewport: { once: true }, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: d },
});

const signalBorder = { green: '#4A9B6F', red: '#B85C38', yellow: '#A3907C' };

export default function AnalysisPage({ user, watchlist, onWatchlistChange }) {
  const [stockInput,   setStockInput]   = useState('');
  const [stockHealth,  setStockHealth]  = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [smartMoney,   setSmartMoney]   = useState(null);
  const [newsData,     setNewsData]     = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const search = async (id) => {
    const sid = (id || stockInput).trim();
    if (!sid) return;
    setStockInput(sid);
    setLoading(true);
    setStockHealth(null); setDistribution(null); setSmartMoney(null); setNewsData(null); setError('');
    try {
      const [hR, dR, smR, nR] = await Promise.all([
        axios.get(`${API}/api/v1/chip/stock/${sid}`),
        axios.get(`${API}/api/v1/chip/distribution/${sid}`).catch(() => null),
        axios.get(`${API}/api/v1/chip/smart-money/${sid}`).catch(() => null),
        axios.get(`${API}/api/v1/news/filter/${sid}`).catch(() => null),
      ]);
      setStockHealth(hR.data);
      if (dR)  setDistribution(dR.data);
      if (smR) setSmartMoney(smR.data);
      if (nR)  setNewsData(nR.data);
    } catch (e) {
      setError(e.response?.data?.detail || '查詢失敗，請確認股票代號');
    } finally { setLoading(false); }
  };

  const addWatch   = async (id) => {
    if (!user || !supabase || watchlist?.includes(id)) return;
    await supabase.from('user_portfolios').insert({ user_id: user.id, stock_id: id });
    onWatchlistChange?.([...(watchlist || []), id]);
  };
  const removeWatch = async (id) => {
    if (!user || !supabase) return;
    await supabase.from('user_portfolios').delete().eq('user_id', user.id).eq('stock_id', id);
    onWatchlistChange?.((watchlist || []).filter(s => s !== id));
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 52px 80px' }}>

      {/* Page header */}
      <motion.div {...FU()} style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 10 }}>Stock Analysis</div>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 32, fontWeight: 400, color: '#3E3A39', margin: 0 }}>個股 X 光機</h1>
      </motion.div>

      {/* Watchlist */}
      {user && watchlist?.length > 0 && (
        <motion.div {...FU(0.05)} style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 12 }}>我的自選股</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {watchlist.map(sid => (
              <motion.div key={sid} whileHover={{ y: -1, transition: { duration: 0.2 } }}
                style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#FFFFFF', border: '1px solid #EDE9E2' }}>
                <button onClick={() => search(sid)}
                  style={{ padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#3E3A39', fontFamily: "'Noto Serif TC', serif" }}>
                  {sid}
                </button>
                <button onClick={() => removeWatch(sid)}
                  style={{ padding: '7px 10px 7px 0', background: 'none', border: 'none', cursor: 'pointer', color: '#CFC9BF', fontSize: 12 }}>
                  ✕
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Search bar */}
      <motion.div {...FU(0.08)} style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
        <input
          value={stockInput}
          onChange={e => setStockInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="輸入股票代號，例如：2330"
          style={{
            flex: 1, padding: '14px 20px', fontSize: 16,
            background: '#FFFFFF', color: '#3E3A39',
            border: '1px solid #EDE9E2', outline: 'none',
            fontFamily: "'Noto Serif TC', serif",
            transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = '#A3907C')}
          onBlur={e  => (e.target.style.borderColor = '#EDE9E2')}
        />
        <motion.button onClick={() => search()} disabled={loading}
          whileHover={{ y: -1, backgroundColor: '#9E4E2F', transition: { duration: 0.3 } }}
          style={{
            padding: '14px 32px', fontSize: 15,
            background: loading ? '#CFC9BF' : '#B85C38',
            color: '#FFFFFF', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Noto Serif TC', serif", letterSpacing: 1,
          }}>
          {loading ? '分析中⋯' : '開始健檢'}
        </motion.button>
      </motion.div>

      {error && <p style={{ color: '#C0392B', fontSize: 14, marginBottom: 20 }}>{error}</p>}

      {/* Results */}
      {distribution && (
        <motion.div {...FU()}>
          <DistributionChart data={distribution.data} stockId={distribution.stock_id} />
        </motion.div>
      )}

      {stockHealth && (
        <motion.div {...FU(0.05)} style={{ marginTop: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
            {[
              { label: '外資短線態度', value: stockHealth.foreign_status, ok: stockHealth.foreign_bullish },
              { label: '股價 vs MA20',  value: stockHealth.price_status,   ok: stockHealth.above_ma20 },
              { label: `綜合結論（${stockHealth.stock_id}）`, value: stockHealth.conclusion, detail: stockHealth.conclusion_detail, color: signalBorder[stockHealth.signal] },
            ].map((item, i) => {
              const c = item.color ?? (item.ok === true ? '#4A9B6F' : item.ok === false ? '#C0392B' : '#A3907C');
              return (
                <motion.div key={i}
                  whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(0,0,0,0.07)', transition: { duration: 0.4 } }}
                  style={{ background: '#FFFFFF', border: `1px solid ${c}`, borderTop: `3px solid ${c}`, padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, color: '#B5ADA4', textTransform: 'uppercase', marginBottom: 10 }}>{item.label}</div>
                  <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: c, fontWeight: 500 }}>{item.value}</div>
                  {item.detail && <div style={{ fontSize: 12, color: '#857870', marginTop: 6 }}>{item.detail}</div>}
                </motion.div>
              );
            })}
          </div>

          {supabase && user && (
            <div style={{ marginTop: 12 }}>
              {watchlist?.includes(stockHealth.stock_id) ? (
                <span style={{ color: '#4A9B6F', fontSize: 13, fontFamily: 'monospace' }}>✓ 已加入自選股</span>
              ) : (
                <motion.button onClick={() => addWatch(stockHealth.stock_id)}
                  whileHover={{ y: -1, transition: { duration: 0.2 } }}
                  style={{ padding: '7px 18px', fontSize: 13, background: 'transparent', border: '1px solid #CFC9BF', color: '#857870', cursor: 'pointer', fontFamily: "'Noto Serif TC', serif" }}>
                  ＋ 加入自選股
                </motion.button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* K-line chart */}
      {stockHealth && <ArtisanChart stockId={stockHealth.stock_id} />}

      {/* Smart money */}
      {smartMoney && (
        <motion.div {...FU(0.05)} style={{ marginTop: 28 }}>
          <SmartMoneyChart data={smartMoney} />
        </motion.div>
      )}

      {/* News */}
      {newsData && (
        <motion.div {...FU(0.08)} style={{ marginTop: 32 }}>
          <NewsFilter data={newsData} />
        </motion.div>
      )}
    </div>
  );
}
