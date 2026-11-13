import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Sem as variáveis de ambiente o app roda em "modo demonstração", salvando no próprio celular. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
export const modoDemo = !supabase
