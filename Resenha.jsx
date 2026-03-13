import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'
import html2canvas from 'html2canvas'

function fmtDate(d) {
  if (!d) return ''
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

export default function Resenha() {
  const [jogadores, setJogadores] = useState([])
  const [resenhas, setResenhas] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [convidados, setConvidados] = useState([])
  const [novoConvidado, setNovoConvidado] = useState('')
  
  const [comprador, setComprador] = useState('')
  const [valor, setValor] = useState('')
  const [pix, setPix] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: jData } = await supabase.from('jogadores').select('*').eq('ativo', true).order('nome')
    if (jData) setJogadores(jData)
    
    const { data: rData, error: rErr } = await supabase.from('resenhas').select('*').order('created_at', { ascending: false })
    if (rErr) {
       if (rErr.message.includes("does not exist")) {
         setError("Tabela 'resenhas' não encontrada. Execute as atualizações no banco de dados!")
       } else {
         setError("Erro ao carregar: " + rErr.message)
       }
    } else {
      setResenhas(rData || [])
    }
    setLoading(false)
  }

  function togglePlayer(id) {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  function adicionarConvidado() {
    const n = novoConvidado.trim()
    if (!n) return
    const newId = 'convidado-' + Date.now()
    setConvidados(prev => [...prev, { id: newId, nome: n }])
    setSelectedIds(prev => new Set(prev).add(newId))
    setNovoConvidado('')
  }

  async function salvarResenha() {
    const v = parseFloat(valor)
    if (!comprador.trim() || !v || v <= 0 || selectedIds.size === 0) {
      setError('Preencha os dados e selecione pelo menos 1 participante.'); return
    }
    setSaving(true); setError('')
    
    const div = v / selectedIds.size
    
    const todosLista = [...jogadores, ...convidados]
    const participantes = todosLista
      .filter(j => selectedIds.has(j.id))
      .map(j => ({ id: j.id, nome: j.nome, pago: false, valor: div }))
      
    const { error: err } = await supabase.from('resenhas').insert({
      comprador: comprador.trim(),
      valor: v,
      pix: pix.trim() || null,
      data: new Date().toISOString().split('T')[0],
      participantes
    })
    
    setSaving(false)
    if (err) { setError("Erro ao salvar: " + err.message); return }
    
    setComprador(''); setValor(''); setPix(''); setSelectedIds(new Set()); setConvidados([])
    loadData()
  }

  function shareImage(rId) {
    const el = document.getElementById(`resenha-card-${rId}`)
    const header = document.getElementById(`share-header-${rId}`)
    if (!el) return
    if (header) header.style.display = 'flex'
    
    const theme = document.body.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff'
    
    html2canvas(el, { backgroundColor: theme }).then(canvas => {
      if (header) header.style.display = 'none'
      canvas.toBlob(blob => {
        if (!blob) return
        const file = new File([blob], 'rateio.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare({ files: [file] })) {
          navigator.share({ title: 'Rateio Resenha', files: [file] }).catch(err => console.error("Erro ao compartilhar", err))
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'rateio.png'
          a.click()
        }
      })
    }).catch(err => {
      console.error(err)
      if (header) header.style.display = 'none'
    })
  }

  async function togglePago(r, pIndex) {
    const nparts = [...r.participantes]
    nparts[pIndex].pago = !nparts[pIndex].pago
    
    await supabase.from('resenhas').update({ participantes: nparts }).eq('id', r.id)
    setResenhas(prev => prev.map(x => x.id === r.id ? { ...x, participantes: nparts } : x))
  }
  
  async function excluirResenha(id) {
    if (!window.confirm("Excluir esta resenha?")) return
    await supabase.from('resenhas').delete().eq('id', id)
    setResenhas(prev => prev.filter(x => x.id !== id))
  }

  return (
     <div className="fade-in">
       <div className="page-title">Rateio da Resenha 🍻</div>
       <div className="page-sub">Divida os gastos do pós-jogo entre a galera</div>

       {error && <div className="error-banner">{error}</div>}

       <div className="card">
         <div className="card-title">Nova Resenha</div>
         <div className="form-row">
           <div className="form-group" style={{ flex: 1.5, minWidth: 120 }}>
             <div className="form-label">Quem comprou?</div>
             <input list="lista-compradores" value={comprador} onChange={e => setComprador(e.target.value)} placeholder="Ex: Thiago" />
             <datalist id="lista-compradores">
               {jogadores.map(j => <option key={j.id} value={j.nome} />)}
             </datalist>
           </div>
           <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
             <div className="form-label">Valor Total (R$)</div>
             <input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" step="0.01" />
           </div>
           <div className="form-group" style={{ flex: 1.5, minWidth: 120 }}>
             <div className="form-label">Chave PIX</div>
             <input value={pix} onChange={e => setPix(e.target.value)} placeholder="(Opcional)" />
           </div>
         </div>
         
         <div style={{ marginTop: 16 }}>
           <div className="form-label" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
             <span>Participantes ({selectedIds.size})</span>
             <div style={{ display: 'flex', gap: 6 }}>
               <button className="btn btn-sm btn-secondary" onClick={() => setSelectedIds(new Set(jogadores.map(j => j.id)))}>Todos</button>
               <button className="btn btn-sm btn-secondary" onClick={() => setSelectedIds(new Set())}>Nenhum</button>
             </div>
           </div>
           <div className="grid-list" style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
              {[...jogadores, ...convidados].map(p => {
                const isSelected = selectedIds.has(p.id)
                return (
                  <div key={p.id} className={`selectable-item ${isSelected ? 'selected' : ''}`} onClick={() => togglePlayer(p.id)} style={{ padding: '6px 10px' }}>
                    <div className="checkbox" style={{ width: 18, height: 18, borderWidth: 1 }}>
                      {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.nome} {String(p.id).startsWith('convidado') && <span style={{fontSize: 10, background: 'var(--amber)', color: '#000', padding: '1px 4px', borderRadius: 4, marginLeft: 6}}>Extra</span>}
                    </div>
                  </div>
                )
              })}
           </div>
           
           <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
             <input value={novoConvidado} onChange={e => setNovoConvidado(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionarConvidado()} placeholder="Add convidado extra" style={{ flex: 1 }} />
             <button className="btn btn-secondary" onClick={adicionarConvidado}>+ Adicionar</button>
           </div>
         </div>

         <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
           <button className="btn btn-primary" onClick={salvarResenha} disabled={saving || loading}>
             {saving ? '...' : 'Salvar e Dividir'}
           </button>
         </div>
       </div>

       <div className="card">
         <div className="card-title">Resenhas Salvas</div>
         {loading ? <div className="loading">Carregando...</div> : 
          resenhas.length === 0 ? <div className="empty">Nenhuma resenha registrada.</div> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {resenhas.map(r => {
              const arv = r.participantes.filter(p => p.pago).length
              const totalArrecadado = r.participantes.filter(p => p.pago).reduce((acc, p) => acc + (p.valor || 0), 0)
              
              return (
              <div key={r.id} id={`resenha-card-${r.id}`} style={{ background: 'var(--card)', padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div id={`share-header-${r.id}`} style={{ display: 'none', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
                  <img src="/logo.png" alt="Motivos para Beber" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                  <span style={{ fontSize: 20, fontWeight: 'bold' }}>Motivos para Beber 🍻</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Comprador: {r.comprador}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                      Total: <b>R$ {Number(r.valor).toFixed(2)}</b> · Data: {fmtDate(r.data)}
                    </div>
                    {r.pix && <div style={{ fontSize: 12, color: 'var(--blue)', marginTop: 4, background: 'var(--blue-light)', display: 'inline-block', padding: '2px 8px', borderRadius: 4 }}>PIX: {r.pix}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }} data-html2canvas-ignore>
                    <button className="btn btn-sm btn-secondary" onClick={() => shareImage(r.id)} style={{ background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }}>
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => excluirResenha(r.id)}>✕</button>
                  </div>
                </div>
                
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>
                  <span style={{ color: arv === r.participantes.length ? 'var(--green)' : 'var(--amber)' }}>
                    Recebido R$ {totalArrecadado.toFixed(2)} de R$ {Number(r.valor).toFixed(2)}
                  </span>
                  <span style={{ fontWeight: 400, marginLeft: 6 }}>({arv}/{r.participantes.length} pagaram)</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 }}>
                  {r.participantes.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => togglePago(r, i)}
                      style={{
                        padding: '6px 10px',
                        background: p.pago ? 'var(--green-light)' : 'var(--card)',
                        border: '1px solid',
                        borderColor: p.pago ? 'var(--green)' : 'var(--border)',
                        borderRadius: 6,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: p.pago ? 'var(--green)' : 'var(--text)' }}>
                        {p.nome}
                      </div>
                      <div style={{ fontSize: 11, color: p.pago ? 'var(--green)' : 'var(--text2)' }}>
                        R$ {Number(p.valor).toFixed(2)} {p.pago ? '✓' : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )})}
          </div>
         }
       </div>
     </div>
  )
}
