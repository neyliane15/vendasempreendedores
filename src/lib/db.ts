import { supabase } from './supabase'
import type { Insumo, Negocio, Produto, Venda } from './types'

type Tabela = 'insumos' | 'produtos' | 'vendas'

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))

// ---------- modo demonstração (localStorage) ----------
const ler = <T,>(k: string, padrao: T): T => {
  try {
    const v = localStorage.getItem('vm_' + k)
    return v ? (JSON.parse(v) as T) : padrao
  } catch {
    return padrao
  }
}
const gravar = (k: string, v: unknown) => {
  try {
    localStorage.setItem('vm_' + k, JSON.stringify(v))
  } catch {
    /* sem armazenamento */
  }
}

async function userId(): Promise<string> {
  const { data } = await supabase!.auth.getUser()
  if (!data.user) throw new Error('Faça login novamente.')
  return data.user.id
}

function falha(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

// ---------- negócio ----------
export async function obterNegocio(): Promise<Negocio | null> {
  if (!supabase) return ler<Negocio | null>('negocio', null)
  const { data, error } = await supabase.from('negocios').select('*').maybeSingle()
  falha(error)
  return data as Negocio | null
}

export async function salvarNegocio(n: Negocio): Promise<Negocio> {
  if (!supabase) {
    gravar('negocio', n)
    return n
  }
  const user_id = await userId()
  const { data, error } = await supabase
    .from('negocios')
    .upsert({ ...n, user_id }, { onConflict: 'user_id' })
    .select()
    .single()
  falha(error)
  return data as Negocio
}

// ---------- listas genéricas ----------
async function listar<T>(t: Tabela, ordem = 'created_at'): Promise<T[]> {
  if (!supabase) return ler<T[]>(t, [])
  const { data, error } = await supabase.from(t).select('*').order(ordem, { ascending: false })
  falha(error)
  return (data ?? []) as T[]
}

async function salvar<T extends { id: string }>(t: Tabela, item: Omit<T, 'id'> & { id?: string }): Promise<T> {
  if (!supabase) {
    const lista = ler<T[]>(t, [])
    const novo = { ...item, id: item.id || uid(), created_at: new Date().toISOString() } as unknown as T
    const i = lista.findIndex((x) => x.id === novo.id)
    if (i >= 0) lista[i] = novo
    else lista.unshift(novo)
    gravar(t, lista)
    return novo
  }
  const user_id = await userId()
  const { data, error } = await supabase.from(t).upsert({ ...item, user_id }).select().single()
  falha(error)
  return data as T
}

async function salvarVarios<T>(t: Tabela, itens: Omit<T, 'id'>[]): Promise<void> {
  if (!supabase) {
    const lista = ler<unknown[]>(t, [])
    gravar(t, [...itens.map((i) => ({ ...i, id: uid(), created_at: new Date().toISOString() })), ...lista])
    return
  }
  const user_id = await userId()
  const { error } = await supabase.from(t).insert(itens.map((i) => ({ ...i, user_id })))
  falha(error)
}

async function remover(t: Tabela, id: string): Promise<void> {
  if (!supabase) {
    gravar(t, ler<{ id: string }[]>(t, []).filter((x) => x.id !== id))
    return
  }
  const { error } = await supabase.from(t).delete().eq('id', id)
  falha(error)
}

export const db = {
  insumos: {
    listar: () => listar<Insumo>('insumos'),
    salvar: (i: Omit<Insumo, 'id'> & { id?: string }) => salvar<Insumo>('insumos', i),
    salvarVarios: (i: Omit<Insumo, 'id'>[]) => salvarVarios<Insumo>('insumos', i),
    remover: (id: string) => remover('insumos', id),
  },
  produtos: {
    listar: () => listar<Produto>('produtos'),
    salvar: (p: Omit<Produto, 'id'> & { id?: string }) => salvar<Produto>('produtos', p),
    remover: (id: string) => remover('produtos', id),
  },
  vendas: {
    listar: () => listar<Venda>('vendas', 'data'),
    salvar: (v: Omit<Venda, 'id'> & { id?: string }) => salvar<Venda>('vendas', v),
    remover: (id: string) => remover('vendas', id),
  },
}
