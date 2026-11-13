import type { ItemCupom, Unidade } from './types'

export interface NotaLida {
  itens: ItemCupom[]
  data: string | null // YYYY-MM-DD
  local: string
}

const IGNORAR = new RegExp(
  [
    'total', 'subtotal', 'troco', 'dinheiro', 'cart[aã]o', 'cr[eé]dito', 'd[eé]bito', 'cpf', 'cnpj', 'desconto',
    'pix', 'valor a pagar', 'valor pago', 'tribut', 'imposto', 'lei 12', 'ie:', 'inscri', 'consumidor', 'documento auxiliar',
    'nfc-?e', 'nota fiscal', 'cupom fiscal', 'protocolo', 'chave de acesso', 'consulte', 'qtd', 'c[oó]digo', 'descri[cç][aã]o',
    'vl\\.? ?(unit|total|item)', 'forma de pagamento', 'qtde', 'itens', 'acr[eé]scimo', 'operador', 'caixa', 'serie', 's[eé]rie',
    'emiss[aã]o', 'endere[cç]o', 'cep', 'fone', 'tel:', 'www\\.', 'http', 'obrigad', 'volte sempre',
  ].join('|'),
  'i',
)

// número de dinheiro: 6,49 · 6.49 · 1.234,56 · "6, 49" (espaço comum no OCR)
const PRECO = /(\d{1,3}(?:\.\d{3})*|\d+)\s?[,.]\s?(\d{2})(?!\d)/g

const UNIDADES: Record<string, Unidade> = { kg: 'kg', g: 'g', gr: 'g', grs: 'g', ml: 'ml', l: 'L', lt: 'L', lts: 'L', un: 'un', und: 'un', unid: 'un', pc: 'un', pct: 'un', cx: 'un', dz: 'un' }

const paraNumero = (int: string, dec: string) => parseFloat(int.replace(/\./g, '') + '.' + dec)

/** Troca letras que o OCR confunde com números, só dentro de trechos numéricos. */
function corrigirNumeros(l: string) {
  return l.replace(/(?<=\d[,.]?)[oO]|[oO](?=[,.]?\d)/g, '0').replace(/(?<=\d)[lI](?=\d)/g, '1').replace(/(?<=\d)[sS](?=\d)/g, '5')
}

function limparNome(n: string) {
  return n
    .replace(/^\s*\d{1,4}\s+/, '') // número do item (001)
    .replace(/\S{7,}/g, (t) => ((t.match(/\d/g) ?? []).length >= 4 ? ' ' : t)) // código de barras (mesmo lido com letras)
    .replace(/(?<=[a-zà-ú])0(?=[a-zà-ú])/gi, 'o') // S0JA -> SOJA
    .replace(/(^|\s)(R\$|RS)(?=\s|\d|$)/gi, ' ')
    .replace(/[|_*#=~]+/g, ' ')
    .replace(/\s*[-–:.]+\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const capitalizar = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

/** Tamanho do pacote escrito no nome: "LEITE COND 395G", "OLEO 900ML", "FARINHA 1KG", "OVOS 30UN". */
function tamanhoPacote(nome: string): { quantidade: number; unidade: Unidade; resto: string } | null {
  const m = nome.match(/(\d+(?:[.,]\d+)?)\s?(kg|grs|gr|g|ml|lts|lt|l|un|und|unid)\b/i)
  if (!m) return null
  return { quantidade: parseFloat(m[1].replace(',', '.')), unidade: UNIDADES[m[2].toLowerCase()], resto: nome.replace(m[0], ' ') }
}

/** "2 UN X 6,49" ou "1,250 KG x 39,90": quantidade comprada. */
function quantidadeComprada(l: string): { qtd: number; unidade: Unidade } | null {
  const m = l.match(/(\d+(?:[.,]\d{1,3})?)\s?(kg|un|und|unid|pc|pct|cx|l|lt|g)?\s?[xX*]\s?(?:R\$)?\s?\d/i)
  if (!m) return null
  return { qtd: parseFloat(m[1].replace(',', '.')), unidade: m[2] ? UNIDADES[m[2].toLowerCase()] ?? 'un' : 'un' }
}

export function extrairData(texto: string): string | null {
  const m = texto.match(/\b(\d{2})[/.-](\d{2})[/.-](\d{4}|\d{2})\b/)
  if (!m) return null
  const [, d, mes, a] = m
  const ano = a.length === 2 ? '20' + a : a
  const dia = Number(d), mm = Number(mes)
  if (dia < 1 || dia > 31 || mm < 1 || mm > 12) return null
  return `${ano}-${mes}-${d}`
}

export function extrairNota(texto: string): NotaLida {
  const linhas = texto.split('\n').map((l) => corrigirNumeros(l.trim())).filter(Boolean)
  const itens: ItemCupom[] = []
  let nomePendente = ''
  let local = ''

  for (const linha of linhas) {
    const temLetras = (linha.match(/[a-zà-ú]/gi) ?? []).length
    if (!local && temLetras >= 4 && !PRECO.test(linha) && !IGNORAR.test(linha)) local = capitalizar(limparNome(linha)).slice(0, 40)
    PRECO.lastIndex = 0
    if (IGNORAR.test(linha) || /\d{2}[/.-]\d{2}[/.-]\d{2,4}/.test(linha) && !/[xX*]/.test(linha)) {
      nomePendente = ''
      continue
    }
    const precos = [...linha.matchAll(PRECO)]
    if (!precos.length) {
      // linha só com descrição: o preço deve vir na linha de baixo (padrão NFC-e)
      if (temLetras >= 3) nomePendente = linha
      continue
    }
    const ultimo = precos[precos.length - 1]
    const preco = paraNumero(ultimo[1], ultimo[2])
    if (!(preco > 0) || preco > 100000) continue

    let nome = linha.slice(0, precos[0].index)
    const qc = quantidadeComprada(linha)
    if (qc) nome = nome.replace(/(\d+(?:[.,]\d{1,3})?)\s?(kg|un|und|unid|pc|pct|cx|l|lt|g)?\s?[xX*]\s*$/i, '')
    nome = limparNome(nome)
    if ((nome.match(/[a-zà-ú]/gi) ?? []).length < 3) {
      if (!nomePendente) continue
      nome = limparNome(nomePendente)
    }
    nomePendente = ''

    let quantidade = 1
    let unidade: Unidade = 'un'
    const pacote = tamanhoPacote(nome)
    if (qc && (qc.unidade === 'kg' || qc.unidade === 'L')) {
      quantidade = qc.qtd // vendido a granel: 1,250 KG x 39,90
      unidade = qc.unidade
      if (pacote) nome = pacote.resto
    } else if (pacote) {
      quantidade = pacote.quantidade * (qc?.qtd ?? 1) // 2 UN x 1KG = 2 kg
      unidade = pacote.unidade
      nome = pacote.resto
    } else if (qc) {
      quantidade = qc.qtd
    }
    nome = capitalizar(limparNome(nome))
    if (nome.length < 2) continue
    itens.push({ nome, quantidade: Math.round(quantidade * 1000) / 1000, unidade, preco })
  }
  return { itens, data: extrairData(texto), local }
}
