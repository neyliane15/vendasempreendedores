// Supabase Edge Function: lê foto de cupom fiscal, recibo ou papel escrito à mão
// e devolve a lista de produtos com quantidade, unidade e preço.
// Segredo necessário:  supabase secrets set ANTHROPIC_API_KEY=...
import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['itens'],
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
  },
}

const INSTRUCOES = `Você lê fotos de cupons fiscais, recibos e anotações à mão de pequenos negócios de comida no Brasil.
Liste cada produto comprado com:
- nome: nome claro e legível em português (expanda abreviações, ex.: "FAR TRIGO 1KG" -> "Farinha de trigo")
- quantidade e unidade do pacote (g, kg, ml, L ou un). Ex.: "Leite condensado 395g" -> 395 g. Se não houver, use 1 un.
  Se a linha comprou várias embalagens iguais, some: 2 pacotes de 1 kg -> 2 kg.
- preco: valor total pago naquela linha, em reais.
Ignore totais, subtotais, troco, impostos, formas de pagamento e dados da loja.
Se a imagem não tiver itens com preço, devolva a lista vazia.`

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  try {
    const { imagem, mime } = await req.json()
    if (!imagem || typeof imagem !== 'string') return json({ erro: 'Envie a imagem.' }, 400)
    if (imagem.length > 7_000_000) return json({ erro: 'Imagem muito grande.' }, 413)

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
            { type: 'image', source: { type: 'base64', media_type: mime || 'image/jpeg', data: imagem } },
            { type: 'text', text: 'Extraia os itens desta nota.' },
          ],
        },
      ],
    })

    if (resposta.stop_reason === 'refusal') return json({ itens: [] })
    const texto = resposta.content.find((b) => b.type === 'text')
    const dados = texto && texto.type === 'text' ? JSON.parse(texto.text) : { itens: [] }
    return json(dados)
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ erro: 'Muitas leituras agora, tente em instantes.' }, 429)
    if (e instanceof Anthropic.APIError) return json({ erro: 'Serviço de leitura indisponível.' }, 502)
    console.error(e)
    return json({ erro: 'Não foi possível ler a imagem.' }, 500)
  }
})
