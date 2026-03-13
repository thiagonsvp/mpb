import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'

const POSITIONS = ['', 'GOL', 'ZAG', 'LAT', 'MEI', 'ATA']

function Stars({ value, onChange }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
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

export default function Jogadores() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [tipo, setTipo] = useState('mensalista')
  const [rating, setRating] = useState(0)
  const [posicao, setPosicao] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [historico, setHistorico] = useState([])

  function handleTelefone(val) {
    let v = val.replace(/\D/g, '')
    if (v.length > 2) v = `(${v.substring(0,2)}) ${v.substring(2)}`
    if (v.length > 10) v = `${v.substring(0,10)}-${v.substring(10)}`
    setTelefone(v.substring(0, 15))
  }

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

  async function savePlayer() {
    if (!nome.trim()) { setError('Digite o nome do jogador.'); return }
    if (!rating) { setError('Selecione o nível (1–10 estrelas).'); return }
    setError(''); setSaving(true)
    
    let error
    if (editingId) {
      const { error: err } = await supabase
        .from('jogadores')
        .update({ nome: nome.trim(), rating, posicao: posicao || null, telefone: telefone || null, tipo })
        .eq('id', editingId)
      error = err
    } else {
      const { error: err } = await supabase
        .from('jogadores')
        .insert({ nome: nome.trim(), rating, posicao: posicao || null, telefone: telefone || null, tipo })
      error = err
    }
    
    setSaving(false)
    if (error) { setError('Erro ao salvar: ' + error.message); return }
    
    setNome(''); setTelefone(''); setTipo('mensalista'); setRating(0); setPosicao(''); setEditingId(null)
    loadPlayers()
  }

  function editPlayer(p) {
    setEditingId(p.id)
    setNome(p.nome)
    setTelefone(p.telefone || '')
    setTipo(p.tipo || 'mensalista')
    setRating(p.rating)
    setPosicao(p.posicao || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    loadHistorico(p.id)
  }

  async function loadHistorico(id) {
    setHistorico([])
    const { data } = await supabase.from('mensalidades').select('*').eq('jogador_id', id).order('mes', { ascending: false })
    setHistorico(data || [])
  }

  function cancelEdit() {
    setEditingId(null)
    setHistorico([])
    setNome(''); setTelefone(''); setTipo('mensalista'); setRating(0); setPosicao('');
  }

  async function removePlayer(id) {
    if (!window.confirm('Tem certeza que deseja excluir este jogador?')) return;
    await supabase.from('jogadores').update({ ativo: false }).eq('id', id)
    setPlayers(p => p.filter(x => x.id !== id))
  }

  return (
    <div className="fade-in">
      <div className="page-title">Jogadores</div>
      <div className="page-sub">Cadastre e gerencie o elenco da pelada</div>

      {error && <div className="error-banner">{error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button></div>}

      <div className="card">
        <div className="card-title">{editingId ? 'Editar Jogador' : 'Adicionar Jogador'}</div>
        <div className="form-row">
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && savePlayer()}
            placeholder="Nome"
            style={{ flex: 1.2, minWidth: 140 }}
          />
          <input
            value={telefone}
            onChange={e => handleTelefone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && savePlayer()}
            placeholder="(00) 00000-0000"
            style={{ width: 140 }}
          />
          <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ width: 110 }}>
            <option value="mensalista">Mensalista</option>
            <option value="diarista">Diarista</option>
          </select>
          <div style={{ flexBasis: '100%', display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
            <Stars value={rating} onChange={setRating} />
            <select value={posicao} onChange={e => setPosicao(e.target.value)} style={{ width: 100 }}>
              {POSITIONS.map(p => <option key={p} value={p}>{p || 'Posição'}</option>)}
            </select>
            <button className="btn btn-primary" onClick={savePlayer} disabled={saving} style={{ marginLeft: 'auto' }}>
              {saving ? '...' : editingId ? 'Salvar' : '+ Adicionar'}
            </button>
            {editingId && (
              <button className="btn btn-secondary" onClick={cancelEdit} disabled={saving}>
                Cancelar
              </button>
            )}
          </div>
        </div>

        {editingId && historico.length > 0 && (
          <div className="fade-in" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Histórico Financeiro ({historico.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, maxHeight: 180, overflowY: 'auto' }}>
              {historico.map(h => (
                <div key={h.id} style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 500 }}>{h.mes.split('-').reverse().join('/')}</div>
                    <div style={{ color: 'var(--text2)', fontSize: 12 }}>R$ {Number(h.valor).toFixed(2)}</div>
                  </div>
                  <span className={`badge ${h.status}`}>{h.status.charAt(0).toUpperCase() + h.status.slice(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Elenco Atual ({players.length})</div>
        {loading
          ? <div className="loading">Carregando...</div>
          : players.length === 0
            ? <div className="empty">Nenhum jogador cadastrado</div>
            : <div className="list">
              {players.map(p => (
                <div className="list-item" key={p.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{p.nome} <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 'normal', marginLeft: 4 }}>{p.telefone || ''}</span></div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                      <span className={`badge ${p.tipo === 'mensalista' ? 'blue' : 'amber'}`}>{p.tipo || 'mensalista'}</span>
                      {p.posicao && <span className="badge receita">{p.posicao}</span>}
                      <span style={{ color: '#f5a623', fontSize: 14, letterSpacing: -1 }}>
                        {'★'.repeat(p.rating)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => editPlayer(p)}>
                      Editar
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => removePlayer(p.id)} title="Excluir">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}
