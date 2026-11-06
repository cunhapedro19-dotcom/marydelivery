# Delícias do Barão — Cardápio Digital

Cardápio digital para delivery de quentinhas caseiras, baseado na arquitetura do Mary Delivery.

## Stack
- **Next.js 16** (App Router, Server Components)
- **Drizzle ORM** + **PostgreSQL** (Neon — região São Paulo `sa-east-1`)
- **Tailwind CSS 4** (tema customizado: creme/vinho/dourado/marrom)
- **TypeScript** estrito
- **PWA** (instalável no celular, offline básico)
- **Deploy**: Vercel + Neon

## Estrutura do projeto
```
delicias-do-barao/
├── src/
│   ├── app/                    # App Router (Next.js 16)
│   │   ├── [slug]/             # Cardápio público (home + pedido)
│   │   ├── admin/              # Painel administrativo
│   │   └── api/                # Rotas de API (pedidos, upload, imagens, health)
│   ├── components/
│   │   ├── admin/              # Componentes do painel
│   │   └── order/              # Componentes do fluxo de pedido (OrderBuilder, InstallApp)
│   ├── db/                     # Drizzle: schema, seed, conexão
│   └── lib/                    # Utilitários (auth, data, format, order, password)
├── public/
│   ├── sw-cardapio.js          # Service Worker do cardápio
│   └── sw.js                   # Service Worker do painel
├── supabase/
│   ├── schema.sql              # Schema idempotente (rodar no SQL Editor)
│   └── cardapio-real.sql       # Cardápio real (quentinhas + bebidas)
└── scripts/
    └── create-establishment.ts # Script para criar novos estabelecimentos
```

## Cores (tema Delícias do Barão)
| Uso | Cor | Hex |
|-----|-----|-----|
| Header/Navegação fundo | Creme | `#FDF6E3` |
| Header/Navegação texto | Vinho | `#7A0C1B` |
| Hero Section fundo | Vinho | `#7A0C1B` |
| Hero textos | Branco/Dourado | `#FFFFFF` / `#E5A823` |
| CTA WhatsApp | Dourado | `#E5A823` |
| Cards produtos | Branco | `#FFFFFF` |
| Borda cards | Vinho | `#7A0C1B` |
| Nomes pratos | Marrom Escuro | `#2B170B` |
| Preços | Vinho/Dourado | `#7A0C1B` / `#E5A823` |
| Footer fundo | Marrom Escuro | `#2B170B` |
| Footer textos | Creme/Branco | `#FDF6E3` / `#FFFFFF` |

## Cardápio
- **Quentinhas**: 12 proteínas × 2 tamanhos (M/G) = 24 opções
  - Base: arroz, feijão, farofa + proteína + até 3 acompanhamentos
  - Acompanhamentos: couve, salada, batata frita, farofa extra, vinagrete
  - Extras: ovo frito, bacon, queijo extra
- **Bebidas**: 21 opções (refrigerantes, água, guaraviton, guaravita, H2OH, limoneto)

## Como rodar localmente
```bash
# 1. Instalar dependências
npm install

# 2. Configurar .env (copie de .env.example)
cp .env.example .env
# Edite .env com sua DATABASE_URL do Neon (Pooled connection)
# Ex: postgresql://user:pass@ep-xxx.sa-east-1.aws.neon.tech/dbname?sslmode=require

# 3. Rodar schema no Neon SQL Editor
# Cole supabase/schema.sql → Run

# 4. Popular cardápio real (opcional)
# Cole supabase/cardapio-real.sql → Run

# 5. Desenvolvimento
npm run dev
# Acesse http://localhost:3000 → redireciona para /delicias-do-barao
# Painel: http://localhost:3000/admin (admin / barao-2026)
```

## Deploy (Vercel + Neon)
1. **Neon**: Crie projeto em São Paulo (`sa-east-1`) → Connection String → Pooled
2. **SQL Editor**: Rode `supabase/schema.sql` → Run
3. **GitHub**: `git init && git add . && git commit -m "init" && git push` (repo PRIVADO)
4. **Vercel**: Import repo → Environment Variables → `DATABASE_URL` (Neon Pooled, 3 ambientes) → Deploy
5. **Painel**: Acesse `/admin` → login → Configure WhatsApp, logo, hero, horários, endereço retirada → "REABRIR PEDIDOS"

> Detalhes completos: **DEPLOY.md**

## Comandos úteis
```bash
npm run dev       # Desenvolvimento
npm run build     # Build de produção (typecheck incluso)
npm run lint      # ESLint
npm run typecheck # tsc --noEmit
```

## Scripts
```bash
npx tsx scripts/create-establishment.ts  # Criar novo estabelecimento multi-tenant
```

## Checklist de produção (DEPLOY.md)
- [ ] Neon São Paulo (`sa-east-1`) + schema.sql rodado (RLS enabled)
- [ ] Repo GitHub privado + Vercel importado
- [ ] DATABASE_URL na Vercel (3 ambientes, Neon Pooled, senha real)
- [ ] WhatsApp cadastrado no painel (formato 55DD9XXXXXXXX)
- [ ] Logo + Hero cadastrados no painel
- [ ] Horários, dias, endereço de retirada, áreas de entrega
- [ ] Formas de pagamento ativas
- [ ] Cardápio real rodado (cardapio-real.sql) ou cadastrado no painel
- [ ] Fotos dos produtos subidas no painel (APÓS rodar SQL)
- [ ] "REABRIR PEDIDOS" no painel
- [ ] Testar pedido completo no celular (PWA instala)