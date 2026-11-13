import { useRef, useState } from 'react'
import type { Dados } from '../App'
import { brl, num } from '../lib/calc'
import { db } from '../lib/db'
import { lerCupom } from '../lib/ocr'
import { modoDemo } from '../lib/supabase'
import type { ItemCupom, Unidade } from '../lib/types'
import { Dinheiro } from '../components/Layout'

const UNIDADES: Unidade[] = ['g', 'kg', 'ml', 'L', 'un']

export default function Escanear(d: Dados) {
  const entrada = useRef<HTMLInputElement>(null)
  const [foto, setFoto] = useState('')
  const [status, setStatus] = useState('')
  const [erro, setErro] = useState('')
  const [itens, setItens] = useState<(ItemCupom & { marcado: boolean })[]>([])

  async function escolher(arq?: File) {
    if (!arq) return
    setErro('')
    setItens([])
    setFoto(URL.createObjectURL(arq))
    try {
      const lidos = await lerCupom(arq, setStatus)
      if (!lidos.length) setErro('Não encontrei produtos com preço nessa foto. Tente com mais luz e a nota bem reta.')
      setItens(lidos.map((i) => ({ ...i, marcado: true })))
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setStatus('')
    }
  }

  const mudar = (i: number, c: Partial<ItemCupom & { marcado: boolean }>) =>
    setItens(itens.map((x, j) => (j === i ? { ...x, ...c } : x)))

  async function salvar() {
    const sel = itens.filter((i) => i.marcado && i.nome.trim())
    await db.insumos.salvarVarios(sel.map(({ nome, preco, quantidade, unidade }) => ({ nome, preco, quantidade, unidade })))
    await d.recarregar()
    d.avisar(`${sel.length} ingredientes salvos`)
    setItens([])
    setFoto('')
  }

  const total = itens.filter((i) => i.marcado).reduce((s, i) => s + i.preco, 0)

  return (
    <>
      <div className="titulo-secao">
        <div>
          <h2>Ler nota ou recibo</h2>
          <p className="sub">Tire uma foto do cupom fiscal, recibo ou até de um papel escrito à mão. O app lê os produtos e preços para você.</p>
        </div>
      </div>

      <input ref={entrada} type="file" accept="image/*" capture="environment" hidden onChange={(e) => escolher(e.target.files?.[0])} />

      {!foto ? (
        <div className="area-foto" onClick={() => entrada.current?.click()}>
          <span className="grande">📸</span>
          <b style={{ fontSize: 15 }}>Tirar foto da nota</b>
          <span className="sub">ou escolher uma foto da galeria</span>
        </div>
      ) : (
        <div className="cartao pilha">
          <img className="previa" src={foto} alt="Foto da nota" />
          {status && <div className="carregando"><div className="giro" /> {status}</div>}
          {!status && <button className="botao claro pequeno" style={{ justifySelf: 'center' }} onClick={() => entrada.current?.click()}>📸 Tirar outra foto</button>}
        </div>
      )}

      {erro && <div className="aviso erro">{erro}</div>}

      {itens.length > 0 && (
        <div className="cartao">
          <h2>✅ Confira o que eu li</h2>
          <p className="sub" style={{ marginTop: -4 }}>Corrija se precisar e desmarque o que não é ingrediente.</p>
          {itens.map((it, i) => (
            <div className="item-lido" key={i}>
              <input type="checkbox" checked={it.marcado} onChange={(e) => mudar(i, { marcado: e.target.checked })} />
              <div className="pilha" style={{ gap: 8, opacity: it.marcado ? 1 : 0.45 }}>
                <input className="entrada" value={it.nome} onChange={(e) => mudar(i, { nome: e.target.value })} />
                <div className="grade3">
                  <Dinheiro valor={it.preco} onChange={(v) => mudar(i, { preco: num(v) })} />
                  <input className="entrada" type="number" inputMode="decimal" value={it.quantidade} onChange={(e) => mudar(i, { quantidade: num(e.target.value) })} />
                  <select className="entrada" value={it.unidade} onChange={(e) => mudar(i, { unidade: e.target.value as Unidade })}>
                    {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '14px 0', fontWeight: 800 }}>
            <span>Total marcado</span><span>{brl(total)}</span>
          </div>
          <button className="botao verde" onClick={salvar}>Salvar nos meus ingredientes</button>
        </div>
      )}

      <div className="cartao verde">
        <h2>💡 Dicas para uma boa leitura</h2>
        <p className="sub">
          • Coloque a nota em cima de uma mesa, bem esticada.<br />
          • Use um lugar iluminado, sem sombra.<br />
          • Depois de salvos, os ingredientes aparecem para escolher ao cadastrar um produto.
        </p>
        {modoDemo && <p className="sub" style={{ fontSize: 12 }}>No modo demonstração a leitura é feita no próprio celular e funciona melhor com notas impressas. Com o Supabase ligado, a leitura usa inteligência artificial e entende até letra de mão.</p>}
      </div>
    </>
  )
}
