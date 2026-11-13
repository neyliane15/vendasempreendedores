import { useState } from 'react'
import type { Dados } from '../App'
import { brl, calcularProduto, hoje, num } from '../lib/calc'
import { db } from '../lib/db'
import { Campo, Dinheiro } from '../components/Layout'
import { emojiDe, singular } from './Produtos'

export default function Vendas(d: Dados) {
  const [produtoId, setProdutoId] = useState('')
  const [tipo, setTipo] = useState<'inteiro' | 'porcao'>('porcao')
  const [qtd, setQtd] = useState(1)
  const [preco, setPreco] = useState('')
  const [data, setData] = useState(hoje())
  const [salvando, setSalvando] = useState(false)

  const produto = d.produtos.find((p) => p.id === produtoId)
  const calc = produto ? calcularProduto(produto, d.negocio) : null
  const precoSug = calc ? (tipo === 'inteiro' ? calc.precoInteiro : calc.precoPorcao) : 0
  const custoUnit = calc ? (tipo === 'inteiro' ? calc.custoTotal : calc.custoPorcao) : 0
  const precoFinal = preco === '' ? precoSug : num(preco)

  async function registrar() {
    if (!produto) return
    setSalvando(true)
    await db.vendas.salvar({
      produto_id: produto.id, produto_nome: produto.nome, tipo, quantidade: qtd,
      preco_unit: precoFinal, custo_unit: custoUnit, data,
    })
    await d.recarregar()
    d.avisar(`Venda de ${brl(precoFinal * qtd)} registrada`)
    setQtd(1)
    setPreco('')
    setSalvando(false)
  }

  const doDia = d.vendas.filter((v) => v.data === data)
  const totalDia = doDia.reduce((s, v) => s + v.preco_unit * v.quantidade, 0)

  return (
    <>
      <div className="titulo-secao">
        <div>
          <h2>Registrar venda</h2>
          <p className="sub">Anote cada venda para acompanhar seu faturamento.</p>
        </div>
      </div>

      {d.produtos.length === 0 ? (
        <div className="cartao vazio">
          <span className="grande">🛒</span>
          Cadastre um produto antes de registrar vendas.
          <div style={{ marginTop: 14 }}><button className="botao pequeno" onClick={() => d.irPara('produtos')}>Cadastrar produto</button></div>
        </div>
      ) : (
        <div className="cartao pilha">
          <Campo rotulo="O que você vendeu?">
            <select className="entrada" value={produtoId} onChange={(e) => { setProdutoId(e.target.value); setPreco('') }}>
              <option value="">Escolha o produto…</option>
              {d.produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Campo>
          {produto && (
            <>
              <div className="chips">
                <button className={'chip' + (tipo === 'porcao' ? ' ativo' : '')} onClick={() => { setTipo('porcao'); setPreco('') }}>
                  Por {singular(produto.tipo_porcao)}
                </button>
                <button className={'chip' + (tipo === 'inteiro' ? ' ativo' : '')} onClick={() => { setTipo('inteiro'); setPreco('') }}>
                  Inteiro
                </button>
              </div>
              <div className="grade2">
                <Campo rotulo="Quantidade">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="botao claro pequeno" onClick={() => setQtd(Math.max(1, qtd - 1))}>−</button>
                    <input className="entrada" style={{ textAlign: 'center' }} type="number" inputMode="numeric" value={qtd} onChange={(e) => setQtd(Math.max(1, Math.round(num(e.target.value))))} />
                    <button className="botao claro pequeno" onClick={() => setQtd(qtd + 1)}>＋</button>
                  </div>
                </Campo>
                <Campo rotulo="Preço de cada">
                  <Dinheiro valor={preco === '' ? precoSug : preco} onChange={setPreco} />
                </Campo>
              </div>
              <Campo rotulo="Dia da venda">
                <input className="entrada" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </Campo>
              <div className="aviso" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total: <b>{brl(precoFinal * qtd)}</b></span>
                <span style={{ color: 'var(--manjericao)' }}>Lucro: <b>{brl((precoFinal - custoUnit) * qtd)}</b></span>
              </div>
              <button className="botao verde" disabled={salvando} onClick={registrar}>✓ Registrar venda</button>
            </>
          )}
        </div>
      )}

      <div className="cartao">
        <h2 style={{ justifyContent: 'space-between' }}>
          <span>🧾 Vendas do dia</span>
          <span style={{ fontSize: 15 }}>{brl(totalDia)}</span>
        </h2>
        {doDia.length === 0 ? (
          <p className="sub">Nenhuma venda neste dia ainda.</p>
        ) : (
          doDia.map((v) => (
            <div className="linha-lista" key={v.id}>
              <div className="avatar">{emojiDe(v.produto_nome)}</div>
              <div className="info">
                <b>{v.produto_nome}</b>
                <small>{v.quantidade}× {v.tipo === 'inteiro' ? 'inteiro' : 'porção'} · {brl(v.preco_unit)}</small>
              </div>
              <span className="valor">{brl(v.preco_unit * v.quantidade)}</span>
              <button className="icone-btn" aria-label="Apagar venda" onClick={async () => { await db.vendas.remover(v.id); await d.recarregar() }}>🗑️</button>
            </div>
          ))
        )}
      </div>
    </>
  )
}
