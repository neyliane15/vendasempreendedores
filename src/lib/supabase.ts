import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Limpa erros comuns de colagem: espaços, aspas, barra ou /rest/v1 no final. */
const limpar = (v?: string) =>
  (v ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()

const urlBruta = limpar(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const key = limpar(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
const url = urlBruta.replace(/\/+$/, '').replace(/\/rest\/v1$/, '').replace(/\/+$/, '')

let cliente: SupabaseClient | null = null
let erro = ''

if (url || key) {
  if (!url) erro = 'A variável VITE_SUPABASE_URL está vazia na Vercel.'
  else if (!key) erro = 'A variável VITE_SUPABASE_ANON_KEY está vazia na Vercel.'
  else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url))
    erro = `VITE_SUPABASE_URL parece errada: "${url}". O formato certo é https://SEU-PROJETO.supabase.co`
  else if (/^sb_secret_/.test(key) || key.includes('service_role'))
    erro = 'VITE_SUPABASE_ANON_KEY está com a chave SECRETA. Use a chave pública (anon ou publishable).'
  else {
    try {
      cliente = createClient(url, key)
    } catch (e) {
      erro = 'Não foi possível conectar ao Supabase: ' + (e as Error).message
    }
  }
}

/** Sem as variáveis de ambiente o app roda em "modo demonstração", salvando no próprio celular. */
export const supabase: SupabaseClient | null = cliente
export const erroConfig = erro
export const modoDemo = !supabase && !erro
