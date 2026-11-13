import { useMemo, useRef, useState } from 'react'
import type { Dados } from '../App'
import { brl, hoje, num } from '../lib/calc'
import { db } from '../lib/db'
import { lerCupom } from '../lib/ocr'
import type { Compra, ItemCupom, Unidade } from '../lib/types'
import { Campo, Dinheiro } from '../components/Layout'

const UNIDADES: Unidade[] = ['g', 'kg', 'ml', 'L', 'un']
type Linha = ItemCupom & { marcado: boolean }
const itemVazio = (): Linha => ({ nome: '', quantidade: 1, unidade: 'un', preco: 0, marcado: true })

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const dataBR = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export default function Compras(d: Dados) {
  const entrada = useRef<HTMLInputElement>(null)
  const [editando, setEditando] = useState(false)
  const [foto, setFoto] = useState('')
  const [status, setStatus] = useState('')
  const [aviso, setAviso] = useState('')
  const [textoLido, setTextoLido] = useState('')
  const [itens, setItens] = useState<Linha[]>([])
  const [data, setData] = useState(hoje())
  const [local, setLocal] = useState('')
  const [atualizarPrecos, setAtualizarPrecos] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mes, setMes] = useState(hoje().slice(0, 7))
  const [aberta, setAberta] = useState<string | null>(null)

  function limpar() {
    setEditando(false)
    setFoto('')
    setItens([])
    setAviso('')
    setTextoLido('')
    setLocal('')
    setData(hoje())
  }

  async function escolherFoto(arq?: File) {
    if (!arq) return
    limpar()
    setEditando(true)
    setFoto(URL.createObjectURL(arq))
    try {
      const r = await lerCupom(arq, setStatus)
      setTextoLido(r.texto)
      if (r.data) setData(r.data)
      if (r.local) setLocal(r.local)
      if (r.itens.length) setItens(r.itens.map((i) => ({ ...i, marcado: true })))
      else {
        setAviso('Não consegui identificar os produtos nessa foto. Tente outra foto (veja as dicas abaixo) ou digite os itens.')
        setItens([itemVazio()])
      }
    } catch (e) {
      setAviso('Erro ao ler a foto: ' + (e as Error).message)
      setItens([itemVazio()])
    } finally {
      setStatus('')
      if (entrada.current) entrada.current.value = ''
    }
  }

  function lancarManual() {
    limpar()
    setEditando(true)
    setItens([itemVazio()])
  }

  const mudar = (i: number, c: Partial<Linha>) => setItens(itens.map((x, j) => (j === i ? { ...x, ...c } : x)))
  const selecionados = itens.filter((i) => i.marcado && i.nome.trim() && i.preco > 0)
  const total = selecionados.reduce((s, i) => s + i.preco, 0)

  async function salvar() {
    if (!selecionados.length) return setAviso('Coloque pelo menos um item com nome e valor.')
    setSalvando(true)
    try {
      const lista = selecionados.map(({ nome, quantidade, unidade, preco }) => ({ nome: nome.trim(), quantidade, unidade, preco }))
      await db.compras.salvar({ data, local: local.trim(), total: Math.round(total * 100) / 100, itens: lista })
      if (atualizarPrecos) await db.insumos.atualizarPrecos(lista, d.insumos)
      await d.recarregar()
      d.avisar(`Compra de ${brl(total)} registrada`)
      setMes(data.slice(0, 7))
      limpar()
    } catch (e) {
      setAviso((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  // ---------- histórico ----------
  const doMes = useMemo(() => d.compras.filter((c) => c.data.startsWith(mes)), [d.compras, mes])
  const totalMes = doMes.reduce((s, c) => s + Number(c.total), 0)
  const totalHoje = d.compras.filter((c) => c.data === hoje()).reduce((s, c) => s + Number(c.total), 0)
  const porDia = useMemo(() => {
    const m = new Map<string, Compra[]>()
    for (const c of [...doMes].sort((a, b) => b.data.localeCompare(a.data))) m.set(c.data, [...(m.get(c.data) ?? []), c])
    return [...m.entries()]
  }, [doMes])
  const [ano, mesNum] = mes.split('-').map(Number)
  const andarMes = (delta: number) => {
    const dt = new Date(ano, mesNum - 1 + delta, 1)
    setMes(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <>
      <div className="titulo-secao">
        <div>
          <h2>Compras</h2>
          <p className="sub">Registre o que você comprou para saber quanto gastou no dia e no mês.</p>
        </div>
      </div>

      <div className="kpis">
        <div className="cartao tomate kpi"><span className="ic">🧾</span><small>Gasto hoje</small><strong>{brl(totalHoje)}</strong></div>
        <div className="cartao mostarda kpi"><span className="ic">📅</span><small>Gasto em {MESES[mesNum - 1].toLowerCase()}</small><strong>{brl(totalMes)}</strong></div>
      </div>

      <input ref={entrada} type="file" accept="image/*" capture="environment" hidden onChange={(e) => escolherFoto(e.target.files?.[0])} />

      {!editando ? (
        <>
          <div className="area-foto" onClick={() => entrada.current?.click()}>
            <span className="grande">📸</span>
            <b style={{ fontSize: 15 }}>Tirar foto da nota</b>
            <span className="sub" style={{ marginTop: 0 }}>cupom fiscal, recibo ou papel escrito</span>
          </div>
          <button className="botao claro" onClick={lancarManual}>✍️ Lançar compra sem foto</button>
        </>
      ) : (
        <div className="cartao pilha">
          <div className="titulo-secao">
            <h2 style={{ margin: 0 }}>{foto ? '✅ Confira a compra' : '✍️ Nova compra'}</h2>
            <button className="link" onClick={limpar}>Cancelar</button>
          </div>
          {foto && <img className="previa" src={foto} alt="Foto da nota" />}
          {status && <div className="carregando"><div className="giro" /> {status}</div>}

          {!status && (
            <>
              {aviso && <div className="aviso erro">{aviso}</div>}
              <div className="grade2">
                <Campo rotulo="Data da compra">
                  <input className="entrada" type="date" value={data} onChange={(e) => setData(e.target.value)} />
                </Campo>
                <Campo rotulo="Onde comprou">
                  <input className="entrada" placeholder="Ex.: Atacadão" value={local} onChange={(e) => setLocal(e.target.value)} />
                </Campo>
              </div>

              <div>
                {itens.map((it, i) => (
                  <div className="item-lido" key={i}>
                    <input type="checkbox" checked={it.marcado} onChange={(e) => mudar(i, { marcado: e.target.checked })} aria-label="Incluir item" />
                    <div className="pilha" style={{ gap: 8, opacity: it.marcado ? 1 : 0.45 }}>
                      <input className="entrada" placeholder="Produto (ex.: Farinha de trigo)" value={it.nome} onChange={(e) => mudar(i, { nome: e.target.value })} />
                      <div className="grade3">
                        <Dinheiro valor={it.preco || ''} onChange={(v) => mudar(i, { preco: num(v) })} />
                        <input className="entrada" type="number" inputMode="decimal" aria-label="Quantidade" value={it.quantidade || ''} onChange={(e) => mudar(i, { quantidade: num(e.target.value) })} />
                        <select className="entrada" aria-label="Medida" value={it.unidade} onChange={(e) => mudar(i, { unidade: e.target.value as Unidade })}>
                          {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="botao claro pequeno" style={{ marginTop: 14 }} onClick={() => setItens([...itens, itemVazio()])}>＋ Adicionar item</button>
              </div>

              <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12.5 }}>
                <input type="checkbox" checked={atualizarPrecos} onChange={(e) => setAtualizarPrecos(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--manjericao)' }} />
                Atualizar os preços dos meus ingredientes com esta compra
              </label>

              <div className="aviso" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{selecionados.length} {selecionados.length === 1 ? 'item' : 'itens'}</span>
                <b>Total: {brl(total)}</b>
              </div>
              <button className="botao verde" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar compra'}</button>

              {textoLido && (
                <details>
                  <summary className="sub" style={{ cursor: 'pointer' }}>Ver o texto que o app conseguiu ler da foto</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, background: 'var(--creme)', padding: 12, borderRadius: 10, maxHeight: 240, overflow: 'auto' }}>{textoLido}</pre>
                </details>
              )}
            </>
          )}
        </div>
      )}

      <div className="cartao">
        <div className="titulo-secao" style={{ marginBottom: 6 }}>
          <button className="botao claro pequeno" onClick={() => andarMes(-1)} aria-label="Mês anterior">◀</button>
          <div style={{ textAlign: 'center' }}>
            <b style={{ fontSize: 14 }}>{MESES[mesNum - 1]} {ano}</b>
            <div className="sub" style={{ marginTop: 0 }}>Total gasto: <b style={{ color: 'var(--tomate-esc)' }}>{brl(totalMes)}</b></div>
          </div>
          <button className="botao claro pequeno" onClick={() => andarMes(1)} aria-label="Próximo mês">▶</button>
        </div>
        {porDia.length === 0 ? (
          <div className="vazio"><span className="grande">🧺</span>Nenhuma compra registrada neste mês.</div>
        ) : (
          porDia.map(([dia, compras]) => (
            <div key={dia} style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--suave)', textTransform: 'capitalize', borderBottom: '2px solid var(--linha)', paddingBottom: 6 }}>
                <span>{dataBR(dia)}</span>
                <span>{brl(compras.reduce((s, c) => s + Number(c.total), 0))}</span>
              </div>
              {compras.map((c) => (
                <div key={c.id}>
                  <div className="linha-lista" style={{ cursor: 'pointer' }} onClick={() => setAberta(aberta === c.id ? null : c.id)}>
                    <div className="avatar">🧾</div>
                    <div className="info">
                      <b>{c.local || 'Compra'}</b>
                      <small>{c.itens.length} {c.itens.length === 1 ? 'item' : 'itens'} · toque para ver</small>
                    </div>
                    <span className="valor">{brl(Number(c.total))}</span>
                  </div>
                  {aberta === c.id && (
                    <div style={{ background: 'var(--creme)', borderRadius: 12, padding: '8px 14px', marginBottom: 8 }}>
                      {c.itens.map((it, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 0', borderBottom: '1px dashed var(--linha)' }}>
                          <span>{it.nome} <small style={{ color: 'var(--suave)' }}>({it.quantidade} {it.unidade})</small></span>
                          <b>{brl(it.preco)}</b>
                        </div>
                      ))}
                      <button
                        className="link"
                        style={{ marginTop: 6 }}
                        onClick={async () => {
                          if (!confirm('Apagar esta compra?')) return
                          await db.compras.remover(c.id)
                          await d.recarregar()
                        }}
                      >🗑️ Apagar compra</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="cartao verde">
        <h2>💡 Para a foto ser bem lida</h2>
        <p className="sub">
          • Nota esticada em cima da mesa, sem dobras.<br />
          • Lugar bem iluminado, sem sombra do celular.<br />
          • Enquadre só a parte dos produtos e chegue perto. Nota muito comprida: tire 2 fotos (metade de cima e metade de baixo).<br />
          • Confira sempre os valores antes de salvar.
        </p>
        <p className="sub" style={{ fontSize: 11.5 }}>Se a leitura vier errada, corrija os itens antes de salvar ou use “Lançar compra sem foto”.</p>
      </div>
    </>
  )
}
