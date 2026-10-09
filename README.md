# 🍔 Mary Delivery — cardápio digital com pedidos pelo WhatsApp

Cardápio do delivery de lanches **Mary Delivery**: o cliente monta o pedido passo a
passo no celular e, no final, o WhatsApp abre com o pedido preenchido para o número
da loja — ele mesmo toca em enviar.

- **Cardápio do cliente**: `SEU-LINK/mary-delivery` (a raiz `/` também abre lá).
- **Painel administrativo**: `SEU-LINK/admin` — instalável como aplicativo (PWA).
- **Acesso inicial do painel**: usuário `admin` · senha `mary-lanches-2026`
  (**troque em Configurações → Meu acesso**; o painel avisa até você trocar).

O sistema **não envia mensagens automaticamente** e **não calcula taxa de entrega** —
quando há entrega, o valor é combinado pelo WhatsApp com o cliente.

## Fluxo do cliente

**produto → personalização → carrinho → bebida → recebimento (retirada/entrega) →
dados/endereço → pagamento → observações → revisão → enviar pelo WhatsApp**

## O que o painel controla (tudo pelo celular)

- **Cardápio → Produtos**: nome, categoria, descrição, preço, foto, disponibilidade e
  composição (itens inclusos, proteína à escolha, acompanhamentos à escolha com limite,
  adicionais e observações liberados). Para uma lanchonete basta cadastrar os lanches
  como produtos simples, os adicionais (bacon, ovo...) e as bebidas.
- **Cardápio → Adicionais e Bebidas**: os itens extras que valem para todos os produtos;
  bebida opcional ou obrigatória.
- **Pedidos**: lista dos pedidos enviados pelo cardápio (registrados quando o cliente
  toca em "Enviar pelo WhatsApp"), com o texto completo, botão para falar com o cliente
  e marcação de atendido.
- **Configurações**: dados do negócio (nome, ícone, logo, imagem principal, endereço do
  link), **WhatsApp que recebe os pedidos** (com botão Testar WhatsApp — sem um número
  válido o cardápio não é publicado), entrega (retirada no local, entrega própria,
  entrega por aplicativo), pagamentos (Pix, dinheiro com pergunta de troco, cartão...)
  e horários.
- **Pausar / reabrir pedidos** com um toque na tela inicial.

## Como colocar no ar

O site roda na **Vercel** com banco **Supabase**. O passo a passo completo (criar o
projeto no Supabase, criar as tabelas, subir para um repositório privado no GitHub e
publicar na Vercel) está no **[DEPLOY.md](DEPLOY.md)**.

Na primeira visita a um banco vazio, o site cria sozinho o Mary Delivery, um cardápio
de exemplo e o acesso ao painel — e nasce **pausado** até você montar o cardápio real
e clicar em **REABRIR PEDIDOS**.

## Rodar localmente (opcional)

```bash
npm install
npx drizzle-kit push      # cria as tabelas (ou rode supabase/schema.sql no Supabase)
npm run dev
```

Variáveis: `DATABASE_URL` (obrigatória; no Supabase use a string da aba *Connection
pooling* — veja o `.env.example`) e, opcionais, `ADMIN_PASSWORD` (senha inicial do
painel) e `DEFAULT_ESTABLISHMENT_SLUG`.

## Tecnologia

- Next.js (App Router) + React 19, Tailwind CSS 4, PostgreSQL com Drizzle ORM
- Autenticação própria: sessões no banco, cookie httpOnly, senhas com scrypt
- Fotos guardadas no banco (limite de 4 MB por upload, redimensionadas no navegador)
- PWA do painel: `public/admin-manifest.webmanifest` + `public/sw.js`

## Uso avançado

O sistema suporta mais de um estabelecimento no mesmo banco de dados (cada um com seu
link `/<endereco>` e seu próprio painel), mas o Mary Delivery usa apenas um. Para criar
outro no futuro:

```bash
npx tsx scripts/create-establishment.ts --nome "Pizzaria Bella" --usuario admin --senha minhasenha \
  --slug pizzaria-bella --whatsapp "(21) 99999-9999" --emoji 🍕
```
