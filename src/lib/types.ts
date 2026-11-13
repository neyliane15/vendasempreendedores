export type Unidade = 'g' | 'kg' | 'ml' | 'L' | 'un'

export interface Negocio {
  id?: string
  nome: string
  mao_obra_pct: number
  gas_pct: number
  luz_pct: number
  agua_pct: number
  embalagem_pct: number
  markup_padrao: number
}

export interface Insumo {
  id: string
  nome: string
  preco: number
  quantidade: number
  unidade: Unidade
  created_at?: string
}

export interface Ingrediente {
  nome: string
  preco_pacote: number
  qtd_pacote: number
  unidade_pacote: Unidade
  qtd_usada: number
  unidade_usada: Unidade
}

export interface Produto {
  id: string
  nome: string
  rendimento: number
  tipo_porcao: string
  markup: number
  embalagem_unit: number
  ingredientes: Ingrediente[]
  created_at?: string
}

export interface Venda {
  id: string
  produto_id: string | null
  produto_nome: string
  tipo: 'inteiro' | 'porcao'
  quantidade: number
  preco_unit: number
  custo_unit: number
  data: string // YYYY-MM-DD
  created_at?: string
}

export interface ItemCupom {
  nome: string
  quantidade: number
  unidade: Unidade
  preco: number
}

/** Uma compra (nota, recibo ou lançamento manual) com seus itens. */
export interface Compra {
  id: string
  data: string // YYYY-MM-DD
  local: string
  total: number
  itens: ItemCupom[]
  created_at?: string
}
