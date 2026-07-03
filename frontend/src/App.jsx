import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  AreaChart, Area,
  BarChart,  Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import PositionCalculator from './components/PositionCalculator';
import DistributionChart  from './components/DistributionChart';
import SmartMoneyChart    from './components/SmartMoneyChart';
import NewsFilter         from './components/NewsFilter';
import Sidebar           from './components/Sidebar';
import JournalTimeline   from './components/JournalTimeline';
import BacktestModal      from './components/BacktestModal';
import AuthModal          from './components/AuthModal';
import { supabase }       from './lib/supabase';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/* ── Animation helpers ──────────────────────────────────────── */
const FU = (delay = 0) => ({
  initial:     { opacity: 0, y: 44 },
  whileInView: { opacity: 1, y: 0 },
  viewport:    { once: true },
  transition:  { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay },
});
const HOVER = {
  whileHover: { y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.07)', transition: { duration: 0.5 } },
};

/* ── Chart constants ────────────────────────────────────────── */
const C = {
  grid:   'transparent',
  axis:   '#CFC9BF',
  tick:   { fill: '#B5ADA4', fontSize: 11 },
  tip:    { backgroundColor: '#FFF', border: '1px solid #EDE9E2', color: '#3E3A39', fontSize: 13 },
  accent: '#A3907C',
  green:  '#4A9B6F',
  red:    '#B85C38',
};
const axisLine = { stroke: '#EDE9E2' };

function sentColor(s) { return s >= 60 ? C.red : s <= 40 ? C.green : C.accent; }

/* ── Motion wrappers ────────────────────────────────────────── */
function FadeCard({ delay = 0, className = 'card', style = {}, children }) {
  return (
    <motion.div className={className} style={style} {...FU(delay)} {...HOVER}>
      {children}
    </motion.div>
  );
}

