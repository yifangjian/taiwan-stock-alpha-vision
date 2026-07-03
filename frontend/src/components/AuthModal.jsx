import { useState } from 'react'
import { supabase } from '../lib/supabase'

const overlay = {
  position: 'fixed', inset: 0,
  backgroundColor: 'rgba(0,0,0,0.75)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000,
}
const modal = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '16px',
  padding: '32px',
  width: '90%', maxWidth: '420px',
}
const inputStyle = {
  width: '100%', padding: '10px 14px', fontSize: '15px',
  backgroundColor: '#0f172a', color: '#f8fafc',
  border: '1px solid #475569', borderRadius: '8px',
  boxSizing: 'border-box', marginTop: '4px',
}

export default function AuthModal({ onClose }) {
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [message, setMessage] = useState('')

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
        setMessage('✅ 驗證信已寄出，請確認信箱後登入')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '8px', cursor: 'pointer',
    backgroundColor: active ? '#334155' : 'transparent',
    color: active ? '#38bdf8' : '#64748b',
    border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold',
  })

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#38bdf8' }}>👤 會員系統</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#0f172a', borderRadius: '8px', padding: '4px', marginBottom: '24px' }}>
          <button style={tabStyle(mode === 'login')}  onClick={() => { setMode('login');    setError(''); setMessage('') }}>登入</button>
          <button style={tabStyle(mode === 'register')} onClick={() => { setMode('register'); setError(''); setMessage('') }}>註冊</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: '13px' }}>Email</label>
            <input style={inputStyle} type="email" value={email}
              placeholder="you@example.com"
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: '13px' }}>密碼</label>
            <input style={inputStyle} type="password" value={password}
              placeholder="至少 6 個字元"
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
        </div>

        {error   && <p style={{ color: '#ef4444', margin: '12px 0 0', fontSize: '14px' }}>{error}</p>}
        {message && <p style={{ color: '#10b981', margin: '12px 0 0', fontSize: '14px' }}>{message}</p>}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', marginTop: '20px', padding: '12px',
          fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
          backgroundColor: '#38bdf8', color: '#0f172a',
          border: 'none', borderRadius: '10px',
        }}>
          {loading ? '處理中...' : mode === 'login' ? '🔑 登入' : '📝 建立帳號'}
        </button>
      </div>
    </div>
  )
}
