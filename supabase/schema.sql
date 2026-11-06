-- ═══════════════════════════════════════════════════════════════════════
-- Delícias do Barão — Schema do banco (idempotente)
-- Rode no SQL Editor do Supabase (clique em "Run and enable RLS" quando aparecer)
-- ═══════════════════════════════════════════════════════════════════════

-- Extensão para UUIDs
create extension if not exists "pgcrypto";

-- 1) Estabelecimentos
create table if not exists establishments (
  id serial primary key,
  slug text not null unique,
  name text not null default 'Meu Cardápio',
  emoji text not null default '🍲',
  description text not null default '',
  logo_url text,
  hero_url text,
  whatsapp_number text not null default '',
  whatsapp_greeting text not null default 'Olá! Gostaria de fazer um pedido pelo cardápio.',
  opening_hours text not null default '',
  opening_days text not null default '',
  accepting_orders boolean not null default true,
  paused_message text not null default 'Voltamos em breve!',
  drink_required boolean not null default false,
  pickup_enabled boolean not null default true,
  pickup_address text not null default '',
  pickup_hours text not null default '',
  own_delivery_enabled boolean not null default true,
  app_delivery_enabled boolean not null default false,
  app_delivery_service text not null default '',
  delivery_areas text not null default '',
  delivery_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Itens do cardápio (proteínas, acompanhamentos, adicionais, bebidas)
create table if not exists menu_items (
  id serial primary key,
  establishment_id integer not null references establishments(id) on delete cascade,
  category text not null check (category in ('protein','side','extra','drink')),
  name text not null,
  description text not null default '',
  price_cents integer not null default 0,
  image_url text,
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3) Produtos/Refeições (quentinhas, lanches, porções...)
create table if not exists meals (
  id serial primary key,
  establishment_id integer not null references establishments(id) on delete cascade,
  name text not null,
  category text not null default '',
  description text not null default '',
  price_cents integer not null default 0,
  image_url text,
  available boolean not null default true,
  sort_order integer not null default 0,
  max_choices integer not null default 2,
  allow_extras boolean not null default true,
  allow_notes boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4) Composição dos produtos (o que vem incluso, proteínas, acompanhamentos opcionais)
create table if not exists meal_items (
  meal_id integer not null references meals(id) on delete cascade,
  item_id integer not null references menu_items(id) on delete cascade,
  role text not null check (role in ('included','protein','choice')),
  primary key (meal_id, item_id)
);

-- 5) Formas de pagamento
create table if not exists payment_methods (
  id serial primary key,
  establishment_id integer not null references establishments(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  asks_change boolean not null default false,
  sort_order integer not null default 0
);

-- 6) Pedidos
create table if not exists orders (
  id serial primary key,
  establishment_id integer not null references establishments(id) on delete cascade,
  customer_name text not null default '',
  customer_phone text not null default '',
  receiving_mode text not null check (receiving_mode in ('pickup','own','app')),
  payment_name text not null default '',
  subtotal_cents integer not null default 0,
  summary text not null default '',
  message text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- 7) Usuários admin
create table if not exists admin_users (
  id serial primary key,
  establishment_id integer not null references establishments(id) on delete cascade,
  username text not null unique,
  email text unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- 8) Sessões
create table if not exists sessions (
  token text primary key,
  user_id integer not null references admin_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 9) Imagens (binárias no banco)
create table if not exists images (
  id text primary key,
  establishment_id integer references establishments(id) on delete set null,
  mime_type text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

-- Índices úteis
create index if not exists idx_menu_items_est_cat on menu_items(establishment_id, category);
create index if not exists idx_meals_est_cat on meals(establishment_id, category);
create index if not exists idx_orders_est_created on orders(establishment_id, created_at desc);
create index if not exists idx_images_est on images(establishment_id);

-- RLS (Row Level Security) — ligamos mas sem políticas: o app conecta como postgres (dono)
-- e ignora RLS; a anon key fica deny-all = proteção extra pro PII dos pedidos.
alter table establishments enable row level security;
alter table menu_items enable row level security;
alter table meals enable row level security;
alter table meal_items enable row level security;
alter table payment_methods enable row level security;
alter table orders enable row level security;
alter table admin_users enable row level security;
alter table sessions enable row level security;
alter table images enable row level security;