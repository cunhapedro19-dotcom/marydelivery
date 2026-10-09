-- ═══════════════════════════════════════════════════════════════════════
-- Mary Delivery — criação das tabelas no Supabase
--
-- Como usar: Supabase → SQL Editor → New query → cole TUDO daqui → Run.
-- Pode rodar mais de uma vez sem erro (é idempotente: "if not exists").
--
-- Este SQL é a cópia exata do src/db/schema.ts (Drizzle). Se o schema.ts
-- mudar um dia, este arquivo precisa ser atualizado junto.
-- ═══════════════════════════════════════════════════════════════════════
-- Nota de segurança: as tabelas nascem com RLS LIGADA e sem políticas.
-- O site conecta apenas com a credencial do postgres (DATABASE_URL,
-- guardada na Vercel) — e o dono das tabelas (postgres) não é afetado
-- pelo RLS, então tudo funciona normalmente. A chave anônima do Supabase
-- fica 100% bloqueada (sem políticas = ninguém lê os pedidos dos clientes
-- pela API pública, mesmo descobrindo as chaves do projeto). O painel tem
-- autenticação própria (sessões + senhas com scrypt) no nível do app.
-- ═══════════════════════════════════════════════════════════════════════

-- 1) O negócio: nome, WhatsApp que recebe os pedidos, horários, entrega...
create table if not exists establishments (
  id                    serial primary key,
  slug                  text not null unique,
  name                  text not null default 'Meu Cardápio',
  emoji                 text not null default '🍲',
  description           text not null default '',
  logo_url              text,
  hero_url              text,
  whatsapp_number       text not null default '',
  whatsapp_greeting     text not null default 'Olá! Gostaria de fazer um pedido pelo cardápio.',
  opening_hours         text not null default '',
  opening_days          text not null default '',
  accepting_orders      boolean not null default true,
  paused_message        text not null default '',
  drink_required        boolean not null default false,
  pickup_enabled        boolean not null default true,
  pickup_address        text not null default '',
  pickup_hours          text not null default '',
  own_delivery_enabled  boolean not null default true,
  app_delivery_enabled  boolean not null default false,
  app_delivery_service  text not null default '',
  delivery_areas        text not null default '',
  delivery_notes        text not null default '',
  created_at            timestamp not null default now(),
  updated_at            timestamp not null default now()
);

-- 2) Itens do cardápio: proteínas, acompanhamentos, adicionais e bebidas
create table if not exists menu_items (
  id               serial primary key,
  establishment_id integer not null references establishments(id) on delete cascade,
  category         text not null,
  name             text not null,
  description      text not null default '',
  price_cents      integer not null default 0,
  image_url        text,
  available        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamp not null default now()
);

-- 3) Produtos (lanches, porções, refeições...). Cada um com sua composição
create table if not exists meals (
  id               serial primary key,
  establishment_id integer not null references establishments(id) on delete cascade,
  name             text not null,
  category         text not null default '',
  description      text not null default '',
  price_cents      integer not null default 0,
  image_url        text,
  available        boolean not null default true,
  sort_order       integer not null default 0,
  max_choices      integer not null default 2,
  allow_extras     boolean not null default true,
  allow_notes      boolean not null default true,
  created_at       timestamp not null default now()
);

-- 4) Composição de cada produto (o que vem incluso, proteína à escolha,
--    acompanhamentos opcionais). Um item só aparece uma vez por produto.
create table if not exists meal_items (
  meal_id integer not null references meals(id) on delete cascade,
  item_id integer not null references menu_items(id) on delete cascade,
  role    text not null,
  primary key (meal_id, item_id)
);

-- 5) Formas de pagamento aceitas
create table if not exists payment_methods (
  id               serial primary key,
  establishment_id integer not null references establishments(id) on delete cascade,
  name             text not null,
  active           boolean not null default true,
  asks_change      boolean not null default false,
  sort_order       integer not null default 0
);

-- 6) Pedidos registrados quando o cliente toca em "Enviar pelo WhatsApp"
create table if not exists orders (
  id               serial primary key,
  establishment_id integer not null references establishments(id) on delete cascade,
  customer_name    text not null default '',
  customer_phone   text not null default '',
  receiving_mode   text not null,
  payment_name     text not null default '',
  subtotal_cents   integer not null default 0,
  summary          text not null default '',
  message          text not null default '',
  done             boolean not null default false,
  created_at       timestamp not null default now()
);

-- 7) Acessos ao painel: usuário (obrigatório) + e-mail (opcional)
--    senha guardada como scrypt (salt:hash), nunca em texto puro
create table if not exists admin_users (
  id               serial primary key,
  establishment_id integer not null references establishments(id) on delete cascade,
  username         text not null unique,
  email            text unique,
  password_hash    text not null,
  created_at       timestamp not null default now()
);

-- 8) Sessões de login do painel (cookie httpOnly aponta para cá)
create table if not exists sessions (
  token      text primary key,
  user_id    integer not null references admin_users(id) on delete cascade,
  expires_at timestamp not null,
  created_at timestamp not null default now()
);

-- 9) Fotos enviadas pelo painel (produtos, logo, imagem principal)
create table if not exists images (
  id               text primary key,
  establishment_id integer references establishments(id) on delete set null,
  mime_type        text not null,
  data             bytea not null,
  created_at       timestamp not null default now()
);

-- Liga o RLS em todas as tabelas (sem políticas = bloqueio total para a
-- chave anônima; o site conecta como postgres/dono e não é afetado).
-- Se as tabelas já existirem com RLS ligada, rodar de novo não faz nada.
alter table if exists establishments  enable row level security;
alter table if exists menu_items      enable row level security;
alter table if exists meals           enable row level security;
alter table if exists meal_items      enable row level security;
alter table if exists payment_methods enable row level security;
alter table if exists orders          enable row level security;
alter table if exists admin_users     enable row level security;
alter table if exists sessions        enable row level security;
alter table if exists images          enable row level security;

-- Confere o resultado: deve listar as 9 tabelas
select table_name
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;
