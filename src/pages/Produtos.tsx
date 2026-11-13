import { useMemo, useState } from 'react'
import type { Dados } from '../App'
import { MARKUPS, brl, calcularProduto, custoIngrediente, num, pct, somaPct } from '../lib/calc'
import { db } from '../lib/db'
import type { Ingrediente, Produto, Unidade } from '../lib/types'
import { Campo, Dinheiro } from '../components/Layout'

const UNIDADES: Unidade[] = ['g', 'kg', 'ml', 'L', 'un']
const PORCOES = ['fatias', 'unidades', 'pedaços', 'potes', 'porções']
const SINGULAR: Record<string, string> = { fatias: 'fatia', unidades: 'unidade', pedaços: 'pedaço', potes: 'pote', porções: 'porção' }
export const singular = (t: string) => SINGULAR[t] ?? t
const EMOJIS = ['🍰', '🧁', '🍫', '🥐', '🍕', '🥧', '🍪', '🍮', '🥪', '🍔', '🥟', '🍩']
export const emojiDe = (nome: string) => EMOJIS[[...nome].reduce((s, c) => s + c.charCodeAt(0), 0) % EMOJIS.length]

const novoIngrediente = (): Ingrediente => ({
  nome: '', preco_pacote: 0, qtd_pacote: 1, unidade_pacote: 'kg', qtd_usada: 0, unidade_usada: 'g',
})

