import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase.js'
import html2canvas from 'html2canvas'

// Time 1=Preto, 2=Vermelho, 3=Branco, 4=Azul, 5=Amarelo, 6=Laranja
const TEAM_COLORS = [
  { bg: '#1a1a1a',  text: '#ffffff' }, // Preto
  { bg: '#c0392b',  text: '#ffffff' }, // Vermelho
  { bg: '#f0f0f0',  text: '#1a1a1a', border: '#c0c0c0' }, // Branco
  { bg: '#1565c0',  text: '#ffffff' }, // Azul
  { bg: '#f59e0b',  text: '#1a1a1a' }, // Amarelo
  { bg: '#ea580c',  text: '#ffffff' }, // Laranja
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Times() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [playersPerTeam, setPlayersPerTeam] = useState(5)
  const [modo, setModo] = useState('equilibrado')
  const [times, setTimes] = useState([])
  const [reserves, setReserves] = useState([])

  // Guard: só persiste no localStorage depois do carregamento inicial,
  // para não sobrescrever o valor salvo com o Set() vazio do estado inicial.
  const playersLoaded = useRef(false)

  useEffect(() => { loadPlayers() }, [])

  async function loadPlayers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('jogadores')
      .select('*')
      .eq('ativo', true)
      .order('nome')
    if (error) {
      setError('Erro ao carregar jogadores: ' + error.message)
    } else {
      setPlayers(data || [])
      // Restaurar seleção salva; se não houver, selecionar todos
      const saved = localStorage.getItem('mpb-last-presences')
      if (saved) {
        const savedIds = JSON.parse(saved)
        const validIds = new Set(savedIds.filter(id => (data || []).some(p => p.id === id)))
        setSelectedIds(validIds)
      } else {
        setSelectedIds(new Set((data || []).map(p => p.id)))
      }
    }
    setLoading(false)
    playersLoaded.current = true
  }

  function togglePlayer(id) {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  // Salva no localStorage apenas após o carregamento inicial
  useEffect(() => {
    if (!playersLoaded.current) return
    localStorage.setItem('mpb-last-presences', JSON.stringify(Array.from(selectedIds)))
  }, [selectedIds])

  function shareImage() {
    const el = document.getElementById('sorteio-resultado')
    const header = document.getElementById('share-header')
    if (!el) return
    if (header) header.style.display = 'flex'
    
    const theme = document.body.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff'
    
    html2canvas(el, { backgroundColor: theme }).then(canvas => {
      if (header) header.style.display = 'none'
      canvas.toBlob(blob => {
        if (!blob) return
        const file = new File([blob], 'sorteio.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare({ files: [file] })) {
          navigator.share({ title: 'Sorteio de Times', files: [file] }).catch(err => console.error("Erro ao compartilhar", err))
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'sorteio.png'
          a.click()
        }
      })
    }).catch(err => {
      console.error(err)
      if (header) header.style.display = 'none'
    })
  }

  function selectAll() {
    setSelectedIds(new Set(players.map(p => p.id)))
  }

  function selectNone() {
    setSelectedIds(new Set())
  }

  function generateTeams() {
    const pool = shuffle(players.filter(p => selectedIds.has(p.id)))

    // Ex: 27 jogadores, 5 por time => 5 times de 5 + 1 time de 2
    const fullTeams = Math.floor(pool.length / playersPerTeam)
    const remainder = pool.length % playersPerTeam
    // Capacidade de cada time: os primeiros `fullTeams` têm `playersPerTeam`,
    // o último tem `remainder` (se houver). Mínimo de 2 times.
    const nt = Math.max(2, remainder > 0 ? fullTeams + 1 : fullTeams)
    // Slot de cada time: [playersPerTeam, playersPerTeam, ..., remainder]
    const teamCaps = Array.from({ length: nt }, (_, i) => {
      if (i < fullTeams) return playersPerTeam
      return remainder > 0 ? remainder : playersPerTeam
    })
    const teams = Array.from({ length: nt }, () => ({ players: [], rating: 0 }))

    if (modo === 'equilibrado') {
      // Distribui do mais habilidoso ao menos, priorizando o time com menor rating
      // que ainda tem vaga respeitando a capacidade individual de cada time
      const sorted = [...pool].sort((a, b) => b.rating - a.rating)
      sorted.forEach(p => {
        let bi = 0, br = Infinity
        teams.forEach((t, i) => {
          if (t.players.length < teamCaps[i] && t.rating < br) {
            br = t.rating; bi = i
          }
        })
        teams[bi].players.push(p)
        teams[bi].rating += p.rating
      })
    } else {
      // Aleatório: round-robin respeitando capacidades
      let ti = 0
      pool.forEach(p => {
        while (teams[ti].players.length >= teamCaps[ti]) ti++
        teams[ti].players.push(p)
        teams[ti].rating += p.rating
      })
    }
    setReserves([])
    setTimes(teams)

    // salvar sorteio no banco
    supabase.from('sorteios').insert({
      modo,
      times: teams.map((t, i) => ({ time: i + 1, jogadores: t.players.map(p => ({ id: p.id, nome: p.nome })) }))
    }).then()
  }

  const canSort = selectedIds.size >= playersPerTeam * 2

  return (
    <div className="fade-in">
      <div className="page-title">Sorteio de Times</div>
      <div className="page-sub">Selecione quem veio hoje e sorteie os times</div>

      {error && <div className="error-banner">{error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button></div>}

      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Lista de Presença ({selectedIds.size}/{players.length})</span>
          <div style={{ display: 'flex', gap: 6 }}>
             <button className="btn btn-sm btn-secondary" onClick={selectAll}>Todos</button>
             <button className="btn btn-sm btn-secondary" onClick={selectNone}>Nenhum</button>
          </div>
        </div>
        {loading
          ? <div className="loading">Carregando...</div>
          : players.length === 0
            ? <div className="empty">Nenhum jogador cadastrado. Vá até a aba Elenco.</div>
            : <div className="grid-list">
              {players.map(p => {
                const isSelected = selectedIds.has(p.id)
                return (
                  <div 
                    key={p.id} 
                    className={`selectable-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => togglePlayer(p.id)}
                  >
                    <div className="checkbox">
                      {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.3, marginTop: 2 }}>
                         {p.posicao && <span style={{ fontWeight: 600, color: 'var(--amber)', display: 'block' }}>{p.posicao}</span>}
                         <span style={{ color: '#f5a623', letterSpacing: '-1px', fontSize: 10 }}>{'★'.repeat(p.rating)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
        }
      </div>

      <div className="card">
        <div className="card-title">Configurar Sorteio</div>
        <div className="form-row" style={{ marginBottom: 12 }}>
          <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
            <div className="form-label">Jogadores por time</div>
            <select value={playersPerTeam} onChange={e => setPlayersPerTeam(+e.target.value)}>
              {[3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} jogadores</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: 140 }}>
            <div className="form-label">Modo</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={`btn ${modo === 'equilibrado' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, padding: 0 }} onClick={() => setModo('equilibrado')}>Equilibrado</button>
              <button className={`btn ${modo === 'aleatorio' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, padding: 0 }} onClick={() => setModo('aleatorio')}>Aleatório</button>
            </div>
          </div>
        </div>
        
        <button className="btn btn-primary" onClick={generateTeams} disabled={!canSort} style={{ width: '100%', height: 46, fontSize: 16 }}>
          🎲 Sortear Times
        </button>

        {!canSort && selectedIds.size > 0 && (
          <div style={{ fontSize: 13, color: 'var(--amber)', background: 'var(--amber-light)', padding: '8px 12px', borderRadius: 8, marginTop: 12 }}>
            Selecione pelo menos {playersPerTeam * 2} jogadores para sortear com {playersPerTeam} por time.
          </div>
        )}

        {times.length > 0 && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Resultado</h3>
              <button className="btn btn-sm btn-secondary" onClick={shareImage} style={{ background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                Compartilhar
              </button>
            </div>
            
            <div id="sorteio-resultado" style={{ padding: '16px 10px', background: 'var(--card)', borderRadius: 10 }}>
              <div id="share-header" style={{ display: 'none', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
                <img src="/logo.png" alt="Motivos para Beber" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <span style={{ fontSize: 20, fontWeight: 'bold' }}>Motivos para Beber 🍻</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
              {times.map((t, i) => {
                const avg = t.players.length ? (t.rating / t.players.length).toFixed(1) : 0
                return (
                  <div key={i} style={{ border: `1.5px solid ${TEAM_COLORS[i % TEAM_COLORS.length].border || TEAM_COLORS[i % TEAM_COLORS.length].bg}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: TEAM_COLORS[i % TEAM_COLORS.length].bg, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: TEAM_COLORS[i % TEAM_COLORS.length].text, fontWeight: 700, fontSize: 14 }}>Time {i + 1}</span>
                      <span style={{ color: TEAM_COLORS[i % TEAM_COLORS.length].text, opacity: .75, fontSize: 12 }}>★ {avg}</span>
                    </div>
                    <div style={{ padding: '8px 12px' }}>
                      {t.players.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                          <span style={{ fontWeight: 500 }}>{p.nome}</span>
                          <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{p.posicao || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {reserves.length > 0 && (
              <div style={{ marginTop: 10, padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text2)' }}>
                <strong>Reservas (Ficaram de fora):</strong> <br/>
                {reserves.map(p => p.nome).join(', ')}
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
