import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import PositionCalculator from './components/PositionCalculator';
import DistributionChart  from './components/DistributionChart';
import BacktestModal      from './components/BacktestModal';
import AuthModal          from './components/AuthModal';
import { supabase }       from './lib/supabase';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const CHART = {
  grid:    '#2a2618',
  axis:    '#9a8a68',
  tooltip: { bg: '#0c0b07', border: '#c8a84b' },
  gold:    '#c8a84b',
  green:   '#52c472',
  red:     '#e05c5c',
  blue:    '#5aacda',
};

// ── Scroll reveal hook ────────────────────────────────────────
function useReveal(deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.08 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, deps);
}

export default function App() {
  const [macroData,      setMacroData]      = useState([]);
  const [chipData,       setChipData]       = useState([]);
  const [sentimentData,  setSentimentData]  = useState(null);
  const [loading,        setLoading]        = useState(true);

  const [stockInput,   setStockInput]   = useState('');
  const [stockHealth,  setStockHealth]  = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError,   setStockError]   = useState('');
  const [distribution, setDistribution] = useState(null);

  const [showBacktest, setShowBacktest] = useState(false);
  const [user,         setUser]         = useState(null);
  const [showAuth,     setShowAuth]     = useState(false);
  const [watchlist,    setWatchlist]    = useState([]);

  // Scroll reveal (fires once data is loaded)
  useReveal([loading]);

  // ── Auth ──
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !supabase) { setWatchlist([]); return; }
    supabase.from('user_portfolios').select('stock_id').order('created_at').then(({ data }) =>
      setWatchlist(data?.map(r => r.stock_id) ?? [])
    );
  }, [user]);

  const addToWatchlist = async (id) => {
    if (!user || !supabase || watchlist.includes(id)) return;
    await supabase.from('user_portfolios').insert({ user_id: user.id, stock_id: id });
    setWatchlist(p => [...p, id]);
  };
  const removeFromWatchlist = async (id) => {
    if (!user || !supabase) return;
    await supabase.from('user_portfolios').delete().eq('user_id', user.id).eq('stock_id', id);
    setWatchlist(p => p.filter(s => s !== id));
  };

  // ── Data fetch ──
  useEffect(() => {
    (async () => {
      try {
        const [mR, cR, sR] = await Promise.all([
          axios.get(`${API}/api/v1/macro/signal`),
          axios.get(`${API}/api/v1/chip/institutional`),
          axios.get(`${API}/api/v1/sentiment/ptt`).catch(() => null),
        ]);
        setMacroData(mR.data.data.slice(0, 36).reverse());
        setChipData(cR.data.data);
        if (sR) setSentimentData(sR.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleStockSearch = async (id) => {
    const sid = (id || stockInput).trim();
    if (!sid) return;
    if (!id) setStockInput(sid);
    setStockLoading(true); setStockHealth(null); setDistribution(null); setStockError('');
    try {
      const [hR, dR] = await Promise.all([
        axios.get(`${API}/api/v1/chip/stock/${sid}`),
        axios.get(`${API}/api/v1/chip/distribution/${sid}`).catch(() => null),
      ]);
      setStockHealth(hR.data);
      if (dR) setDistribution(dR.data);
    } catch (e) {
      setStockError(e.response?.data?.detail || '查詢失敗，請確認股票代號');
    } finally { setStockLoading(false); }
  };

  const sentimentColor = (s) => s >= 60 ? CHART.red : s <= 40 ? CHART.green : CHART.gold;
  const signalBorder   = { green: CHART.green, red: CHART.red, yellow: CHART.gold };

  const tooltipStyle = { backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, color: '#f0ead6' };

  // ── Loading screen ──
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0c0b07', gap:'20px' }}>
      <div style={{ width:'1px', height:'60px', background:`linear-gradient(to bottom, #c8a84b, transparent)`, animation:'glow-pulse 1.2s ease-in-out infinite' }} />
      <span style={{ color:'#9a8a68', fontSize:'12px', letterSpacing:'4px', textTransform:'uppercase' }}>載入戰情數據</span>
    </div>
  );

  return (
    <div style={{ background:'#0c0b07' }}>

      {/* ── Fixed Navbar ── */}
      <nav className="navbar">
        <div className="nav-logo">AlphaVision</div>
        <div className="nav-right">
          {supabase && user ? (
            <>
              <span className="nav-user">{user.email}</span>
              <button className="btn-muted" onClick={() => supabase.auth.signOut()}>登出</button>
            </>
          ) : supabase ? (
            <button className="btn-ghost" onClick={() => setShowAuth(true)}>登入 / 註冊</button>
          ) : null}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero-wrap">
        <div className="hero-glow" />
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="hero-tag">Taiwan Stock Intelligence Platform</div>
          <h1 className="hero-title">
            看穿市場<br /><em>比主力早一步</em>
          </h1>
          <p className="hero-sub">
            整合國發會景氣燈號、三大法人籌碼、PTT AI 情緒分析<br />
            打造屬於散戶的機構級決策系統
          </p>
          <button className="btn-gold" onClick={() => document.getElementById('s01').scrollIntoView({ behavior:'smooth' })}>
            進入戰情室 →
          </button>
        </div>
        <div className="hero-scroll">
          <span>SCROLL</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* ── Eli5 Banner ── */}
      {sentimentData?.eli5_advice && (
        <div className="eli5 reveal">
          <span className="eli5-icon">🤖</span>
          <p className="eli5-text">
            <strong>今日小白建議：</strong>{sentimentData.eli5_advice}
          </p>
        </div>
      )}

      <hr className="full-divider" />

      {/* ── #01 宏觀訊號 ── */}
      <div id="s01" className="section-wrap">
        <div className="section-head reveal">
          <span className="section-num">#01</span>
          <div>
            <h2 className="section-title">宏觀景氣訊號</h2>
            <p className="section-desc">國發會景氣對策信號（近三年）× 三大法人日報</p>
          </div>
        </div>

        <div className="grid-2">
          <div className="card reveal reveal-d1">
            <div className="card-label">景氣對策信號 Signal Score</div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={macroData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="Date" stroke={CHART.axis} tick={{ fontSize: 10 }} />
                  <YAxis stroke={CHART.axis} domain={[0, 50]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={38} label={{ value:'紅燈 38', fill: CHART.red, fontSize:11 }}   stroke={CHART.red}  strokeDasharray="4 3" />
                  <ReferenceLine y={16} label={{ value:'藍燈 16', fill: CHART.blue, fontSize:11 }} stroke={CHART.blue} strokeDasharray="4 3" />
                  <Line type="monotone" dataKey="Signal_Score" name="景氣分數" stroke={CHART.gold} strokeWidth={2.5} dot={{ r:2, fill: CHART.gold }} activeDot={{ r:6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card reveal reveal-d2">
            <div className="card-label">三大法人買賣超 Institutional Flow</div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chipData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="單位名稱" stroke={CHART.axis} tick={{ fontSize: 11 }} />
                  <YAxis stroke={CHART.axis} width={90} tickFormatter={v => `${(v/1e8).toFixed(0)}億`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD'}).format(v)} />
                  <Legend wrapperStyle={{ color: CHART.axis, fontSize:12 }} />
                  <Bar dataKey="買進金額" fill={CHART.green} name="買進" />
                  <Bar dataKey="賣出金額" fill={CHART.red}   name="賣出" />
                  <Bar dataKey="買賣差額" fill={CHART.gold}  name="淨買賣超" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <hr className="full-divider" />

      {/* ── #02 AI 情緒 ── */}
      {sentimentData && (
        <div className="section-wrap">
          <div className="section-head reveal">
            <span className="section-num">#02</span>
            <div>
              <h2 className="section-title">AI 市場情緒</h2>
              <p className="section-desc">PTT 股板爬蟲 + GPT-4o 恐慌貪婪指數</p>
            </div>
          </div>

          <div className="sentiment-wrap reveal">
            <div className="sentiment-score">
              <div className="sentiment-num" style={{ color: sentimentColor(sentimentData.fear_greed_score) }}>
                {sentimentData.fear_greed_score}
              </div>
              <div className="sentiment-label" style={{ color: sentimentColor(sentimentData.fear_greed_score) }}>
                {sentimentData.sentiment_label}
              </div>
            </div>
            <div className="sentiment-body">
              <h3>AI 盤後摘要</h3>
              <p>{sentimentData.summary}</p>
              <div className="sentiment-meta">分析文章數：{sentimentData.article_count} 篇</div>
            </div>
          </div>
        </div>
      )}

      <hr className="full-divider" />

      {/* ── #03 個股健檢 ── */}
      <div className="section-wrap">
        <div className="section-head reveal">
          <span className="section-num">#03</span>
          <div>
            <h2 className="section-title">個股 X 光機</h2>
            <p className="section-desc">外資籌碼 · 均線位置 · 集保股權分散</p>
          </div>
        </div>

        {/* 自選股 */}
        {user && watchlist.length > 0 && (
          <div className="watchlist-wrap reveal">
            <div className="watchlist-label">📌 我的自選股</div>
            <div className="watchlist-chips">
              {watchlist.map(sid => (
                <div className="chip" key={sid}>
                  <button className="chip-id" onClick={() => handleStockSearch(sid)}>{sid}</button>
                  <button className="chip-rm" onClick={() => removeFromWatchlist(sid)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 搜尋 */}
        <div className="search-row reveal">
          <input
            className="search-input"
            placeholder="輸入股票代號，例如：2330"
            value={stockInput}
            onChange={e => setStockInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStockSearch()}
          />
          <button className="btn-gold" onClick={() => handleStockSearch()} disabled={stockLoading}>
            {stockLoading ? '分析中...' : '開始健檢'}
          </button>
        </div>

        {stockError && <p style={{ color: CHART.red, marginBottom:'16px', fontSize:'14px' }}>{stockError}</p>}

        {distribution && (
          <div className="reveal">
            <DistributionChart data={distribution.data} stockId={distribution.stock_id} />
          </div>
        )}

        {stockHealth && (
          <div className="reveal">
            <div className="health-grid">
              {[
                { label:'外資短線態度', value: stockHealth.foreign_status, ok: stockHealth.foreign_bullish },
                { label:'股價 vs MA20',  value: stockHealth.price_status,   ok: stockHealth.above_ma20 },
                { label:`綜合結論（${stockHealth.stock_id}）`, value: stockHealth.conclusion, detail: stockHealth.conclusion_detail, color: signalBorder[stockHealth.signal] },
              ].map((item, i) => {
                const c = item.color ?? (item.ok === true ? CHART.green : item.ok === false ? CHART.red : CHART.gold);
                return (
                  <div className="health-card" key={i} style={{ borderColor: c }}>
                    <div className="health-card-label">{item.label}</div>
                    <div className="health-card-value" style={{ color: c }}>{item.value}</div>
                    {item.detail && <div className="health-card-detail">{item.detail}</div>}
                  </div>
                );
              })}
            </div>

            {supabase && user && (
              <div style={{ marginTop:'14px' }}>
                {watchlist.includes(stockHealth.stock_id) ? (
                  <span style={{ color: CHART.green, fontSize:'13px' }}>✓ 已加入自選股</span>
                ) : (
                  <button className="btn-ghost" style={{ fontSize:'13px' }} onClick={() => addToWatchlist(stockHealth.stock_id)}>
                    ＋ 加入自選股
                  </button>
                )}
              </div>
            )}
            {supabase && !user && (
              <p style={{ color:'var(--muted)', fontSize:'13px', marginTop:'10px' }}>
                <button onClick={() => setShowAuth(true)} style={{ background:'none', border:'none', color:'var(--gold)', cursor:'pointer', fontSize:'13px', padding:0 }}>登入</button>
                {' '}後可保存自選股，下次自動帶入
              </p>
            )}
          </div>
        )}
      </div>

      <hr className="full-divider" />

      {/* ── #04 回測沙盒 ── */}
      <div className="section-wrap">
        <div className="section-head reveal">
          <span className="section-num">#04</span>
          <div>
            <h2 className="section-title">策略回測沙盒</h2>
            <p className="section-desc">景氣燈號 × 0050 歷史驗證，無程式碼</p>
          </div>
        </div>

        <div className="backtest-cta reveal">
          <h2>⏳ 無程式碼回測</h2>
          <p>選擇進場燈號條件，驗證「藍燈買入、紅燈出場」的真實歷史績效</p>
          <button className="btn-gold" onClick={() => setShowBacktest(true)}>
            🚀 啟動時光機
          </button>
        </div>
      </div>

      <hr className="full-divider" />

      {/* ── #05 資金管理 ── */}
      <div className="section-wrap">
        <div className="section-head reveal">
          <span className="section-num">#05</span>
          <div>
            <h2 className="section-title">智慧倉位計算</h2>
            <p className="section-desc">單筆虧損不超過總資金 2% 的安全交易原則</p>
          </div>
        </div>
        <div className="reveal">
          <PositionCalculator />
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="footer">
        <p>ALPHAVISION PRO &nbsp;·&nbsp; TAIWAN STOCK INTELLIGENCE</p>
        <p style={{ marginTop:'8px' }}>數據僅供參考，不構成投資建議</p>
      </footer>

      {showBacktest && <BacktestModal onClose={() => setShowBacktest(false)} />}
      {showAuth     && <AuthModal     onClose={() => setShowAuth(false)} />}
    </div>
  );
}
