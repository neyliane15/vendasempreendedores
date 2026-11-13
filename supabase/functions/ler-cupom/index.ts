// Supabase Edge Function: lê foto de cupom fiscal, recibo ou papel escrito à mão
// e devolve a lista de produtos com quantidade, unidade e preço, além da data e do local.
//
// Provedores (configure UM dos segredos no Supabase → Edge Functions → Secrets):
//   GEMINI_API_KEY    → Google Gemini (tem plano gratuito, sem cartão). Opcional: GEMINI_MODEL.
//   ANTHROPIC_API_KEY → Claude (pago).
// Se os dois existirem, usa o Gemini.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const INSTRUCOES = `Você lê fotos de cupons fiscais (NFC-e), recibos e anotações à mão de pequenos negócios de comida no Brasil.
A foto pode estar torta, curvada, com sombra ou segurada na mão. Leia com atenção.
Devolva:
- itens: cada produto comprado, com
  - nome: nome claro em português, sem códigos (expanda abreviações: "FAR TRIGO 1KG" -> "Farinha de trigo", "LT COND" -> "Leite condensado")
  - quantidade e unidade do TOTAL comprado naquela linha (g, kg, ml, L ou un). Ex.: "LEITE COND 395G" 2 UN -> 790 g.
    Produto pesado: "0,450 KG x 39,90" -> 0.45 kg. Sem informação de tamanho: quantidade de unidades com "un".
  - preco: valor TOTAL pago naquela linha, em reais (número, ex.: 12.98).
- data: data da compra no formato AAAA-MM-DD, ou "" se não aparecer.
- local: nome da loja/mercado, curto, ou "" se não aparecer.
NÃO inclua: total da nota, subtotal, troco, descontos, impostos, formas de pagamento, CPF/CNPJ.
Se a imagem não for uma nota/recibo, devolva itens vazio.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['itens', 'data', 'local'],
  properties: {
    itens: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nome', 'quantidade', 'unidade', 'preco'],
        properties: {
          nome: { type: 'string' },
          quantidade: { type: 'number' },
          unidade: { type: 'string', enum: ['g', 'kg', 'ml', 'L', 'un'] },
          preco: { type: 'number' },
        },
      },
    },
    data: { type: 'string' },
    local: { type: 'string' },
  },
}

// Mesmo esquema no formato do Gemini (tipos em maiúsculas, sem additionalProperties).
const SCHEMA_GEMINI = {
  type: 'OBJECT',
  required: ['itens', 'data', 'local'],
  properties: {
    itens: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['nome', 'quantidade', 'unidade', 'preco'],
        properties: {
          nome: { type: 'STRING' },
          quantidade: { type: 'NUMBER' },
          unidade: { type: 'STRING', enum: ['g', 'kg', 'ml', 'L', 'un'] },
          preco: { type: 'NUMBER' },
        },
      },
    },
    data: { type: 'STRING' },
    local: { type: 'STRING' },
  },
}

type Resultado = { itens: { nome: string; quantidade: number; unidade: string; preco: number }[]; data: string; local: string }

class ErroProvedor extends Error {
  constructor(msg: string, public status = 502) {
    super(msg)
  }
}

async function lerComGemini(chave: string, imagem: string, mime: string): Promise<Resultado> {
  const modelo = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest'
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCOES }] },
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mime, data: imagem } }, { text: 'Extraia os dados desta nota.' }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA_GEMINI, temperature: 0 },
    }),
  })
  if (r.status === 429) throw new ErroProvedor('Limite gratuito atingido. Tente em alguns minutos.', 429)
  if (!r.ok) {
    console.error('Gemini', r.status, await r.text())
    throw new ErroProvedor('Serviço de leitura indisponível.')
  }
  const json = await r.json()
  const texto: string = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  return texto ? JSON.parse(texto) : { itens: [], data: '', local: '' }
}

async function lerComClaude(chave: string, imagem: string, mime: string): Promise<Resultado> {
  const { default: Anthropic } = await import('npm:@anthropic-ai/sdk@1.8.0')
  const client = new Anthropic({ apiKey: chave })
  try {
    const resposta = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: INSTRUCOES,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime as 'image/jpeg', data: imagem } },
            { type: 'text', text: 'Extraia os dados desta nota.' },
          ],
        },
      ],
    })
    if (resposta.stop_reason === 'refusal') return { itens: [], data: '', local: '' }
    const bloco = resposta.content.find((b) => b.type === 'text')
    return bloco && bloco.type === 'text' ? JSON.parse(bloco.text) : { itens: [], data: '', local: '' }
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new ErroProvedor('Muitas leituras agora, tente em instantes.', 429)
    if (e instanceof Anthropic.APIError) throw new ErroProvedor('Serviço de leitura indisponível.')
    throw e
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  try {
    const { imagem, mime } = await req.json()
    if (!imagem || typeof imagem !== 'string') return json({ erro: 'Envie a imagem.' }, 400)
    if (imagem.length > 7_000_000) return json({ erro: 'Imagem muito grande.' }, 413)
    const tipo = typeof mime === 'string' && mime.startsWith('image/') ? mime : 'image/jpeg'

    const gemini = Deno.env.get('GEMINI_API_KEY')
    const anthropic = Deno.env.get('ANTHROPIC_API_KEY')
    if (!gemini && !anthropic) return json({ erro: 'Leitura com IA não configurada.' }, 501)

    const r = gemini ? await lerComGemini(gemini, imagem, tipo) : await lerComClaude(anthropic!, imagem, tipo)
    return json({
      itens: (r.itens ?? []).filter((i) => i.nome && i.preco > 0),
      data: /^\d{4}-\d{2}-\d{2}$/.test(r.data ?? '') ? r.data : '',
      local: r.local ?? '',
    })
  } catch (e) {
    if (e instanceof ErroProvedor) return json({ erro: e.message }, e.status)
    console.error(e)
    return json({ erro: 'Não foi possível ler a imagem.' }, 500)
  }
})
