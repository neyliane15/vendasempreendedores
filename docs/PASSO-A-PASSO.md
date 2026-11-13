# Sabor & Lucro — Passo a passo completo para colocar no ar

Do zero até o app instalado no celular, com todos os comandos.
Tempo estimado: 40 a 60 minutos na primeira vez.

---

## 0. O que você precisa antes de começar

| Item | Para quê | Onde |
|---|---|---|
| Node.js 20 ou mais novo | Rodar e compilar o app | nodejs.org (versão LTS) |
| Git | Baixar e enviar o código | git-scm.com |
| Conta no GitHub | Onde o código fica | github.com (o repositório `neyliane15/vendasempreendedores` já existe) |
| Conta no Supabase | Banco de dados, login e função de leitura de nota | supabase.com |
| Conta na Vercel | Colocar o site no ar | vercel.com (entre com o GitHub) |
| Conta na Anthropic | Chave da IA que lê as notas | console.anthropic.com |

Confira se o Node e o Git estão instalados (os dois comandos devem mostrar um número de versão):

```bash
node -v
git --version
```

Não precisa instalar a CLI do Supabase: todos os comandos abaixo usam `npx supabase`, que baixa sozinha.

---

## 1. Baixar o projeto e rodar no computador

```bash
git clone https://github.com/neyliane15/vendasempreendedores.git
cd vendasempreendedores
git checkout claude/zealous-knuth-2riq3k
npm install
npm run dev
```

Abra **http://localhost:5173**. Sem Supabase configurado, o app abre em **modo demonstração**
(aparece "demonstração" no topo) e salva os dados só no navegador. Serve para conferir as telas.

Para abrir no celular, conectado no mesmo Wi-Fi do computador:

```bash
npm run dev -- --host
```

O terminal mostra um endereço `Network: http://192.168.x.x:5173`. Digite esse endereço no navegador do celular.

Para parar o servidor: `Ctrl + C`.

---

## 2. Criar a branch `main` (a Vercel publica a partir dela)

Hoje o código está só na branch `claude/zealous-knuth-2riq3k`. Crie a `main` a partir dela:

```bash
git checkout -b main
git push -u origin main
```

No GitHub: **Settings → General → Default branch** → troque para `main` → **Update**.

---

## 3. Criar o projeto no Supabase

1. Entre em **supabase.com → Dashboard → New project**.
2. Preencha:
   - **Name:** `sabor-e-lucro`
   - **Database Password:** gere uma senha forte e **guarde** (vai pedir no passo 4).
   - **Region:** `South America (São Paulo)`. Fica mais rápido para quem usa no Brasil.
3. Clique em **Create new project** e espere 1 a 2 minutos.
4. Anote dois valores em **Project Settings → API** (ou **API Keys**, dependendo da versão do painel):
   - **Project URL**, por exemplo `https://abcdefghijkl.supabase.co`
   - **Chave pública**: a `anon public` (formato `eyJ...`) ou a `publishable` (formato `sb_publishable_...`). As duas funcionam.
5. Anote também o **Project ref**: são as letras do endereço, `abcdefghijkl` no exemplo acima.

> ⚠️ **Nunca** use a chave `service_role` / `secret` no app. Ela ignora toda a segurança do banco.

---

## 4. Criar as tabelas do banco

São 4 tabelas: `negocios`, `insumos`, `produtos` e `vendas`. Todas têm segurança por usuário
(Row Level Security): cada pessoa só vê e altera os próprios dados.

### Opção A — pelo painel (mais fácil)

1. No Supabase: **SQL Editor → New query**.
2. Abra o arquivo `supabase/migrations/20261113000000_inicial.sql`, copie **todo** o conteúdo e cole.
3. Clique em **Run**. Deve aparecer `Success. No rows returned`.

### Opção B — pelo terminal

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

O `login` abre o navegador para autorizar. O `link` pede a senha do banco do passo 3.

### Conferir

Em **Table Editor** devem aparecer as 4 tabelas, cada uma com o selo **RLS enabled**.

---

## 5. Configurar o login por e-mail

1. **Authentication → Sign In / Providers → Email**: deixe **Enable Email provider** ligado.
2. **Confirm email**:
   - **Ligado** (padrão): a pessoa recebe um link no e-mail e só entra depois de clicar. É mais seguro.
   - **Desligado**: entra direto após criar a conta. É mais simples para pessoas leigas.
3. Para usar a confirmação ligada em produção, configure um SMTP próprio em **Authentication → Emails → SMTP Settings**
   (Resend, Brevo etc.). O envio de e-mails padrão do Supabase tem limite baixo por hora e serve só para testes.

As URLs do site (Site URL) são configuradas no passo 10, depois que a Vercel gerar o endereço.

---

## 6. Gerar a chave da IA (Anthropic)

1. Entre em **console.anthropic.com → Settings → API Keys → Create Key**.
2. Nome: `sabor-e-lucro-ler-cupom`. Copie a chave (`sk-ant-...`). **Ela só aparece uma vez.**
3. Em **Settings → Billing**, adicione créditos. Sem crédito, a leitura de nota falha.

