import type { Ingrediente, Negocio, Produto, Unidade } from './types'

/** Percentuais tabelados de mercado (aplicados sobre o custo dos ingredientes). */
export const PADROES_MERCADO = {
  mao_obra_pct: 30,
  gas_pct: 5,
  luz_pct: 3,
  agua_pct: 2,
  embalagem_pct: 10,
}

export const CUSTOS_EXTRAS: { chave: keyof typeof PADROES_MERCADO; rotulo: string; icone: string; dica: string }[] = [
  { chave: 'mao_obra_pct', rotulo: 'Mão de obra', icone: '👩‍🍳', dica: 'Seu tempo de trabalho também é custo. O mercado usa de 25% a 40%.' },
  { chave: 'gas_pct', rotulo: 'Gás', icone: '🔥', dica: 'Forno e fogão. Em média de 4% a 8%.' },
  { chave: 'luz_pct', rotulo: 'Luz', icone: '💡', dica: 'Geladeira, batedeira, liquidificador. De 2% a 5%.' },
  { chave: 'agua_pct', rotulo: 'Água', icone: '💧', dica: 'Lavar louça, preparo. De 1% a 3%.' },
  { chave: 'embalagem_pct', rotulo: 'Embalagens', icone: '📦', dica: 'Caixas, sacos, fitas, etiquetas. De 8% a 15%.' },
]

export const MARKUPS = [
  { valor: 2, nome: 'Econômico', desc: 'Preço de bairro, para vender bastante.', emoji: '🥖' },
  { valor: 2.5, nome: 'Padrão do mercado', desc: 'O mais usado por quem está começando.', emoji: '⭐', recomendado: true },
  { valor: 3, nome: 'Caseiro gourmet', desc: 'Produto caprichado e diferenciado.', emoji: '🍰' },
  { valor: 3.5, nome: 'Encomenda especial', desc: 'Festas, datas comemorativas, sob medida.', emoji: '🎉' },
]

const BASE: Record<Unidade, { tipo: string; fator: number }> = {
  g: { tipo: 'peso', fator: 1 },
  kg: { tipo: 'peso', fator: 1000 },
  ml: { tipo: 'vol', fator: 1 },
  L: { tipo: 'vol', fator: 1000 },
  un: { tipo: 'un', fator: 1 },
}

export function custoIngrediente(i: Ingrediente): number {
  const p = BASE[i.unidade_pacote]
  const u = BASE[i.unidade_usada]
  if (!i.qtd_pacote || !p || !u) return 0
  const pacoteBase = i.qtd_pacote * p.fator
  const usadoBase = i.qtd_usada * (p.tipo === u.tipo ? u.fator : p.fator)
  return (i.preco_pacote / pacoteBase) * usadoBase
}

export function somaPct(n: Pick<Negocio, keyof typeof PADROES_MERCADO>): number {
  return n.mao_obra_pct + n.gas_pct + n.luz_pct + n.agua_pct + n.embalagem_pct
}

export interface Calculo {
  ingredientes: number
  extras: number
  embalagemExtra: number
  custoTotal: number
  custoPorcao: number
  precoInteiro: number
  precoPorcao: number
  lucroInteiro: number
  lucroPorcao: number
  margem: number
}

export function arredondar(v: number): number {
  return Math.ceil(v * 2) / 2 // sobe para o próximo R$ 0,50
}

export function calcularProduto(p: Pick<Produto, 'ingredientes' | 'rendimento' | 'markup' | 'embalagem_unit'>, n: Negocio): Calculo {
  const ingredientes = p.ingredientes.reduce((s, i) => s + custoIngrediente(i), 0)
  const extras = ingredientes * (somaPct(n) / 100)
  const rend = Math.max(1, p.rendimento || 1)
  const embalagemExtra = (p.embalagem_unit || 0) * rend
  const custoTotal = ingredientes + extras + embalagemExtra
  const custoPorcao = custoTotal / rend
  const precoInteiro = arredondar(custoTotal * p.markup)
  const precoPorcao = arredondar(custoPorcao * p.markup)
  return {
    ingredientes,
    extras,
    embalagemExtra,
    custoTotal,
    custoPorcao,
    precoInteiro,
    precoPorcao,
    lucroInteiro: precoInteiro - custoTotal,
    lucroPorcao: precoPorcao - custoPorcao,
    margem: precoInteiro > 0 ? (precoInteiro - custoTotal) / precoInteiro : 0,
  }
}

export const brl = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

export const hoje = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const num = (s: string | number) => {
  const v = parseFloat(String(s).replace(',', '.'))
  return Number.isFinite(v) ? v : 0
}
