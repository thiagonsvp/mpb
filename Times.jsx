import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const POSITIONS = ['', 'GOL', 'ZAG', 'LAT', 'MEI', 'ATA']
const TEAM_COLORS = ['#1a6b3a', '#185fa5', '#853f0b', '#722b4e', '#0f5e54', '#4a1b0c']

function Stars({ value, onChange }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(v => (
        <button
          key={v}
          className={`star ${v <= value ? 'on' : 'off'}`}
          onClick={() => onChange(v)}
          type="button"
          title={`${v} estrela${v > 1 ? 's' : ''}`}
        >★</button>
      ))}
    </div>
  )
}

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
  const [nome, setNome] = useState('')
  const [rating, setRating] = useState(0)
  const [posicao, setPosicao] = useState('')
  const [saving, setSaving] = useState(false)
  const [numTimes, setNumTimes] = useState(2)
  const [modo, setModo] = useState('equilibrado')
  const [times, setTimes] = useState([])
  const [reserves, setReserves] = useState([])

  useEffect(() => { loadPlayers() }, [])

  async function loadPlayers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('jogadores')
      .select('*')
      .eq('ativo', true)
      .order('nome')
    if (error) setError('Erro ao carregar jogadores: ' + error.message)
    else setPlayers(data || [])
    setLoading(false)
  }

  async function addPlayer() {
    if (!nome.trim()) { setError('Digite o nome do jogador.'); return }
    if (!rating) { setError('Selecione o nível (1–5 estrelas).'); return }
    setError(''); setSaving(true)
    const { error } = await supabase
      .from('jogadores')
      .insert({ nome: nome.trim(), rating, posicao: posicao || null })
    setSaving(false)
    if (error) { setError('Erro ao salvar: ' + error.message); return }
    setNome(''); setRating(0); setPosicao('')
    loadPlayers()
  }

  async function removePlayer(id) {
    await supabase.from('jogadores').update({ ativo: false }).eq('id', id)
    setPlayers(p => p.filter(x => x.id !== id))
  }

  function generateTeams() {
    const pool = shuffle(players)
    const nt = numTimes
    const perTeam = Math.floor(pool.length / nt)
    const extra = pool.length % nt
    const teams = Array.from({ length: nt }, () => ({ players: [], rating: 0 }))

    if (modo === 'equilibrado') {
      const sorted = [...pool].sort((a, b) => b.rating - a.rating)
      sorted.forEach(p => {
        let bi = 0, br = Infinity
        teams.forEach((t, i) => {
          if (t.players.length < perTeam + (i < extra ? 1 : 0) && t.rating < br) {
            br = t.rating; bi = i
          }
        })
        teams[bi].players.push(p)
        teams[bi].rating += p.rating
      })
      setReserves([])
    } else {
      const main = pool.slice(0, pool.length - extra)
      main.forEach((p, i) => { teams[i % nt].players.push(p); teams[i % nt].rating += p.rating })
      setReserves(pool.slice(pool.length - extra))
    }
    setTimes(teams)

    // salvar sorteio no banco
    supabase.from('sorteios').insert({
      modo,
      times: teams.map((t, i) => ({ time: i + 1, jogadores: t.players.map(p => ({ id: p.id, nome: p.nome })) }))
    }).then()
  }

  const canSort = players.length >= numTimes * 2

  return (
    <div>
      <div className="page-title">Times</div>
      <div className="page-sub">Gerencie os jogadores e sorteie times equilibrados</div>

      {error && <div className="error-banner">{error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button></div>}

      <div className="card">
        <div className="card-title">Adicionar Jogador</div>
        <div className="form-row">
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
            placeholder="Nome do jogador"
            style={{ flex: 2, minWidth: 140 }}
          />
          <Stars value={rating} onChange={setRating} />
          <select value={posicao} onChange={e => setPosicao(e.target.value)} style={{ width: 100 }}>
            {POSITIONS.map(p => <option key={p} value={p}>{p || 'Posição'}</option>)}
          </select>
          <button className="btn btn-primary" onClick={addPlayer} disabled={saving}>
            {saving ? '...' : '+ Add'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Jogadores ({players.length})</div>
        {loading
          ? <div className="loading">Carregando...</div>
          : players.length === 0
            ? <div className="empty">Nenhum jogador cadastrado</div>
            : <div className="list">
              {players.map(p => (
                <div className="list-item" key={p.id}>
                  <span style={{ flex: 1, fontWeight: 500 }}>{p.nome}</span>
                  {p.posicao && <span className="badge receita">{p.posicao}</span>}
                  <span style={{ color: '#f5a623', fontSize: 13, letterSpacing: -1 }}>
                    {'★'.repeat(p.rating)}{'☆'.repeat(5 - p.rating)}
                  </span>
                  <button className="btn btn-sm btn-danger" onClick={() => removePlayer(p.id)}>Remover</button>
                </div>
              ))}
            </div>
        }
      </div>

      <div className="card">
        <div className="card-title">Sorteio</div>
        <div className="form-row" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <div className="form-label">Nº de times</div>
            <select value={numTimes} onChange={e => setNumTimes(+e.target.value)} style={{ width: 120 }}>
              {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} times</option>)}
            </select>
          </div>
          <div className="form-group">
            <div className="form-label">Modo</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={`btn ${modo === 'equilibrado' ? 'btn-primary' : 'btn-secondary'}`} style={{ height: 38 }} onClick={() => setModo('equilibrado')}>Equilibrado</button>
              <button className={`btn ${modo === 'aleatorio' ? 'btn-primary' : 'btn-secondary'}`} style={{ height: 38 }} onClick={() => setModo('aleatorio')}>Aleatório</button>
            </div>
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <div className="form-label">&nbsp;</div>
            <button className="btn btn-primary" onClick={generateTeams} disabled={!canSort} style={{ height: 38 }}>
              🎲 Sortear
            </button>
          </div>
        </div>
        {!canSort && players.length > 0 && (
          <div style={{ fontSize: 13, color: 'var(--amber)', background: 'var(--amber-light)', padding: '8px 12px', borderRadius: 7 }}>
            Mínimo de {numTimes * 2} jogadores para {numTimes} times (faltam {numTimes * 2 - players.length}).
          </div>
        )}

        {times.length > 0 && (
          <div>
            <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
              {times.map((t, i) => {
                const avg = t.players.length ? (t.rating / t.players.length).toFixed(1) : 0
                return (
                  <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: TEAM_COLORS[i % TEAM_COLORS.length], padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Time {i + 1}</span>
                      <span style={{ color: 'rgba(255,255,255,.8)', fontSize: 12 }}>★ {avg}</span>
                    </div>
                    <div style={{ padding: '8px 12px' }}>
                      {t.players.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                          <span style={{ fontWeight: 500 }}>{p.nome}</span>
                          <span style={{ color: '#f5a623' }}>{'★'.repeat(p.rating)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {reserves.length > 0 && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13, color: 'var(--text2)' }}>
                <strong>Reservas:</strong> {reserves.map(p => p.nome).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
