import { useState } from 'react'
import './App.css'

export default function Login({ onLogin }) {
  const [role, setRole] = useState(null) // 'admin' or 'user'
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleLogin() {
    if (role === 'admin') {
      if (password === 'admin123') { // Simple default password
        onLogin('admin')
      } else {
        setError('Senha incorreta!')
      }
    } else if (role === 'user') {
      onLogin('user')
    }
  }

  return (
    <div className="login-screen" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--grad-header)',
      padding: 20
    }}>
      <style>
        {`
          .login-card {
            max-width: 400px;
            width: 100%;
            padding: 40px;
            text-align: center;
            background: var(--card);
            border-radius: var(--radius);
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          }
          .login-logo {
            height: 80px;
            width: 80px;
            object-fit: contain;
            margin-bottom: 20px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
          }
        `}
      </style>
      <div className="login-card fade-in">
        <img src="/logo.png" alt="MPB App Logo" className="login-logo" />
        <h1 className="page-title" style={{ fontSize: 26, marginBottom: 8, display: 'block' }}>
          Motivos para Beber 🍻
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 32 }}>Gestão de Pelada & Resenha</p>

        {!role ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button className="btn btn-primary" onClick={() => setRole('admin')} style={{ height: 54, fontSize: 16, width: '100%' }}>
              👑 Administrador
            </button>
            <button className="btn btn-secondary" onClick={() => setRole('user')} style={{ height: 54, fontSize: 16, width: '100%' }}>
              ⚽ Usuário (Sorteio/Resenha)
            </button>
          </div>
        ) : (
          <div className="fade-in">
            {role === 'admin' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label">Senha do Administrador</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="Digite a senha..."
                    autoFocus
                  />
                </div>
                {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600, marginTop: -8 }}>{error}</div>}
                <button className="btn btn-primary" onClick={handleLogin} style={{ height: 48, width: '100%' }}>
                  Entrar no Sistema
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
                  O acesso de usuário permite participar dos sorteios e ver os detalhes da resenha.
                </p>
                <button className="btn btn-primary" onClick={handleLogin} style={{ height: 48, width: '100%' }}>
                  Acessar como Usuário
                </button>
              </div>
            )}
            <button 
              className="btn" 
              onClick={() => { setRole(null); setError(''); setPassword(''); }} 
              style={{ marginTop: 20, border: 'none', background: 'none', fontSize: 13, color: 'var(--text3)', textDecoration: 'underline' }}
            >
              Alterar tipo de acesso
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
