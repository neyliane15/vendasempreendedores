import { useMemo, useState } from 'react'
import type { Dados } from '../App'
import { brl, hoje, pct } from '../lib/calc'
import { emojiDe } from './Produtos'

type Periodo = 'hoje' | '7d' | 'mes'
const NOMES: Record<Periodo, string> = { hoje: 'Hoje', '7d': '7 dias', mes: 'Este mês' }

const diaISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export default function Painel(d: Dados) {
  const [periodo, setPeriodo] = useState<Periodo>('mes')

  const r = useMemo(() => {
    const h = hoje()
    const inicio =
      periodo === 'hoje' ? h : periodo === '7d' ? diaISO(new Date(Date.now() - 6 * 864e5)) : h.slice(0, 8) + '01'
    const vendas = d.vendas.filter((v) => v.data >= inicio && v.data <= h)
    const fat = vendas.reduce((s, v) => s + v.preco_unit * v.quantidade, 0)
    const custo = vendas.reduce((s, v) => s + v.custo_unit * v.quantidade, 0)
    const porProduto = new Map<string, { nome: string; qtd: number; fat: number; lucro: number }>()
    for (const v of vendas) {
      const p = porProduto.get(v.produto_nome) ?? { nome: v.produto_nome, qtd: 0, fat: 0, lucro: 0 }
      p.qtd += v.quantidade
      p.fat += v.preco_unit * v.quantidade
      p.lucro += (v.preco_unit - v.custo_unit) * v.quantidade
      porProduto.set(v.produto_nome, p)
    }
    const dias = Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(Date.now() - (6 - i) * 864e5)
      const iso = diaISO(dt)
      const vs = d.vendas.filter((v) => v.data === iso)
      const f = vs.reduce((s, v) => s + v.preco_unit * v.quantidade, 0)
      const l = vs.reduce((s, v) => s + (v.preco_unit - v.custo_unit) * v.quantidade, 0)
      return { rotulo: dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), f, l }
    })
    return {
      fat, custo, lucro: fat - custo, margem: fat > 0 ? (fat - custo) / fat : 0, qtd: vendas.reduce((s, v) => s + v.quantidade, 0),
      ranking: [...porProduto.values()].sort((a, b) => b.fat - a.fat).slice(0, 5), dias,
    }
  }, [d.vendas, periodo])

  const max = Math.max(1, ...r.dias.map((x) => x.f))
  const saudacao = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 800 }}>{saudacao}! 👋</h2>
        <p className="sub">Veja como estão as vendas do seu negócio.</p>
      </div>

      <div className="chips">
        {(Object.keys(NOMES) as Periodo[]).map((p) => (
          <button key={p} className={'chip' + (periodo === p ? ' ativo' : '')} onClick={() => setPeriodo(p)}>{NOMES[p]}</button>
        ))}
      </div>

      <div className="kpis">
        <div className="cartao tomate kpi"><span className="ic">💰</span><small>Faturamento</small><strong>{brl(r.fat)}</strong></div>
        <div className="cartao kpi"><span className="ic">🧾</span><small>Custos</small><strong>{brl(r.custo)}</strong></div>
        <div className="cartao verde kpi"><span className="ic">🤑</span><small>Lucro</small><strong>{brl(r.lucro)}</strong></div>
        <div className="cartao mostarda kpi"><span className="ic">🛍️</span><small>Itens vendidos</small><strong>{r.qtd}</strong></div>
      </div>

      <div className="cartao pilha">
        <h2>🎯 Sua margem de lucro: {pct(r.margem)}</h2>
        <div className="medidor"><div style={{ width: `${Math.min(100, Math.max(0, r.margem * 100))}%` }} /></div>
        <p className="sub" style={{ marginTop: 0 }}>
          {r.fat > 0
            ? <>De cada <b>R$ 10,00</b> que você vende, <b>{brl(r.margem * 10)}</b> ficam de lucro para você.</>
            : 'Registre suas vendas para ver aqui quanto sobra de verdade.'}
        </p>
      </div>

      <div className="cartao">
        <h2>📅 Últimos 7 dias</h2>
        <div className="barras">
          {r.dias.map((x, i) => (
            <div className="barra" key={i}>
              <div className="col" style={{ height: `${(x.f / max) * 100}%` }} title={brl(x.f)}>
                <div className="lucro" style={{ height: x.f > 0 ? `${Math.max(0, (x.l / x.f) * 100)}%` : 0 }} />
              </div>
              <span>{x.rotulo}</span>
            </div>
          ))}
        </div>
        <div className="legenda">
          <span><i style={{ background: 'var(--mostarda)' }} />Faturamento</span>
          <span><i style={{ background: 'var(--manjericao)' }} />Lucro</span>
        </div>
      </div>

      <div className="cartao">
        <h2>🏆 Mais vendidos</h2>
        {r.ranking.length === 0 ? (
          <div className="vazio">
            <span className="grande">🛒</span>
            Nenhuma venda neste período.
            <div style={{ marginTop: 14 }}><button className="botao pequeno" onClick={() => d.irPara('vendas')}>Registrar venda</button></div>
          </div>
        ) : (
          r.ranking.map((p) => (
            <div className="linha-lista" key={p.nome}>
              <div className="avatar">{emojiDe(p.nome)}</div>
              <div className="info">
                <b>{p.nome}</b>
                <small>{p.qtd} vendidos · lucro {brl(p.lucro)}</small>
              </div>
              <span className="valor">{brl(p.fat)}</span>
            </div>
          ))
        )}
      </div>
    </>
  )
}
