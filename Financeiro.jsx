import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const CATEGORIAS_RECEITA = ['Mensalidade', 'Patrocínio', 'Evento', 'Outros']
const CATEGORIAS_DESPESA = ['Aluguel campo', 'Equipamento', 'Arbitragem', 'Uniforme', 'Lanche', 'Outros']

function fmtDate(d) {
  if (!d) return ''
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

export default function Financeiro() {
  const [transacoes, setTransacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [desc, setDesc] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('receita')
  const [cat, setCat] = useState('Mensalidade')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('todos')

  useEffect(() => { loadTransacoes() }, [])

  // atualiza categorias quando muda tipo
  useEffect(() => {
    setCat(tipo === 'receita' ? CATEGORIAS_RECEITA[0] : CATEGORIAS_DESPESA[0])
  }, [tipo])

  async function loadTransacoes() {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('transacoes')
      .select('*')
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setError('Erro ao carregar: ' + error.message)
    else setTransacoes(rows || [])
    setLoading(false)
  }

  async function addTransacao() {
    const v = parseFloat(valor)
    if (!desc.trim() || !v || v <= 0) { setError('Preencha descrição e valor.'); return }
    setError(''); setSaving(true)
    const { error } = await supabase.from('transacoes').insert({
      descricao: desc.trim(),
      valor: v,
      tipo,
      categoria: cat,
      data,
    })
    setSaving(false)
    if (error) { setError('Erro: ' + error.message); return }
    setDesc(''); setValor('')
    loadTransacoes()
  }

  async function deleteTransacao(id) {
    await supabase.from('transacoes').delete().eq('id', id)
    setTransacoes(t => t.filter(x => x.id !== id))
  }

  const filtered = filter === 'todos' ? transacoes : transacoes.filter(t => t.tipo === filter)
  const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0)
  const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0)
  const saldo = receitas - despesas

  const cats = tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  return (
    <div>
      <div className="page-title">Financeiro</div>
      <div className="page-sub">Contas a receber e a pagar da pelada</div>

      <div className="metrics">
        <div className="metric">
          <div className="metric-label">Receitas</div>
          <div className="metric-value green">R$ {receitas.toFixed(2)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Despesas</div>
          <div className="metric-value red">R$ {despesas.toFixed(2)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Saldo</div>
          <div className={`metric-value ${saldo >= 0 ? 'green' : 'red'}`}>R$ {saldo.toFixed(2)}</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="card-title">Novo lançamento</div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
            <div className="form-label">Descrição</div>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTransacao()}
              placeholder="Ex: Aluguel campo maio"
            />
          </div>
          <div className="form-group">
            <div className="form-label">Valor (R$)</div>
            <input
              type="number"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              min="0"
              step="0.01"
              style={{ width: 120 }}
            />
          </div>
          <div className="form-group">
            <div className="form-label">Tipo</div>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ width: 120 }}>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
          <div className="form-group">
            <div className="form-label">Categoria</div>
            <select value={cat} onChange={e => setCat(e.target.value)} style={{ width: 150 }}>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <div className="form-label">Data</div>
            <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ width: 150 }} />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <div className="form-label">&nbsp;</div>
            <button className="btn btn-primary" onClick={addTransacao} disabled={saving}>
              {saving ? '...' : '+ Lançar'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Extrato</div>
        <div className="filter-row">
          {['todos', 'receita', 'despesa'].map(f => (
            <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'todos' ? 'Todos' : f === 'receita' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>

        {loading
          ? <div className="loading">Carregando...</div>
          : filtered.length === 0
            ? <div className="empty">Nenhum lançamento</div>
            : <div className="list">
              {filtered.map(t => (
                <div className="list-item" key={t.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{t.descricao}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{t.categoria} · {fmtDate(t.data)}</div>
                  </div>
                  <span className={`badge ${t.tipo}`}>
                    {t.tipo === 'receita' ? 'Receita' : 'Despesa'}
                  </span>
                  <span style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: t.tipo === 'receita' ? 'var(--green)' : 'var(--red)',
                    minWidth: 90,
                    textAlign: 'right'
                  }}>
                    {t.tipo === 'receita' ? '+' : '−'}R$ {Number(t.valor).toFixed(2)}
                  </span>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteTransacao(t.id)}>✕</button>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}