**Custo estimado:** cerca de US$ 0,02 a US$ 0,05 por foto lida, com o modelo configurado (Claude Opus 5.5).
Veja o passo 13 para trocar por um modelo bem mais barato.

---

## 7. Publicar a função que lê as notas

A função fica em `supabase/functions/ler-cupom/index.ts`. Ela recebe a foto do app, envia para a IA
e devolve a lista de produtos (nome, quantidade, unidade e preço). A chave da IA fica guardada só no
servidor do Supabase e nunca vai para o celular.

Se você pulou a Opção B do passo 4, faça login e ligue o projeto primeiro:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
```

Guarde a chave da IA como segredo (troque pela sua):

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-SUA-CHAVE-AQUI
```

Publique a função:

```bash
npx supabase functions deploy ler-cupom
```

Se aparecer erro falando de Docker, use:

```bash
npx supabase functions deploy ler-cupom --use-api
```

### Conferir

```bash
npx supabase functions list
npx supabase secrets list
```

`ler-cupom` deve aparecer como **ACTIVE**, e `ANTHROPIC_API_KEY` deve aparecer na lista de segredos (o valor fica escondido).

A função só aceita chamadas de quem está logado no app (`verify_jwt = true` em `supabase/config.toml`).
Por isso, desconhecidos não conseguem gastar seus créditos.

---

## 8. Ligar o app ao Supabase no computador

```bash
cp .env.example .env.local
```

Abra `.env.local` e preencha com os valores do passo 3:

```env
VITE_SUPABASE_URL=https://abcdefghijkl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...sua-chave-publica...
```

Rode de novo:

```bash
npm run dev
```

Agora o app abre na tela de **Entrar**, sem a palavra "demonstração". O arquivo `.env.local` **não** vai para o GitHub (ele está no `.gitignore`).

---

## 9. Publicar na Vercel

1. **vercel.com → Add New… → Project → Import** o repositório `vendasempreendedores`.
2. A Vercel detecta tudo sozinha. Confira:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
3. Abra **Environment Variables** e adicione as duas variáveis, marcando Production, Preview e Development:

| Nome | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://abcdefghijkl.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | sua chave pública |

4. Clique em **Deploy**. Em cerca de 1 minuto sai o endereço, por exemplo `https://vendasempreendedores.vercel.app`.

> Se você criar ou mudar variáveis **depois** do deploy, precisa publicar de novo:
> **Deployments → ⋯ no último → Redeploy**. Variáveis `VITE_` entram no app na hora da compilação.

O arquivo `vercel.json` já manda qualquer endereço para o app. Assim, recarregar a página nunca dá erro 404.

**Plano da Vercel:** o plano gratuito (Hobby) é só para uso não comercial. Como o app será usado
para vender, avalie o plano Pro.

---

## 10. Avisar o Supabase sobre o endereço do site

Em **Authentication → URL Configuration**:

- **Site URL:** `https://vendasempreendedores.vercel.app` (o seu endereço da Vercel)
- **Redirect URLs** → **Add URL**:
  - `https://vendasempreendedores.vercel.app/**`
  - `http://localhost:5173/**`

Sem isso, o link de confirmação do e-mail leva para o endereço errado.

---

## 11. Instalar no celular como aplicativo

**Android (Chrome):** abra o site → menu **⋮** → **Instalar app** ou **Adicionar à tela inicial**.

**iPhone (Safari):** abra o site → botão **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início**.

O app abre em tela cheia, com o ícone vermelho e amarelo do Sabor & Lucro.

---

## 12. Teste final (faça nesta ordem)

- [ ] Criar conta com e-mail e senha (mínimo 6 caracteres). Se a confirmação estiver ligada, clicar no link do e-mail.
- [ ] Informar o nome do negócio e conferir os percentuais.
- [ ] **Ler nota:** tirar foto de um cupom real → conferir a lista → **Salvar nos meus ingredientes**.
- [ ] **Produtos → Cadastrar produto:** ao digitar o ingrediente, ele aparece na lista; escolher preenche o preço do pacote sozinho.
- [ ] Escolher um markup e conferir o preço inteiro e por porção → **Salvar produto**.
- [ ] **Vendas:** registrar uma venda por porção e uma inteira.
- [ ] **Início:** faturamento, custos, lucro e margem devem bater com as vendas.
- [ ] No Supabase, em **Table Editor → vendas**, as linhas devem aparecer com o `user_id` da conta.
- [ ] Criar uma **segunda conta** e confirmar que ela **não** vê nada da primeira.

---

## 13. Trocar o modelo da IA (opcional, para baratear)

Arquivo `supabase/functions/ler-cupom/index.ts`. Hoje está assim:

```ts
const resposta = await client.beta.messages.create({
  model: 'claude-opus-5-5',
  max_tokens: 8000,
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default',
  output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
```

Para usar o **Claude Haiku 5.5**, que custa cerca de 40 vezes menos por token, troque o modelo e **apague** as linhas
`betas` e `fallbacks` (esse recurso não existe no Haiku):

```ts
const resposta = await client.beta.messages.create({
  model: 'claude-haiku-5-5',
  max_tokens: 8000,
  output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
```

