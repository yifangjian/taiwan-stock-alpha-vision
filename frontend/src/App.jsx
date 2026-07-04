import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from './hooks/useResponsive';

import Sidebar       from './components/Sidebar';
import AuthModal     from './components/AuthModal';
import ProfileModal  from './components/ProfileModal';
import { supabase }  from './lib/supabase';
import { useUserProfile } from './hooks/useUserProfile';

import HomePage       from './pages/HomePage';
import DashboardPage  from './pages/DashboardPage';
import AnalysisPage   from './pages/AnalysisPage';
import ScreenerPage   from './pages/ScreenerPage';
import JournalPage    from './pages/JournalPage';
import LazyPickerPage from './pages/LazyPickerPage';
import AssistantPage  from './pages/AssistantPage';
import PortfolioPage  from './pages/PortfolioPage';
import AlertsPage     from './pages/AlertsPage';

import './App.css';

const PAGE_TITLES = {
  '/':            'AlphaVision',
  '/dashboard':   '戰情中心',
  '/analysis':    '個股分析',
  '/screener':    '選股濾網',
  '/journal':     '投資手札',
  '/lazy-picker': '零股選股器',
  '/assistant':   '選股助手',
  '/portfolio':   '投資組合',
  '/alerts':      '條件推播',
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user,         setUser]         = useState(null);
  const [watchlist,    setWatchlist]    = useState([]);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [showAuth,     setShowAuth]     = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);

  const { profile, saving, saveProfile } = useUserProfile(user);
  const { isMobile } = useResponsive();

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

  const pageTitle = PAGE_TITLES[location.pathname] || 'AlphaVision';

  return (
    <div className="artisan-bg" style={{ minHeight: '100vh' }}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenProfile={() => { setSidebarOpen(false); setShowProfile(true); }}
      />

      {/* ── Navbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: isMobile ? '0 16px' : '0 36px', height: 60,
        background: 'rgba(249,246,240,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #EDE9E2',
      }}>
        {/* Left: hamburger + logo/breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="開啟選單"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', flexDirection: 'column', gap: 5 }}
          >
            <div style={{ width: 22, height: 1, background: '#3E3A39' }} />
            <div style={{ width: 15, height: 1, background: '#3E3A39' }} />
            <div style={{ width: 22, height: 1, background: '#3E3A39' }} />
          </button>

          <button onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 15, fontWeight: 500, color: '#3E3A39' }}>
              AlphaVision
            </span>
            {location.pathname !== '/' && (
              <>
                <span style={{ color: '#CFC9BF', fontSize: 13 }}>·</span>
                <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 14, color: '#A3907C' }}>{pageTitle}</span>
              </>
            )}
          </button>
        </div>

        {/* Right: auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {supabase && user ? (
            <>
              {!isMobile && (
                <span style={{ fontSize: 12, color: '#B5ADA4', fontFamily: 'monospace', letterSpacing: 1 }}>
                  {user.email?.split('@')[0]}
                </span>
              )}
              <motion.button
                onClick={() => supabase.auth.signOut()}
                whileHover={{ y: -1, transition: { duration: 0.2 } }}
                style={{ background: 'none', border: '1px solid #EDE9E2', color: '#857870', padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1 }}>
                登出
              </motion.button>
            </>
          ) : supabase ? (
            <motion.button
              onClick={() => setShowAuth(true)}
              whileHover={{ y: -1, transition: { duration: 0.2 } }}
              style={{ background: '#3E3A39', border: 'none', color: '#F9F6F0', padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontFamily: "'Noto Serif TC', serif", letterSpacing: 1 }}>
              登入 / 註冊
            </motion.button>
          ) : null}
        </div>
      </nav>

      {/* ── Page transitions ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <Routes location={location}>
            <Route path="/"          element={<HomePage user={user} />} />
            <Route path="/dashboard" element={
              <DashboardPage portfolio={watchlist} profile={profile} />
            } />
            <Route path="/analysis"  element={
              <AnalysisPage
                user={user}
                watchlist={watchlist}
                onWatchlistChange={setWatchlist}
              />
            } />
            <Route path="/screener"  element={<ScreenerPage />} />
            <Route path="/journal"   element={
              <JournalPage
                user={user}
                supabase={supabase}
                onShowAuth={() => setShowAuth(true)}
              />
            } />
            <Route path="/lazy-picker" element={<LazyPickerPage />} />
            <Route path="/assistant"  element={
              <AssistantPage profile={profile} portfolio={watchlist} />
            } />
            <Route path="/portfolio" element={<PortfolioPage user={user} />} />
            <Route path="/alerts"    element={<AlertsPage user={user} />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <AnimatePresence>
        {showProfile && (
          <ProfileModal
            profile={profile}
            saving={saving}
            onSave={saveProfile}
            onClose={() => setShowProfile(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
