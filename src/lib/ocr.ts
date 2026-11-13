import { supabase } from './supabase'
import type { ItemCupom, Unidade } from './types'

/** Reduz a foto para economizar internet e acelerar a leitura. */
export async function comprimirImagem(arquivo: File, max = 1600): Promise<{ base64: string; mime: string; url: string }> {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const url = canvas.toDataURL('image/jpeg', 0.85)
  return { base64: url.split(',')[1], mime: 'image/jpeg', url }
}

/** Com Supabase: IA lê cupom fiscal, recibo ou papel escrito à mão. Sem Supabase: leitura básica no aparelho. */
export async function lerCupom(arquivo: File, progresso?: (msg: string) => void): Promise<ItemCupom[]> {
  const img = await comprimirImagem(arquivo)
  if (supabase) {
    progresso?.('Lendo sua nota com inteligência artificial…')
    const { data, error } = await supabase.functions.invoke('ler-cupom', {
      body: { imagem: img.base64, mime: img.mime },
    })
    if (error) throw new Error('Não consegui ler a foto. Tente de novo com mais luz.')
    return (data?.itens ?? []) as ItemCupom[]
  }
  progresso?.('Lendo a foto no seu celular…')
  const { recognize } = await import('tesseract.js')
  const r = await recognize(img.url, 'por', {
    logger: (m: { status: string; progress: number }) =>
      m.status === 'recognizing text' && progresso?.(`Lendo a foto… ${Math.round(m.progress * 100)}%`),
  })
  return extrairLinhas(r.data.text)
}

export function extrairLinhas(texto: string): ItemCupom[] {
  const itens: ItemCupom[] = []
  const ignorar = /(total|subtotal|troco|dinheiro|cart[aã]o|cpf|cnpj|desconto|pix|valor a pagar|tribut)/i
  for (const bruta of texto.split('\n')) {
    const linha = bruta.trim()
    if (!linha || ignorar.test(linha)) continue
    const m = linha.match(/^(.*?)[\s.:-]*R?\$?\s*(\d{1,4}[.,]\d{2})\s*$/)
    if (!m) continue
    let nome = m[1].replace(/^\d+\s+/, '').replace(/\s{2,}/g, ' ').trim()
    if (nome.length < 2) continue
    const q = nome.match(/(\d+[.,]?\d*)\s*(kg|g|ml|l|un)\b/i)
    let quantidade = 1
    let unidade: Unidade = 'un'
    if (q) {
      quantidade = parseFloat(q[1].replace(',', '.'))
      const u = q[2].toLowerCase()
      unidade = (u === 'l' ? 'L' : u) as Unidade
      nome = nome.replace(q[0], '').trim()
    }
    itens.push({ nome: capitalizar(nome), quantidade, unidade, preco: parseFloat(m[2].replace(',', '.')) })
  }
  return itens
}

const capitalizar = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())