Publique de novo:

```bash
npx supabase functions deploy ler-cupom
```

Teste com notas reais, principalmente as escritas à mão. Se a leitura piorar, volte para o Opus.

---

## 14. Como atualizar depois

| O que mudou | O que fazer |
|---|---|
| Telas / código do app (`src/`) | `git add -A`, `git commit -m "..."` e `git push` na `main`. A Vercel publica sozinha. |
| Função de leitura (`supabase/functions/`) | `npx supabase functions deploy ler-cupom` |
| Banco (nova coluna, nova tabela) | Criar um **novo** arquivo em `supabase/migrations/` (nunca editar o antigo) e rodar `npx supabase db push` |
| Chave da IA | `npx supabase secrets set ANTHROPIC_API_KEY=nova-chave` (não precisa publicar de novo) |
| Variáveis da Vercel | Alterar no painel e fazer **Redeploy** |

---

## 15. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Site na Vercel mostra "demonstração" | Variáveis `VITE_` ausentes ou adicionadas depois do deploy | Conferir os nomes exatos no passo 9 e fazer **Redeploy** |
| "E-mail ou senha incorretos" logo após criar a conta | E-mail ainda não confirmado | Clicar no link do e-mail ou desligar **Confirm email** (passo 5) |
| Link do e-mail abre `localhost` | Site URL não configurada | Passo 10 |
| "Não consegui ler a foto" | Segredo ausente, sem créditos na Anthropic ou função não publicada | `npx supabase secrets list`; conferir Billing; ver **Edge Functions → ler-cupom → Logs** |
| Leitura retorna lista vazia | Foto escura, torta ou cortada | Nota esticada, com boa luz e enquadrada inteira |
| Erro `new row violates row-level security policy` | SQL do passo 4 incompleto | Rodar o arquivo de migração inteiro de novo (ele pode ser rodado mais de uma vez) |
| Câmera não abre | Site aberto sem `https` | Use o endereço da Vercel; no computador, `localhost` funciona |
| `npm run build` falha na Vercel | Versão antiga do Node | **Settings → General → Node.js Version** → 20.x ou 22.x |

---

## 16. Onde fica cada coisa no código

```
src/
  App.tsx                 navegação, login e carregamento dos dados
  index.css               todo o visual (cores, bordas, espaçamentos, fontes)
  lib/calc.ts             fórmulas: custo, percentuais de mercado, markups, arredondamento
  lib/db.ts               leitura/gravação (Supabase ou modo demonstração)
  lib/ocr.ts              envio da foto (Supabase) ou leitura no aparelho (Tesseract)
  lib/supabase.ts         conexão com o Supabase usando as variáveis VITE_
  components/Layout.tsx   topo, barra inferior, campos de dinheiro
  components/Percentuais.tsx  editor de mão de obra, gás, luz, água, embalagens
  pages/BoasVindas.tsx    primeiro acesso
  pages/Login.tsx         entrar / criar conta
  pages/Painel.tsx        dashboard
  pages/Produtos.tsx      lista e ficha de custo do produto
  pages/Escanear.tsx      leitura de nota
  pages/Vendas.tsx        registro de vendas
  pages/Ajustes.tsx       nome, percentuais, ingredientes salvos, sair
supabase/
  config.toml                         configuração da função (exige login)
  migrations/20261113000000_inicial.sql   tabelas + segurança
  functions/ler-cupom/index.ts        função da IA
public/
  icone.svg, manifest.webmanifest     ícone e instalação no celular
vercel.json                           redireciona rotas para o app
.env.example                          modelo das variáveis
```

### Mudar os percentuais padrão de mercado

`src/lib/calc.ts`:

```ts
export const PADROES_MERCADO = {
  mao_obra_pct: 30,
  gas_pct: 5,
  luz_pct: 3,
  agua_pct: 2,
  embalagem_pct: 10,
}
```

Para quem já tem conta, os valores ficam salvos em **Ajustes** e não mudam com essa alteração.

### Mudar as opções de markup

`src/lib/calc.ts` → `MARKUPS` (valor, nome, descrição, emoji, `recomendado: true` para o selo).

### Mudar as cores

`src/index.css`, no topo do arquivo:

```css
--tomate: #e63946;     /* vermelho principal */
--mostarda: #f4a300;   /* amarelo */
--manjericao: #2a9d6f; /* verde (lucro) */
--chocolate: #3d2314;  /* bordas e textos fortes */
--creme: #fff8ec;      /* fundo */
```

### Fórmula do preço

```
custo dos ingredientes = soma de (preço do pacote ÷ tamanho do pacote × quantidade usada)
custos escondidos      = ingredientes × (mão de obra + gás + luz + água + embalagens) ÷ 100
custo total            = ingredientes + custos escondidos + (embalagem individual × rendimento)
custo por porção       = custo total ÷ rendimento
preço inteiro          = custo total × markup        (arredondado para cima em R$ 0,50)
preço por porção       = custo por porção × markup   (arredondado para cima em R$ 0,50)
margem                 = (preço − custo) ÷ preço
```
