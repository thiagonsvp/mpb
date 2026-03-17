import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'

const MESES = [
  ['2026-01', 'Jan/26'], ['2026-02', 'Fev/26'], ['2026-03', 'Mar/26'], ['2026-04', 'Abr/26'],
  ['2026-05', 'Mai/26'], ['2026-06', 'Jun/26'], ['2026-07', 'Jul/26'], ['2026-08', 'Ago/26'],
  ['2026-09', 'Set/26'], ['2026-10', 'Out/26'], ['2026-11', 'Nov/26'], ['2026-12', 'Dez/26'],
]

function mesLabel(mes) {
  return MESES.find(m => m[0] === mes)?.[1] || mes
}

function fmtDate(d) {
  if (!d) return ''
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

// getStatus: mensalista vence dia 07 do mês, diarista vence no dia gerado (hoje)
function getStatus(mes, tipo) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  let venc
  if (tipo === 'mensalista') {
    const [y, m] = mes.split('-').map(Number)
    venc = new Date(y, m - 1, 7) // dia 07 do mês
  } else {
    // diarista: vence hoje (no dia da geração) — ou seja, nunca está atrasado ao gerar
    venc = new Date(hoje)
  }
  return hoje > venc ? 'atrasado' : 'pendente'
}

export default function Mensalidades() {
  const [mensalidades, setMensalidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [valorMensalista, setValorMensalista] = useState('70')
  const [valorDiarista, setValorDiarista] = useState('20')
  const [mes, setMes] = useState('2026-03')
  const [filter, setFilter] = useState('todos')
  const [generating, setGenerating] = useState(false)
  const [payDateFor, setPayDateFor] = useState(null)
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => { loadMensalidades() }, [])

  async function loadMensalidades() {
    setLoading(true)
    const { data, error } = await supabase
      .from('mensalidades')
      .select('*, jogadores(nome, telefone, tipo)')
      .order('mes', { ascending: false })
    if (error) setError('Erro ao carregar: ' + error.message)
    else setMensalidades(data || [])
    setLoading(false)
  }

  async function gerarMensalidades() {
    const vM = parseFloat(valorMensalista)
    const vD = parseFloat(valorDiarista)
    if (!vM || vM <= 0 || !vD || vD <= 0) { setError('Digite valores válidos.'); return }
    setGenerating(true); setError('')

    const { data: jogadores } = await supabase
      .from('jogadores')
      .select('id, nome, tipo')
      .eq('ativo', true)

    if (!jogadores?.length) { setError('Nenhum jogador ativo.'); setGenerating(false); return }

    const presencesStr = localStorage.getItem('mpb-last-presences')
    const presences = presencesStr ? JSON.parse(presencesStr) : []

    const validos = jogadores.filter(j => 
       j.tipo === 'mensalista' || (j.tipo === 'diarista' && presences.includes(j.id))
    )
    
    if (validos.length === 0) { setError('Nenhum jogador para gerar (sem mensalistas ou diaristas sorteados).'); setGenerating(false); return }

    const inserts = validos.map(j => ({
      jogador_id: j.id,
      mes,
      valor: j.tipo === 'mensalista' ? vM : vD,
      status: getStatus(mes, j.tipo),
    }))

    const { error } = await supabase
      .from('mensalidades')
      .upsert(inserts, { onConflict: 'jogador_id,mes', ignoreDuplicates: true })

    if (error) setError('Erro ao gerar: ' + error.message)
    setGenerating(false)
    loadMensalidades()
  }

  async function marcarPago(id, valorMen, nomejogador, mesMen, tipoJogador, dataEscolhida) {
    const dataPgto = dataEscolhida || new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('mensalidades')
      .update({ status: 'pago', data_pagamento: dataPgto })
      .eq('id', id)

    if (error) { setError('Erro: ' + error.message); return }

    const isDiarista = tipoJogador === 'diarista'

    await supabase.from('transacoes').insert({
      descricao: isDiarista
        ? `Diária ${nomejogador} (${mesLabel(mesMen)})`
        : `Mensalidade ${nomejogador} (${mesLabel(mesMen)})`,
      valor: valorMen,
      tipo: 'receita',
      categoria: isDiarista ? 'Diária' : 'Mensalidade',
      data: dataPgto,
      mensalidade_id: id,
    })

    setPayDateFor(null)
    loadMensalidades()
  }

  async function deletarMensalidade(id) {
    if (!window.confirm('Tem certeza que deseja excluir esta cobrança? Esta ação não pode ser desfeita.')) return;
    await supabase.from('mensalidades').delete().eq('id', id)
    setMensalidades(m => m.filter(x => x.id !== id))
  }

  function cobrarWhatsApp(m) {
    if (!m.jogadores?.telefone) {
      alert('O telefone não está cadastrado no perfil deste jogador.')
      return
    }
    const num = m.jogadores.telefone.replace(/\D/g, '')
    const numeroFinal = num.startsWith('55') ? num : '55' + num
    const msg = `Fala ${m.jogadores.nome}, tudo certo? Só passando pra lembrar do valor de R$ ${Number(m.valor).toFixed(2).replace('.', ',')} referente a pelada (${mesLabel(m.mes)}). Faz o pix aí quando puder, a chave é: (21)98193-0313. Tmj! 🍻`
    window.open(`https://wa.me/${numeroFinal}?text=${encodeURIComponent(msg)}`, '_blank')
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
            <div className="form-label">Mensalidade (R$)</div>
            <input
              type="number"
              value={valorMensalista}
              onChange={e => setValorMensalista(e.target.value)}
              placeholder="70"
              style={{ width: 110 }}
            />
          </div>
          <div className="form-group">
            <div className="form-label">Diária (R$)</div>
            <input
              type="number"
              value={valorDiarista}
              onChange={e => setValorDiarista(e.target.value)}
              placeholder="20"
              style={{ width: 110 }}
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
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>
          Gera cobrança p/ todos mensalistas e <b>apenas p/ diaristas que participaram do último sorteio</b>.<br/>Cobranças do mesmo mês já existentes são ignoradas.
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
                    ? <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {payDateFor === m.id ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: 'var(--teal-light)', padding: '2px 6px', borderRadius: 8 }}>
                            <input 
                              type="date" 
                              value={payDate} 
                              onChange={e => setPayDate(e.target.value)} 
                              style={{ width: 120, height: 30, fontSize: 12, padding: '0 6px' }} 
                            />
                            <button className="btn btn-sm btn-primary" onClick={() => marcarPago(m.id, m.valor, m.jogadores?.nome, m.mes, m.jogadores?.tipo, payDate)}>
                              OK
                            </button>
                            <button className="btn btn-sm btn-secondary" onClick={() => setPayDateFor(null)} style={{ padding: '0 6px' }}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <button className="btn btn-sm btn-secondary" onClick={() => cobrarWhatsApp(m)} style={{ background: '#25D366', color: '#fff', borderColor: '#25D366' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                              Cobrar
                            </button>
                            <button className="btn btn-sm btn-primary" onClick={() => {
                              setPayDateFor(m.id)
                              setPayDate(new Date().toISOString().split('T')[0])
                            }}>
                              ✓ Pago
                            </button>
                          </>
                        )}
                      </div>
                    : <span style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDate(m.data_pagamento) || ''}</span>
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
