import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const MESES = [
  ['2026-01','Jan/26'],['2026-02','Fev/26'],['2026-03','Mar/26'],['2026-04','Abr/26'],
  ['2026-05','Mai/26'],['2026-06','Jun/26'],['2026-07','Jul/26'],['2026-08','Ago/26'],
  ['2026-09','Set/26'],['2026-10','Out/26'],['2026-11','Nov/26'],['2026-12','Dez/26'],
]

function mesLabel(mes) {
  return MESES.find(m => m[0] === mes)?.[1] || mes
}

function getStatus(mes) {
  const [y, m] = mes.split('-').map(Number)
  const venc = new Date(y, m - 1, 10)
  return new Date() > venc ? 'atrasado' : 'pendente'
}

export default function Mensalidades() {
  const [mensalidades, setMensalidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [valor, setValor] = useState('50')
  const [mes, setMes] = useState('2026-03')
  const [filter, setFilter] = useState('todos')
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadMensalidades() }, [])

  async function loadMensalidades() {
    setLoading(true)
    const { data, error } = await supabase
      .from('mensalidades')
      .select('*, jogadores(nome)')
      .order('mes', { ascending: false })
    if (error) setError('Erro ao carregar: ' + error.message)
    else setMensalidades(data || [])
    setLoading(false)
  }

  async function gerarMensalidades() {
    const v = parseFloat(valor)
    if (!v || v <= 0) { setError('Digite um valor válido.'); return }
    setGenerating(true); setError('')

    const { data: jogadores } = await supabase
      .from('jogadores')
      .select('id, nome')
      .eq('ativo', true)

    if (!jogadores?.length) { setError('Nenhum jogador ativo.'); setGenerating(false); return }

    const status = getStatus(mes)
    const inserts = jogadores.map(j => ({
      jogador_id: j.id,
      mes,
      valor: v,
      status,
    }))

    // upsert — ignora duplicatas (unique constraint jogador_id+mes)
    const { error } = await supabase
      .from('mensalidades')
      .upsert(inserts, { onConflict: 'jogador_id,mes', ignoreDuplicates: true })

    if (error) setError('Erro ao gerar: ' + error.message)
    setGenerating(false)
    loadMensalidades()
  }

  async function marcarPago(id, valorMen, nomejogador, mesMen) {
    const hoje = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('mensalidades')
      .update({ status: 'pago', data_pagamento: hoje })
      .eq('id', id)

    if (error) { setError('Erro: ' + error.message); return }

    // lança receita automaticamente
    await supabase.from('transacoes').insert({
      descricao: `Mensalidade ${nomejogador} (${mesLabel(mesMen)})`,
      valor: valorMen,
      tipo: 'receita',
      categoria: 'Mensalidade',
      data: hoje,
      mensalidade_id: id,
    })

    loadMensalidades()
  }

  async function deletarMensalidade(id) {
    await supabase.from('mensalidades').delete().eq('id', id)
    setMensalidades(m => m.filter(x => x.id !== id))
  }

  const filtered = filter === 'todos' ? mensalidades : mensalidades.filter(m => m.status === filter)
  const pagos = mensalidades.filter(m => m.status === 'pago')
  const pendentes = mensalidades.filter(m => m.status === 'pendente')
  const atrasados = mensalidades.filter(m => m.status === 'atrasado')
  const totalRecebido = pagos.reduce((s, m) => s + Number(m.valor), 0)
  const totalPendente = [...pendentes, ...atrasados].reduce((s, m) => s + Number(m.valor), 0)

  return (
    <div>
      <div className="page-title">Mensalidades</div>
      <div className="page-sub">Gere e acompanhe as cobranças dos jogadores</div>

      <div className="metrics">
        <div className="metric">
          <div className="metric-label">Recebido</div>
          <div className="metric-value green">R$ {totalRecebido.toFixed(2)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">A receber</div>
          <div className="metric-value blue">R$ {totalPendente.toFixed(2)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Atrasados</div>
          <div className="metric-value red">{atrasados.length} jogadores</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="card-title">Gerar cobranças</div>
        <div className="form-row">
          <div className="form-group">
            <div className="form-label">Valor (R$)</div>
            <input
              type="number"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="Ex: 50"
              min="0"
              step="0.01"
              style={{ width: 130 }}
            />
          </div>
          <div className="form-group">
            <div className="form-label">Mês de referência</div>
            <select value={mes} onChange={e => setMes(e.target.value)} style={{ width: 140 }}>
              {MESES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <div className="form-label">&nbsp;</div>
            <button className="btn btn-primary" onClick={gerarMensalidades} disabled={generating}>
              {generating ? '...' : '⚡ Gerar para todos'}
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)' }}>
          Gera uma cobrança para cada jogador ativo. Jogadores com cobrança do mesmo mês já existente são ignorados.
        </div>
      </div>

      <div className="card">
        <div className="card-title">Situação</div>
        <div className="filter-row">
          {['todos', 'pendente', 'pago', 'atrasado'].map(f => (
            <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'todos' && <span style={{ marginLeft: 5, opacity: .7 }}>
                ({f === 'pendente' ? pendentes.length : f === 'pago' ? pagos.length : atrasados.length})
              </span>}
            </button>
          ))}
        </div>

        {loading
          ? <div className="loading">Carregando...</div>
          : filtered.length === 0
            ? <div className="empty">Nenhum resultado</div>
            : <div className="list">
              {filtered.map(m => (
                <div className="list-item" key={m.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{m.jogadores?.nome || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{mesLabel(m.mes)} · R$ {Number(m.valor).toFixed(2)}</div>
                  </div>
                  <span className={`badge ${m.status}`}>{m.status.charAt(0).toUpperCase() + m.status.slice(1)}</span>
                  {m.status !== 'pago'
                    ? <button className="btn btn-sm btn-primary" onClick={() => marcarPago(m.id, m.valor, m.jogadores?.nome, m.mes)}>
                        ✓ Pago
                      </button>
                    : <span style={{ fontSize: 12, color: 'var(--text2)' }}>{m.data_pagamento || ''}</span>
                  }
                  <button className="btn btn-sm btn-danger" onClick={() => deletarMensalidade(m.id)}>✕</button>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}
