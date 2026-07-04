import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useResponsive } from '../hooks/useResponsive';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const SUGGESTIONS = [
  '幫我找穩定配息的金融股，股價在 50 元以下',
  '台積電現在適合買進嗎？',
  '幫我篩選半導體成長股',
  '我想了解什麼是主力籌碼集中？',
  '目前大盤氛圍如何？',
];

function StockCard({ stock }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#F9F6F0', border: '1px solid #EDE9E2',
        padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 15, fontWeight: 500, color: '#3E3A39' }}>
            {stock.name}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#B5ADA4' }}>
            {stock.stock_id}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#B5ADA4', marginTop: 4 }}>{stock.industry}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {stock.price != null && (
          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: '#3E3A39' }}>
            ${stock.price}
          </div>
        )}
        {stock.dividend_yield != null && (
          <div style={{ fontSize: 12, color: '#4A9B6F', marginTop: 2 }}>
            殖利率 {stock.dividend_yield}%
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
      }}
    >
      <div style={{ maxWidth: '78%' }}>
        {!isUser && (
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#B5ADA4', marginBottom: 6, textTransform: 'uppercase' }}>
            AlphaVision AI
          </div>
        )}
        <div style={{
          padding: '14px 18px',
          background: isUser ? '#3E3A39' : '#FFFFFF',
          color: isUser ? '#F9F6F0' : '#3E3A39',
          border: isUser ? 'none' : '1px solid #EDE9E2',
          boxShadow: isUser ? 'none' : '0 4px 16px rgba(0,0,0,0.04)',
          fontFamily: "'Noto Serif TC', serif",
          fontSize: 15, lineHeight: 1.85,
          whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
        </div>

        {/* Stock cards attached to AI response */}
        {msg.stocks?.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {msg.stocks.map(s => <StockCard key={s.stock_id} stock={s} />)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AssistantPage({ profile, portfolio }) {
  const { isMobile } = useResponsive();
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [thinking,  setThinking]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (text) => {
    const content = text || input.trim();
    if (!content || thinking) return;
    setInput('');

    const userMsg = { role: 'user', content };
    const history = [...messages, userMsg];
    setMessages(history);
    setThinking(true);

    try {
      const { data } = await axios.post(`${API}/api/v1/assistant/chat`, {
        messages:  history.map(m => ({ role: m.role, content: m.content })),
        profile:   profile || {},
        portfolio: portfolio || [],
      });
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply, stocks: data.stocks || [] },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '（連線失敗，請確認後端是否運行中）', stocks: [] },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{
      maxWidth: 800, margin: '0 auto',
      padding: isMobile ? '20px 16px 0' : '48px 52px 0',
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)',
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: 32, flexShrink: 0 }}
      >
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#B5ADA4', marginBottom: 10 }}>
          AI Assistant
        </div>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 28, fontWeight: 400, color: '#3E3A39', margin: 0 }}>
          選股助手
        </h1>
        <p style={{ fontSize: 13, color: '#B5ADA4', marginTop: 8, lineHeight: 1.7 }}>
          {profile?.risk_tolerance
            ? `你好，${profile.risk_tolerance}型投資人 — 請問有什麼可以幫你？`
            : '請用自然語言描述你想找的股票，或直接提問'}
        </p>
      </motion.div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
        {/* Empty state: suggestions */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#CFC9BF', textTransform: 'uppercase', marginBottom: 16 }}>
              快速提問
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => send(s)}
                  whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  style={{
                    background: '#FFFFFF', border: '1px solid #EDE9E2',
                    padding: '13px 18px', textAlign: 'left', cursor: 'pointer',
                    fontFamily: "'Noto Serif TC', serif", fontSize: 14, color: '#857870',
                    display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}
                >
                  <span style={{ color: '#CFC9BF', fontFamily: 'monospace', fontSize: 11 }}>→</span>
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message history */}
        <AnimatePresence>
          {messages.map((m, i) => <Message key={i} msg={m} />)}
        </AnimatePresence>

        {/* Thinking indicator */}
        {thinking && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 16 }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: '#A3907C' }}
              />
            ))}
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#B5ADA4', marginLeft: 4 }}>
              思考中⋯
            </span>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0, borderTop: '1px solid #EDE9E2',
        padding: '20px 0 28px',
        display: 'flex', gap: 12, alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="輸入問題，按 Enter 送出（Shift+Enter 換行）"
          rows={1}
          style={{
            flex: 1, resize: 'none',
            padding: '12px 16px', fontSize: 15,
            fontFamily: "'Noto Serif TC', serif",
            background: '#FFFFFF', color: '#3E3A39',
            border: '1px solid #EDE9E2', outline: 'none',
            lineHeight: 1.7,
            minHeight: 50, maxHeight: 160,
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = '#A3907C'}
          onBlur={e => e.target.style.borderColor = '#EDE9E2'}
        />
        <motion.button
          onClick={() => send()}
          disabled={thinking || !input.trim()}
          whileHover={{ y: -1, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '12px 24px', height: 50, flexShrink: 0,
            background: thinking || !input.trim() ? '#EDE9E2' : '#B85C38',
            color: thinking || !input.trim() ? '#B5ADA4' : '#FFFFFF',
            border: 'none', cursor: thinking || !input.trim() ? 'default' : 'pointer',
            fontFamily: "'Noto Serif TC', serif", fontSize: 14,
            transition: 'background 0.2s',
          }}
        >
          送出
        </motion.button>
      </div>
    </div>
  );
}