export default function App() {
  const [macroData,     setMacroData]     = useState([]);
  const [chipData,      setChipData]      = useState([]);
  const [sentimentData, setSentimentData] = useState(null);
  const [loading,       setLoading]       = useState(true);

  const [stockInput,   setStockInput]   = useState('');
  const [stockHealth,  setStockHealth]  = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError,   setStockError]   = useState('');
  const [distribution, setDistribution] = useState(null);
  const [smartMoney,   setSmartMoney]   = useState(null);
  const [newsData,     setNewsData]     = useState(null);

  const [showBacktest,  setShowBacktest]  = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [user,          setUser]          = useState(null);
  const [showAuth,     setShowAuth]     = useState(false);
  const [watchlist,    setWatchlist]    = useState([]);

  /* ── Auth ── */
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !supabase) { setWatchlist([]); return; }
    supabase.from('user_portfolios').select('stock_id').order('created_at')
      .then(({ data }) => setWatchlist(data?.map(r => r.stock_id) ?? []));
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

  /* ── Data fetch ── */
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
    setStockLoading(true);
    setStockHealth(null); setDistribution(null);
    setSmartMoney(null);  setNewsData(null);
    setStockError('');
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
      setStockError(e.response?.data?.detail || '查詢失敗，請確認股票代號');
    } finally { setStockLoading(false); }
  };

  const signalBorder = { green: C.green, red: C.red, yellow: C.accent };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#F9F6F0', gap:'20px' }}>
      <p style={{ fontFamily:"'Noto Serif TC', serif", color:'#A3907C', fontSize:'16px', fontWeight:400, letterSpacing:'4px' }}>
        正在連線至市場
      </p>
      <div style={{ width:'36px', height:'1px', background:'#CFC9BF' }} />
    </div>
  );

  return (
    <div style={{ background: '#F9F6F0' }}>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="開啟選單"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', flexDirection: 'column', gap: '5px' }}
          >
            <div style={{ width: 22, height: 1, background: '#3E3A39' }} />
            <div style={{ width: 15, height: 1, background: '#3E3A39' }} />
            <div style={{ width: 22, height: 1, background: '#3E3A39' }} />
          </button>
          <div className="nav-logo">AlphaVision</div>
        </div>
        <div className="nav-right">
          {supabase && user ? (
            <>
              <span className="nav-user">{user.email}</span>
              <motion.button className="btn-ghost" onClick={() => supabase.auth.signOut()}
                whileHover={{ y: -1, transition: { duration: 0.3 } }}>登出</motion.button>
            </>
          ) : supabase ? (
            <motion.button className="btn-outline" onClick={() => setShowAuth(true)}
              whileHover={{ y: -1, transition: { duration: 0.3 } }}>登入 / 註冊</motion.button>
          ) : null}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero-wrap">
        <div className="hero-rule-top" />
        <motion.div className="hero-eyebrow" {...FU(0)}>
          Taiwan Stock Intelligence Platform
        </motion.div>
        <motion.h1 className="hero-title" {...FU(0.1)}>
          {user ? (
            <>Hi, {user.email?.split('@')[0] || '投資者'}<br /><em>歡迎回來</em></>
          ) : (
            <>看穿市場<br /><em>比主力早一步</em></>
          )}
        </motion.h1>
        <div className="hero-rule-mid" />
        <motion.p className="hero-sub" {...FU(0.2)}>
          整合國發會景氣燈號、三大法人籌碼、PTT 散戶情緒<br />
          為散戶打造的機構級決策平台
        </motion.p>
        <motion.button
          className="btn-primary"
          {...FU(0.3)}
          whileHover={{ y: -2, backgroundColor: '#9E4E2F', transition: { duration: 0.4 } }}
          onClick={() => document.getElementById('s01').scrollIntoView({ behavior: 'smooth' })}
        >
          進入戰情室
        </motion.button>
        <div className="hero-scroll">
          <span>Scroll</span>
          <div className="scroll-bar" />
        </div>
      </section>

      {/* ── Eli5 Banner ── */}
      {sentimentData?.eli5_advice && (
        <motion.div className="eli5" {...FU()}>
          <span className="eli5-icon">✦</span>
          <p className="eli5-text">
            <strong>今日建議：</strong>{sentimentData.eli5_advice}
          </p>
        </motion.div>
      )}

      <hr className="full-divider" style={{ margin: '0 52px' }} />

      {/* ── #01 宏觀訊號 ── */}
      <div id="s01" className="section-wrap">
        <motion.div className="section-head" {...FU()}>
          <span className="section-num">#01</span>
          <div>
            <h2 className="section-title">宏觀景氣訊號</h2>
            <p className="section-desc">國發會景氣對策信號（近三年）× 三大法人日報</p>
          </div>
        </motion.div>

        <div className="grid-2">
          {/* Macro Area Chart */}
          <FadeCard delay={0.05}>
            <div className="card-label">景氣對策信號</div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={macroData}>
                  <defs>
                    <linearGradient id="macroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.accent} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} />
                  <XAxis dataKey="Date" stroke={C.axis} axisLine={axisLine} tickLine={false} tick={{ ...C.tick, fontSize: 10 }} />
                  <YAxis stroke={C.axis} domain={[0, 50]} axisLine={axisLine} tickLine={false} tick={C.tick} />
                  <Tooltip contentStyle={C.tip} />
                  <ReferenceLine y={38} stroke={C.red}    strokeDasharray="4 3" strokeOpacity={0.6} label={{ value:'紅燈 38', fill: C.red,    fontSize: 11, position:'right' }} />
                  <ReferenceLine y={16} stroke={C.accent} strokeDasharray="4 3" strokeOpacity={0.6} label={{ value:'藍燈 16', fill: C.accent, fontSize: 11, position:'right' }} />
                  <Area type="monotone" dataKey="Signal_Score" name="景氣分數"
                    stroke={C.accent} strokeWidth={2.5} fill="url(#macroGrad)"
                    dot={false} activeDot={{ r: 5, fill: C.accent, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </FadeCard>

          {/* Institutional Bar Chart */}
          <FadeCard delay={0.12}>
            <div className="card-label">三大法人買賣超</div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chipData} barGap={4}>
                  <CartesianGrid stroke={C.grid} />
                  <XAxis dataKey="單位名稱" stroke={C.axis} axisLine={axisLine} tickLine={false} tick={{ ...C.tick, fontSize: 11 }} />
                  <YAxis stroke={C.axis} axisLine={axisLine} tickLine={false} tick={C.tick} width={90} tickFormatter={v => `${(v/1e8).toFixed(0)}億`} />
                  <Tooltip contentStyle={C.tip} formatter={v => new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD'}).format(v)} />
                  <Legend wrapperStyle={{ color: '#B5ADA4', fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="買進金額" fill={C.green}  name="買進" radius={[4,4,0,0]} />
                  <Bar dataKey="賣出金額" fill={C.red}    name="賣出" radius={[4,4,0,0]} />
                  <Bar dataKey="買賣差額" fill={C.accent} name="淨買賣超" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FadeCard>
        </div>
      </div>

      <hr className="full-divider" />

      {/* ── #02 AI 情緒 ── */}
      {sentimentData && (
        <div className="section-wrap">
          <motion.div className="section-head" {...FU()}>
            <span className="section-num">#02</span>
            <div>
              <h2 className="section-title">AI 市場情緒</h2>
              <p className="section-desc">PTT 股板爬蟲 + GPT-4o 恐慌貪婪指數</p>
            </div>
          </motion.div>

          <motion.div className="sentiment-wrap" {...FU(0.05)} {...HOVER}>
            <div className="sentiment-score">
              <div className="sentiment-num" style={{ color: sentColor(sentimentData.fear_greed_score) }}>
                {sentimentData.fear_greed_score}
              </div>
              <div className="sentiment-lbl" style={{ color: sentColor(sentimentData.fear_greed_score) }}>
                {sentimentData.sentiment_label}
              </div>
            </div>
            <div className="sentiment-body">
              <h3>AI 盤後摘要</h3>
              <p>{sentimentData.summary}</p>
              <div className="sentiment-meta">分析文章數：{sentimentData.article_count} 篇</div>
            </div>
          </motion.div>
        </div>
      )}

      <hr className="full-divider" />

      {/* ── #03 個股健檢 ── */}
      <div id="s03" className="section-wrap">
        <motion.div className="section-head" {...FU()}>
          <span className="section-num">#03</span>
          <div>
            <h2 className="section-title">個股 X 光機</h2>
            <p className="section-desc">外資籌碼 · 均線位置 · 集保股權分散</p>
          </div>
        </motion.div>

        {user && watchlist.length > 0 && (
          <motion.div className="watchlist-wrap" {...FU()}>
            <div className="watchlist-label">我的自選股</div>
            <div className="watchlist-chips">
              {watchlist.map(sid => (
                <motion.div className="chip" key={sid} whileHover={{ y: -1, transition: { duration: 0.3 } }}>
                  <button className="chip-id" onClick={() => handleStockSearch(sid)}>{sid}</button>
                  <button className="chip-rm" onClick={() => removeFromWatchlist(sid)}>✕</button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div className="search-row" {...FU(0.05)}>
          <input className="search-input" placeholder="輸入股票代號，例如：2330"
            value={stockInput}
            onChange={e => setStockInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStockSearch()} />
          <motion.button className="btn-primary" onClick={() => handleStockSearch()} disabled={stockLoading}
            whileHover={{ y: -1, backgroundColor: '#9E4E2F', transition: { duration: 0.4 } }}>
            {stockLoading ? '分析中…' : '開始健檢'}
          </motion.button>
        </motion.div>

        {stockError && <p style={{ color: C.red, fontSize: '14px', marginBottom: '16px' }}>{stockError}</p>}

        {distribution && (
          <motion.div {...FU()}>
            <DistributionChart data={distribution.data} stockId={distribution.stock_id} />
          </motion.div>
        )}

        {stockHealth && (
          <motion.div {...FU(0.05)}>
            <div className="health-grid">
              {[
                { label:'外資短線態度', value: stockHealth.foreign_status, ok: stockHealth.foreign_bullish },
                { label:'股價 vs MA20',  value: stockHealth.price_status,   ok: stockHealth.above_ma20 },
                { label:`綜合結論（${stockHealth.stock_id}）`, value: stockHealth.conclusion, detail: stockHealth.conclusion_detail, color: signalBorder[stockHealth.signal] },
              ].map((item, i) => {
                const c = item.color ?? (item.ok === true ? C.green : item.ok === false ? C.red : C.accent);
                return (
                  <motion.div className="health-card" key={i} style={{ borderColor: c }}
                    whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(0,0,0,0.07)', transition: { duration: 0.5 } }}>
                    <div className="health-card-label">{item.label}</div>
                    <div className="health-card-value" style={{ color: c }}>{item.value}</div>
                    {item.detail && <div className="health-card-detail">{item.detail}</div>}
                  </motion.div>
                );
              })}
            </div>

            {supabase && user && (
              <div style={{ marginTop: '14px' }}>
                {watchlist.includes(stockHealth.stock_id) ? (
                  <span style={{ color: C.green, fontSize: '13px' }}>✓ 已加入自選股</span>
                ) : (
                  <motion.button className="btn-outline" style={{ fontSize: '13px' }}
                    onClick={() => addToWatchlist(stockHealth.stock_id)}
                    whileHover={{ y: -1, transition: { duration: 0.3 } }}>
                    ＋ 加入自選股
                  </motion.button>
                )}
              </div>
            )}
            {supabase && !user && (
              <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '10px' }}>
                <button onClick={() => setShowAuth(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
                  登入
                </button>
                {' '}後可保存自選股，下次自動帶入
              </p>
            )}
          </motion.div>
        )}

        {/* 主力成本帶 */}
        {smartMoney && (
          <motion.div style={{ marginTop: '28px' }} {...FU(0.05)}>
            <SmartMoneyChart data={smartMoney} />
          </motion.div>
        )}

        {/* 新聞抗噪濾鏡 */}
        {newsData && (
          <motion.div style={{ marginTop: '32px' }} {...FU(0.08)}>
            <NewsFilter data={newsData} />
          </motion.div>
        )}
      </div>

      <hr className="full-divider" />

      {/* ── #04 回測沙盒 ── */}
      <div className="section-wrap">
        <motion.div className="section-head" {...FU()}>
          <span className="section-num">#04</span>
          <div>
            <h2 className="section-title">策略回測沙盒</h2>
            <p className="section-desc">景氣燈號 × 0050 歷史驗證，無程式碼操作</p>
          </div>
        </motion.div>

        <motion.div className="backtest-cta" {...FU(0.05)} {...HOVER}>
          <h2>無程式碼回測</h2>
          <p>選擇進出場景氣燈號條件<br />驗證「藍燈買入、紅燈出場」的真實歷史績效</p>
          <motion.button className="btn-primary" onClick={() => setShowBacktest(true)}
            whileHover={{ y: -2, backgroundColor: '#9E4E2F', transition: { duration: 0.4 } }}>
            啟動時光機
          </motion.button>
        </motion.div>
      </div>

      <hr className="full-divider" />

      {/* ── #05 資金管理 ── */}
      <div className="section-wrap">
        <motion.div className="section-head" {...FU()}>
          <span className="section-num">#05</span>
          <div>
            <h2 className="section-title">智慧倉位計算</h2>
            <p className="section-desc">單筆虧損不超過總資金 2% 的安全交易原則</p>
          </div>
        </motion.div>
        <motion.div {...FU(0.05)}>
          <PositionCalculator />
        </motion.div>
      </div>

      <hr className="full-divider" />

      {/* ── #06 投資手札 ── */}
      <div id="s06" className="section-wrap">
        <motion.div className="section-head" {...FU()}>
          <span className="section-num">#06</span>
          <div>
            <h2 className="section-title">投資時光軸手札</h2>
            <p className="section-desc">記錄每筆交易心得，AI 評語 × 職人沉澱報告</p>
          </div>
        </motion.div>

        {supabase && user ? (
          <motion.div {...FU(0.05)}>
            <JournalTimeline supabase={supabase} user={user} />
          </motion.div>
        ) : (
          <motion.div
            {...FU(0.05)}
            style={{
              padding: '56px', textAlign: 'center',
              background: '#FFFFFF', border: '1px solid #EDE9E2',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            }}
          >
            <p style={{ fontFamily: "'Noto Serif TC', serif", color: '#857870', fontSize: '16px', marginBottom: '20px' }}>
              登入後才能開啟你的投資手札
            </p>
            <motion.button className="btn-primary" onClick={() => setShowAuth(true)}
              whileHover={{ y: -2, backgroundColor: '#9E4E2F', transition: { duration: 0.4 } }}>
              立即登入 / 註冊
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="footer">
        <p>AlphaVision Pro &nbsp;·&nbsp; Taiwan Stock Intelligence</p>
        <p>數據僅供參考，不構成任何投資建議</p>
      </footer>

      {showBacktest && <BacktestModal onClose={() => setShowBacktest(false)} />}
      {showAuth     && <AuthModal     onClose={() => setShowAuth(false)} />}
    </div>
  );
}
