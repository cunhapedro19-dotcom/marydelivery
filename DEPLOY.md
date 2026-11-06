# Deploy — Delícias do Barão (Vercel + Neon)

Passo a passo para colocar o cardápio no ar. **Leia tudo antes de começar.**

> **Banco**: Este guia usa **Neon (PostgreSQL)** — região São Paulo.  
> Se preferir Supabase, veja a seção "Alternativa: Supabase" no final.

---

## 1. Neon (Banco de Dados)

1. Acesse [neon.tech](https://neon.tech) → **Sign up** (GitHub/Google/Email)
2. **Create Project**
   - Name: `delicias-do-barao`
   - Region: **AWS Asia Pacific (São Paulo) `sa-east-1`** — *obrigatório para baixa latência*
   - PostgreSQL version: 16 (padrão)
   - Compute: **Serverless** (scale to zero) ou **Fixed** (sempre ligado)
3. **Create project** → aguarda ~30s

### 1.1 Connection String
No dashboard do Neon:
- **Connection String** (topo da página) → clique para copiar
- Escolha **Pooled (recomendado p/ serverless/Vercel)** ou **Direct**
- A string já vem com `sslmode=require` ✅
- Formato: `postgresql://user:pass@ep-xxx.sa-east-1.aws.neon.tech/dbname?sslmode=require`
- **Guarde essa string** — vai na `DATABASE_URL` da Vercel

### 1.2 Schema
- No Neon: **SQL Editor** (menu lateral) → **New Query**
- Cole **TODO** o conteúdo de `supabase/schema.sql`
- **Run** → tabelas criadas com RLS habilitado (sem políticas = app ignora, anon = deny-all)
- Confirme: `select * from establishments;` → 0 linhas (seed cria na 1ª execução)

---

## 2. GitHub (Repo Privado)

```bash
cd delicias-do-barao
git init
git add .
git commit -m "init: Delícias do Barão cardápio digital"
# Crie repo PRIVADO no GitHub (Settings → General → Danger Zone → Make private)
git remote add origin https://github.com/SEU_USUARIO/delicias-do-barao.git
git push -u origin main
```

> **Repo privado é obrigatório** — o código tem lógica de negócio e o `.env.example` mostra a estrutura da DATABASE_URL.

---

## 3. Vercel (Deploy)

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → **Import Git Repository**
2. Selecione o repo `delicias-do-barao` (Private)
3. **Framework Preset**: Next.js (detecta automático)
4. **Environment Variables** (⚠️ **FAÇA AGORA**, antes do primeiro deploy):
   - **Name**: `DATABASE_URL`
   - **Value**: a **Connection String do Neon (Pooled)** do passo 1.1
     - Ex.: `postgresql://user:pass@ep-xxx.sa-east-1.aws.neon.tech/dbname?sslmode=require`
     - **Sem aspas, sem espaços, senha real**
   - **Environments**: **Production, Preview, Development** (marque os 3)
5. **Deploy**

### 3.1 Se o 1º build falhar com "DATABASE_URL is required"
- Settings → Environment Variables → confira se `DATABASE_URL` está nos 3 ambientes
- Deployments → ⋯ (três pontos) → **Redeploy**

### 3.2 Neon: Cold Start / Scale to Zero
- O Neon **dorme após 5 min sem uso** (plano free). Primeira requisição acorda (~1-3s).
- O `db/index.ts` já tem `max: 1` no pool — **evita exaustão de conexões** no serverless.
- Se quiser evitar cold start no free tier: painel Neon → Project Settings → **Auto-suspend: Never** (vira paid) OU use cron externo pra "pingar" a cada 5 min.

---

## 4. Configuração no Painel (Pós-deploy)

Acesse `https://SEU-DOMINIO.vercel.app/admin` → login:
- Usuário: `admin`
- Senha: `barao-2026` (troque em Configurações → Meu acesso)

### 4.1 Configurações → Negócio
- ✅ Nome, descrição, emoji (🍲)
- ✅ **WhatsApp** (formato internacional só dígitos: `5521999999999`)
- ✅ **Logo** (upload da `logo.jpeg` que você tem)
- ✅ **Hero** (foto de fundo opcional — se não tiver, usa poster com logo/emoji)
- Salvar

### 4.2 Configurações → Horários
- Dias de funcionamento: `Segunda a Sábado`
- Horário: `Aberto das 11h às 14h e das 18h às 22h`
- Endereço de retirada: `Rua Exemplo, 123 - Centro`
- Horário de retirada: `11h às 14h e 18h às 22h`
- Salvar

### 4.3 Configurações → Entrega
- ✅ Retirada no local (habilitado)
- ✅ Entrega própria (habilitado) — valor combinado pelo WhatsApp
- Áreas de atendimento: `Centro, Bairro Novo, Vila Rica`
- Observações de entrega: `Taxa a combinar conforme distância`
- Salvar

### 4.4 Configurações → Pagamentos
- ✅ Pix (ordem 1)
- ✅ Dinheiro (pede troco, ordem 2)
- ✅ Cartão (ordem 3)
- Salvar

### 4.5 Cardápio → Produtos
**Opção A (recomendada): SQL direto**
- Neon → SQL Editor → New Query
- Cole `supabase/cardapio-real.sql` → Run
- **IMPORTANTE**: Rode **ANTES** de subir fotos! (O SQL apaga e recria products → fotos seriam perdidas)

**Opção B: Painel manual**
- Cardápio → Produtos → Novo
- Cadastre quentinhas (M/G), acompanhamentos, extras, bebidas

### 4.6 Fotos dos produtos (APENAS DEPOIS do SQL)
- Cardápio → Produtos → clique em cada quentinha → Imagem → Escolher foto → Salvar
- Aparece sozinha no cardápio (foto grande h-44)

### 4.7 REABRIR PEDIDOS
- Painel inicial → botão verde **"REABRIR PEDIDOS"**
- O cardápio nasce pausado (seed). Só abre quando você clicar.

---

## 5. Testes Finais

1. Abra `https://SEU-DOMINIO.vercel.app` no celular
2. Deve redirecionar para `/delicias-do-barao`
3. Hero com logo/vinho/dourado → "Pedir pelo WhatsApp" (botão dourado)
4. Navegue: quentinhas → escolha acompanhamentos → bebidas → recebimento → dados → pagamento → revisão
5. **Botão "Enviar pedido pelo WhatsApp"** (verde) → abre WhatsApp preenchido
6. **PWA**: Chrome Android → menu ⋮ → "Instalar aplicativo" / iPhone → Compartilhar → "Adicionar à Tela de Início"
7. Painel `/admin` → pedidos aparecem na lista

---

## 6. Problemas Comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Build falha "DATABASE_URL is required" | Env var não salva ou typo | Settings → Env Vars → conferir os 3 ambientes → Redeploy |
| 500 "This page couldn't load" | Conexão falhou / cold start | Verifique `DATABASE_URL` na Vercel; aguarde 3s e recarregue (Neon acorda) |
| WhatsApp não abre | Número inválido no painel | Formato: `55` + `DDD` + `9` + `8 dígitos` = 13 dígitos |
| Fotos não aparecem | Subiu antes do SQL | Rode `cardapio-real.sql` → **depois** suba fotos no painel |
| "Sem cadastro" no rodapé | Normal — não exige login | É só informativo; pedido vai pro WhatsApp |
| Erro de conexão intermitente | Pool exaurido (serverless) | `db/index.ts` já usa `max: 1`; se persistir, use Pooled connection do Neon |

---

## 7. Atualizações Futuras

```bash
# Mudança no código
git add .
git commit -m "descrição da mudança"
git push
# Vercel faz deploy automático

# Mudança no cardápio (produtos/preços)
# Opção 1: Painel → Cardápio → edite
# Opção 2: Rode cardapio-real.sql atualizado no Neon SQL Editor (apaga e recria)
```

**Vantagem Neon**: cada PR no GitHub cria um **branch de preview automático** com banco isolado — teste alterações de cardápio sem afetar produção.

---

## 8. Checklist Rápido (copie para seu controle)

- [ ] Neon projeto criado (região São Paulo `sa-east-1`)
- [ ] Connection String (Pooled) copiada
- [ ] `schema.sql` rodado no Neon SQL Editor
- [ ] Repo GitHub privado + push
- [ ] Vercel importado + `DATABASE_URL` nos 3 ambientes
- [ ] 1º deploy OK (ou Redeploy após env var)
- [ ] Login admin / `barao-2026` funcionando
- [ ] WhatsApp cadastrado (`55DD9XXXXXXXX`)
- [ ] Logo + Hero upados
- [ ] Horários, dias, endereço retirada preenchidos
- [ ] Entrega própria + áreas configuradas
- [ ] Pagamentos ativos
- [ ] `cardapio-real.sql` rodado (ANTES das fotos)
- [ ] Fotos dos produtos upadas no painel
- [ ] **REABRIR PEDIDOS** clicado
- [ ] Teste completo no celular (PWA instala)
- [ ] Pedido aparece no painel `/admin/pedidos`

---

## Alternativa: Supabase (se preferir)

Se quiser usar Supabase em vez do Neon, as diferenças são:

1. **Supabase → Settings → Database → Connection pooling → Transaction (porta 6543)**
   - URI: `postgresql://postgres:SENHA@db.xxx.supabase.co:6543/postgres?pgbouncer=true`
2. **SQL Editor → "Run and enable RLS"** (diálogo aparece automaticamente)
3. **Senha com `@` quebra a string** → resetar pra senha só letras/números se der 500
4. Não tem branch de preview nativo

O resto (Vercel, painel, cardápio, PWA) é **idêntico**.