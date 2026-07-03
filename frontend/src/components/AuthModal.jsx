import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

const overlay = {
  position: 'fixed', inset: 0,
  backgroundColor: 'rgba(62,58,57,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000,
}
const modal = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #EDE9E2',
  padding: '40px',
  width: '90%', maxWidth: '400px',
  boxShadow: '0 16px 48px rgba(0,0,0,0.10)',
}
const inputStyle = {
  width: '100%', padding: '11px 14px', fontSize: '15px',
  background: '#F9F6F0', color: '#3E3A39',
  border: '1px solid #EDE9E2', outline: 'none',
  boxSizing: 'border-box', marginTop: '6px', lineHeight: 1.5,
}

export default function AuthModal({ onClose }) {
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [message,  setMessage]  = useState('')

  const handleSubmit = async () => {
    if (!supabase || !email || !password) return
    setLoading(true); setError(''); setMessage('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('✓ 驗證信已寄出，請確認信箱後登入')
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '8px', cursor: 'pointer', background: 'none',
    border: 'none', borderBottom: active ? '1px solid #A3907C' : '1px solid #EDE9E2',
    color: active ? '#A3907C' : '#B5ADA4',
    fontFamily: "'Noto Serif TC', serif", fontSize: '14px',
    fontWeight: active ? 500 : 400, letterSpacing: '1px',
  })

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div style={modal}
        initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontFamily:"'Noto Serif TC', serif", fontSize: '18px', fontWeight: 400, color: '#3E3A39' }}>會員系統</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#B5ADA4', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', marginBottom: '28px', gap: '0' }}>
          <button style={tabStyle(mode === 'login')}  onClick={() => { setMode('login');    setError(''); setMessage('') }}>登入</button>
          <button style={tabStyle(mode === 'register')} onClick={() => { setMode('register'); setError(''); setMessage('') }}>註冊</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: '#B5ADA4', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'monospace' }}>Email</label>
            <input style={inputStyle} type="email" value={email} placeholder="you@example.com"
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label style={{ color: '#B5ADA4', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'monospace' }}>密碼</label>
            <input style={inputStyle} type="password" value={password} placeholder="至少 6 個字元"
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
        </div>

        {error   && <p style={{ color: '#B85C38', marginTop: '12px', fontSize: '13px' }}>{error}</p>}
        {message && <p style={{ color: '#4A9B6F', marginTop: '12px', fontSize: '13px' }}>{message}</p>}

        <motion.button
          onClick={handleSubmit} disabled={loading}
          style={{
            width: '100%', marginTop: '24px', padding: '13px',
            background: '#B85C38', color: '#fff', border: 'none',
            fontFamily: "'Noto Serif TC', serif", fontSize: '15px', letterSpacing: '2px', cursor: 'pointer',
          }}
          whileHover={{ backgroundColor: '#9E4E2F', y: -1, transition: { duration: 0.4 } }}>
          {loading ? '處理中…' : mode === 'login' ? '登入' : '建立帳號'}
        </motion.button>
      </motion.div>
    </div>
  )
}
