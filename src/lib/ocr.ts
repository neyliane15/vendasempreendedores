import { supabase } from './supabase'
import { extrairData, extrairNota, type NotaLida } from './parser'
import type { ItemCupom } from './types'

export type ResultadoLeitura = NotaLida & { texto: string }

async function carregar(arquivo: File, max: number) {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return { canvas, ctx }
}

/** Reduz a foto para enviar à IA (economiza internet). */
export async function comprimirImagem(arquivo: File, max = 1600) {
  const { canvas } = await carregar(arquivo, max)
  const url = canvas.toDataURL('image/jpeg', 0.85)
  return { base64: url.split(',')[1], mime: 'image/jpeg', url }
}

/**
 * Prepara a foto para a leitura no aparelho: mantém resolução alta (nota é comprida e estreita),
 * passa para preto e branco e aumenta o contraste com limiar local (corrige sombra e papel amarelado).
 */
async function prepararParaLeitura(arquivo: File): Promise<string> {
  const { canvas, ctx } = await carregar(arquivo, 3000)
  const { width: w, height: h } = canvas
  const img = ctx.getImageData(0, 0, w, h)
  const px = img.data
  const cinza = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) cinza[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]

  // imagem integral para média local rápida
  const integral = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let soma = 0
    for (let x = 0; x < w; x++) {
      soma += cinza[y * w + x]
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + soma
    }
  }
  const raio = Math.max(8, Math.round(Math.min(w, h) / 40))
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - raio), y1 = Math.min(h, y + raio + 1)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - raio), x1 = Math.min(w, x + raio + 1)
      const area = (x1 - x0) * (y1 - y0)
      const s = integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0]
      const v = cinza[y * w + x] < (s / area) * 0.88 ? 0 : 255
      const i = (y * w + x) * 4
      px[i] = px[i + 1] = px[i + 2] = v
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * Leitura de nota.
 * 1º tenta a IA (função "ler-cupom" no Supabase, com Gemini grátis ou Claude) — entende foto torta e letra de mão.
 * Se a IA não estiver configurada ou falhar, lê no próprio celular com Tesseract (grátis, só para foto boa).
 */
let iaDisponivel = !!supabase

export async function lerCupom(arquivo: File, progresso?: (msg: string) => void): Promise<ResultadoLeitura> {
  if (supabase && iaDisponivel) {
    progresso?.('Lendo sua nota com inteligência artificial…')
    try {
      const img = await comprimirImagem(arquivo, 2048)
      const { data, error } = await supabase.functions.invoke('ler-cupom', { body: { imagem: img.base64, mime: img.mime } })
      if (!error && data?.itens) {
        return { itens: data.itens as ItemCupom[], data: data.data || null, local: data.local || '', texto: '' }
      }
      const status = (error as { context?: { status?: number } } | null)?.context?.status
      if (status === 404 || status === 501) iaDisponivel = false // função não publicada ou sem chave: não tenta de novo
    } catch {
      /* segue para a leitura no aparelho */
    }
  }
  progresso?.('Preparando a foto…')
  const imagem = await prepararParaLeitura(arquivo)
  progresso?.('Lendo a foto no seu celular…')
  const { createWorker, PSM } = await import('tesseract.js')
  const base = `${location.origin}/tesseract`
  const worker = await createWorker('por', 1, {
    workerPath: `${base}/worker.min.js`,
    corePath: base,
    langPath: base,
    logger: (m: { status: string; progress: number }) =>
      m.status === 'recognizing text' && progresso?.(`Lendo a foto… ${Math.round(m.progress * 100)}%`),
  })
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN, preserve_interword_spaces: '1' })
    const r = await worker.recognize(imagem)
    const texto = r.data.text
    const nota = extrairNota(texto)
    return { ...nota, data: nota.data ?? extrairData(texto), texto }
  } finally {
    await worker.terminate()
  }
}
