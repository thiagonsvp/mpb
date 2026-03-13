import { useState, useEffect } from 'react'
import Jogadores from './Jogadores.jsx'
import Times from './Times.jsx'
import Mensalidades from './Mensalidades.jsx'
import Financeiro from './Financeiro.jsx'
import Resenha from './Resenha.jsx'
import './App.css'

const TABS = [
  { id: 'jogadores', label: '👤 Elenco', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'times', label: '⚽ Sorteio', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'mensalidades', label: '💲 Cobranças', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'resenha', label: '🍻 Resenha', icon: 'M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z' },
  { id: 'financeiro', label: '📊 Financeiro', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
]

export default function App() {
  const [tab, setTab] = useState('times')
  const [theme, setTheme] = useState(() => localStorage.getItem('mpb-theme') || 'light')

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('mpb-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.png" alt="MPB App Logo" style={{ height: 26, width: 26, objectFit: 'contain' }} />
            <span>Motivos para Beber 🍻</span>
          </div>
          <nav className="app-tabs desktop-tabs">
            {TABS.map(t => (
               <button
                 key={t.id}
                 className={`app-tab${tab === t.id ? ' active' : ''}`}
                 onClick={() => setTab(t.id)}
               >
                 {t.label}
               </button>
            ))}
          </nav>
          
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Alterar Tema" style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px' }}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>
      <main className="app-main">
        {tab === 'jogadores' && <Jogadores />}
        {tab === 'times' && <Times />}
        {tab === 'mensalidades' && <Mensalidades />}
        {tab === 'resenha' && <Resenha />}
        {tab === 'financeiro' && <Financeiro />}
      </main>

      <nav className="mobile-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`mobile-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
            <span>{t.label.replace(/👤 |⚽ |💲 |📊 |🍻 /, '')}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
