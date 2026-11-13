# Sabor & Lucro

Mini aplicativo (PWA, 100% para celular) para quem está começando a vender comida:

- **Cadastro do negócio** (nome) e dos **custos escondidos**: mão de obra, gás, luz, água e embalagens, já preenchidos com a média do mercado (porcentagem em cima dos ingredientes).
- **Produtos com ficha de custo**: "paguei R$ X no pacote de Y, usei Z" → o app converte g/kg/ml/L/un e calcula.
- **Markup**: 2× Econômico · 2,5× Padrão (recomendado) · 3× Caseiro gourmet · 3,5× Encomenda especial, ou qualquer valor de 1,2× a 5×.
- **Preço sugerido** do produto **inteiro** e **por porção** (fatia, unidade, pedaço, pote…), com lucro e margem.
- **Ler nota** (grátis, no próprio celular): foto do cupom fiscal, recibo ou papel escrito → lista de ingredientes e preços para conferir e salvar. Opcional: leitura com IA paga (`VITE_LEITURA_IA=true`), que entende melhor letra de mão.
- **Compras**: cada nota fica registrada com data, local, itens e valores; histórico por dia e total do mês.
- **Vendas** e **Painel**: vendas, compras, quanto sobrou no caixa (vendas − compras), faturamento, custos, lucro, margem ("de cada R$ 10 vendidos, R$ X ficam pra você"), gráfico de 7 dias e mais vendidos.

Telas: [`docs/telas`](docs/telas).

**Guia completo para colocar no ar: [`docs/PASSO-A-PASSO.md`](docs/PASSO-A-PASSO.md).**

## Tecnologia

React + Vite + TypeScript · Supabase (Auth, Postgres com RLS, Edge Function) · Vercel.

Sem as variáveis do Supabase o app abre em **modo demonstração** (dados salvos só no aparelho e leitura de nota feita no próprio celular com Tesseract).

## Rodar localmente

```bash
npm install
npm run dev
```

## Colocar no ar

### 1. Supabase

1. Crie um projeto em supabase.com.
2. Em **SQL Editor**, rode `supabase/migrations/20261113000000_inicial.sql` (ou `supabase db push` com a CLI).
3. Em **Authentication → Providers**, deixe **Email** ligado.
4. Publique a função de leitura de notas (usa a API da Anthropic / Claude com visão):

```bash
supabase link --project-ref SEU_PROJETO
supabase secrets set ANTHROPIC_API_KEY=sua-chave
supabase functions deploy ler-cupom
```

### 2. Vercel

1. Importe o repositório na Vercel (framework: Vite — detectado sozinho).
2. Em **Environment Variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API).
3. Deploy. No Supabase, em **Authentication → URL Configuration**, coloque a URL da Vercel como *Site URL*.

No celular, abra o site e use **"Adicionar à tela inicial"** para usar como aplicativo.

## Percentuais de mercado usados como padrão

| Custo | Padrão | Faixa comum |
|---|---|---|
| Mão de obra | 30% | 25–40% |
| Gás | 5% | 4–8% |
| Luz | 3% | 2–5% |
| Água | 2% | 1–3% |
| Embalagens | 10% | 8–15% |

Fórmula: `custo total = ingredientes × (1 + soma dos %) + embalagem individual × rendimento`;
`preço = custo × markup`, arredondado para cima em R$ 0,50.

## Estrutura

```
src/
  lib/calc.ts       cálculos de custo, markup e preços
  lib/db.ts         acesso a dados (Supabase ou modo demonstração)
  lib/ocr.ts        leitura de nota (Edge Function ou Tesseract)
  pages/            Painel, Produtos, Escanear, Vendas, Ajustes, Login, BoasVindas
supabase/
  migrations/       tabelas + Row Level Security
  functions/ler-cupom  Edge Function com Claude (visão + JSON estruturado)
```
