import { useState } from 'react'
import Times from './pages/Times.jsx'
import Mensalidades from './pages/Mensalidades.jsx'
import Financeiro from './pages/Financeiro.jsx'
import './App.css'

const TABS = [
  { id: 'times', label: '⚽ Times' },
  { id: 'mensalidades', label: '👥 Mensalidades' },
  { id: 'financeiro', label: '💰 Financeiro' },
]

export default function App() {
  const [tab, setTab] = useState('times')

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-logo">⚽ Pelada App</span>
          <nav className="app-tabs">
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
        </div>
      </header>
      <main className="app-main">
        {tab === 'times' && <Times />}
        {tab === 'mensalidades' && <Mensalidades />}
        {tab === 'financeiro' && <Financeiro />}
      </main>
    </div>
  )
}