export default function Produtos(d: Dados) {
  const [editando, setEditando] = useState<Produto | 'novo' | null>(null)

  if (editando)
    return <FormProduto d={d} inicial={editando === 'novo' ? null : editando} fechar={() => setEditando(null)} />

  return (
    <>
      <div className="titulo-secao">
        <div>
          <h2>Meus produtos</h2>
          <p className="sub">Toque em um produto para ver ou mudar o preço.</p>
        </div>
      </div>
      <button className="botao" onClick={() => setEditando('novo')}>＋ Cadastrar produto</button>
      <div className="cartao">
        {d.produtos.length === 0 ? (
          <div className="vazio">
            <span className="grande">🍰</span>
            Nenhum produto ainda.<br />Cadastre o primeiro e descubra o preço certo!
          </div>
        ) : (
          d.produtos.map((p) => {
            const c = calcularProduto(p, d.negocio)
            return (
              <div className="linha-lista" key={p.id} onClick={() => setEditando(p)} style={{ cursor: 'pointer' }}>
                <div className="avatar">{emojiDe(p.nome)}</div>
                <div className="info">
                  <b>{p.nome}</b>
                  <small>
                    {p.rendimento} {p.tipo_porcao} · {brl(c.precoPorcao)} cada
                  </small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="valor">{brl(c.precoInteiro)}</div>
                  <small style={{ color: 'var(--manjericao)', fontWeight: 700, fontSize: 12 }}>lucro {brl(c.lucroInteiro)}</small>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

function FormProduto({ d, inicial, fechar }: { d: Dados; inicial: Produto | null; fechar: () => void }) {
  const [p, setP] = useState<Omit<Produto, 'id'> & { id?: string }>(
    inicial ?? {
      nome: '', rendimento: 1, tipo_porcao: 'fatias', markup: d.negocio.markup_padrao || 2.5, embalagem_unit: 0,
      ingredientes: [novoIngrediente()],
    },
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const c = useMemo(() => calcularProduto(p, d.negocio), [p, d.negocio])
  const personalizado = !MARKUPS.some((m) => m.valor === p.markup)

  const mudarIng = (i: number, campo: Partial<Ingrediente>) =>
    setP({ ...p, ingredientes: p.ingredientes.map((x, j) => (j === i ? { ...x, ...campo } : x)) })

  function escolherInsumo(i: number, nome: string) {
    const ins = d.insumos.find((x) => x.nome.toLowerCase() === nome.toLowerCase())
    if (!ins) return mudarIng(i, { nome })
    const usada: Unidade = ins.unidade === 'kg' ? 'g' : ins.unidade === 'L' ? 'ml' : ins.unidade
    mudarIng(i, { nome: ins.nome, preco_pacote: ins.preco, qtd_pacote: ins.quantidade, unidade_pacote: ins.unidade, unidade_usada: usada })
  }

  async function salvar() {
    if (!p.nome.trim()) return setErro('Dê um nome ao produto.')
    setSalvando(true)
    try {
      await db.produtos.salvar({ ...p, ingredientes: p.ingredientes.filter((i) => i.nome.trim()) })
      await d.recarregar()
      d.avisar('Produto salvo!')
      fechar()
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  return (
    <>
      <div className="titulo-secao">
        <button className="link" onClick={fechar}>← Voltar</button>
        {inicial && (
          <button
            className="link"
            onClick={async () => {
              if (!confirm('Apagar este produto?')) return
              await db.produtos.remover(inicial.id)
              await d.recarregar()
              fechar()
            }}
          >Apagar</button>
        )}
      </div>

      <div className="cartao pilha">
        <span className="faixa">Passo 1</span>
        <h2>🍰 Qual é o produto?</h2>
        <Campo rotulo="Nome">
          <input className="entrada" placeholder="Ex.: Bolo de cenoura com chocolate" value={p.nome} onChange={(e) => setP({ ...p, nome: e.target.value })} />
        </Campo>
        <Campo rotulo="Essa receita rende quantas…">
          <div className="grade2">
            <input className="entrada" type="number" inputMode="numeric" min="1" value={p.rendimento || ''} onChange={(e) => setP({ ...p, rendimento: Math.max(0, Math.round(num(e.target.value))) })} />
            <select className="entrada" value={p.tipo_porcao} onChange={(e) => setP({ ...p, tipo_porcao: e.target.value })}>
              {PORCOES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
        </Campo>
      </div>

      <div className="cartao pilha">
        <span className="faixa">Passo 2</span>
        <h2>🥚 Ingredientes da receita</h2>
        <p className="sub" style={{ marginTop: -6 }}>Coloque quanto você pagou no pacote e quanto usou. O app faz a conta.</p>
        <datalist id="insumos">
          {d.insumos.map((i) => <option key={i.id} value={i.nome} />)}
        </datalist>
        {p.ingredientes.map((ing, i) => (
          <div key={i} className="pilha" style={{ padding: 12, borderRadius: 14, background: 'var(--creme)', border: '1.5px solid var(--linha)' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="entrada" list="insumos" placeholder="Ingrediente (ex.: Farinha)" value={ing.nome} onChange={(e) => escolherInsumo(i, e.target.value)} />
              <button className="icone-btn" aria-label="Remover" onClick={() => setP({ ...p, ingredientes: p.ingredientes.filter((_, j) => j !== i) })}>✕</button>
            </div>
            <div className="grade3">
              <Campo rotulo="Paguei">
                <Dinheiro valor={ing.preco_pacote || ''} onChange={(v) => mudarIng(i, { preco_pacote: num(v) })} />
              </Campo>
              <Campo rotulo="No pacote">
                <input className="entrada" type="number" inputMode="decimal" value={ing.qtd_pacote || ''} onChange={(e) => mudarIng(i, { qtd_pacote: num(e.target.value) })} />
              </Campo>
              <Campo rotulo="Medida">
                <select className="entrada" value={ing.unidade_pacote} onChange={(e) => mudarIng(i, { unidade_pacote: e.target.value as Unidade })}>
                  {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                </select>
              </Campo>
            </div>
            <div className="grade3" style={{ alignItems: 'end' }}>
              <Campo rotulo="Usei">
                <input className="entrada" type="number" inputMode="decimal" value={ing.qtd_usada || ''} onChange={(e) => mudarIng(i, { qtd_usada: num(e.target.value) })} />
              </Campo>
              <Campo rotulo="Medida">
                <select className="entrada" value={ing.unidade_usada} onChange={(e) => mudarIng(i, { unidade_usada: e.target.value as Unidade })}>
                  {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                </select>
              </Campo>
              <div style={{ textAlign: 'right', paddingBottom: 12 }}>
                <small style={{ color: 'var(--suave)', fontSize: 12 }}>Custou</small>
                <div style={{ fontWeight: 800 }}>{brl(custoIngrediente(ing))}</div>
              </div>
            </div>
          </div>
        ))}
        <button className="botao claro pequeno" style={{ justifySelf: 'start' }} onClick={() => setP({ ...p, ingredientes: [...p.ingredientes, novoIngrediente()] })}>
          ＋ Adicionar ingrediente
        </button>
        <Campo rotulo="Embalagem por unidade (opcional)" dica="Ex.: a caixinha ou o saquinho de cada fatia. Os outros gastos com embalagem já estão na porcentagem.">
          <Dinheiro valor={p.embalagem_unit || ''} onChange={(v) => setP({ ...p, embalagem_unit: num(v) })} />
        </Campo>
      </div>

      <div className="cartao pilha">
        <span className="faixa">Passo 3</span>
        <h2>📈 Escolha o seu markup</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          Markup é quantas vezes o preço de venda é maior que o seu custo. Ex.: 2,5× = custo de R$ 10 vira preço de R$ 25.
        </p>
        <div className="opcoes-markup">
          {MARKUPS.map((m) => (
            <button key={m.valor} className={'op-markup' + (p.markup === m.valor ? ' ativo' : '')} onClick={() => setP({ ...p, markup: m.valor })}>
              {m.recomendado && <span className="faixa verde selo">Recomendado</span>}
              <span className="x">{m.emoji} {m.valor.toLocaleString('pt-BR')}×</span>
              <b>{m.nome}</b>
              <small>{m.desc}</small>
            </button>
          ))}
        </div>
        <Campo rotulo={`Ou escolha outro: ${p.markup.toLocaleString('pt-BR')}×${personalizado ? ' (personalizado)' : ''}`}>
          <input type="range" min={1.2} max={5} step={0.1} value={p.markup} onChange={(e) => setP({ ...p, markup: Number(e.target.value) })} style={{ accentColor: 'var(--tomate)' }} />
        </Campo>
      </div>

      <div className="cartao mostarda pilha">
        <span className="faixa verde">Resultado</span>
        <h2>🏷️ Preço de venda sugerido</h2>
        <div className="etiquetas">
          <div className="etiqueta">
            <small>Inteiro</small>
            <strong>{brl(c.precoInteiro)}</strong>
            <em>lucro {brl(c.lucroInteiro)}</em>
          </div>
          <div className="etiqueta">
            <small>Por {singular(p.tipo_porcao)}</small>
            <strong>{brl(c.precoPorcao)}</strong>
            <em>lucro {brl(c.lucroPorcao)}</em>
          </div>
        </div>
        <table className="tabela-custo">
          <tbody>
            <tr><td>🥚 Ingredientes</td><td>{brl(c.ingredientes)}</td></tr>
            <tr><td>👩‍🍳 Mão de obra, gás, luz, água e embalagens ({somaPct(d.negocio)}%)</td><td>{brl(c.extras)}</td></tr>
            {c.embalagemExtra > 0 && <tr><td>📦 Embalagens individuais</td><td>{brl(c.embalagemExtra)}</td></tr>}
            <tr className="total"><td>Custo total</td><td>{brl(c.custoTotal)}</td></tr>
            <tr><td>Custo de cada {singular(p.tipo_porcao)}</td><td>{brl(c.custoPorcao)}</td></tr>
            <tr><td>Sua margem de lucro</td><td style={{ color: 'var(--manjericao)' }}>{pct(c.margem)}</td></tr>
          </tbody>
        </table>
        <p className="sub" style={{ fontSize: 12 }}>Os preços foram arredondados para cima, para facilitar o troco.</p>
      </div>

      {erro && <div className="aviso erro">{erro}</div>}
      <button className="botao verde" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar produto'}</button>
    </>
  )
}
