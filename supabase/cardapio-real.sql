-- ═══════════════════════════════════════════════════════════════════════
-- Mary Delivery — cardápio REAL (lido do cardápio físico da casa)
--
-- Como usar: Supabase → SQL Editor → New query → cole TUDO daqui → Run.
--
-- O que ele faz:
--   1) Atualiza os dados do negócio (frase, horário, entrega, iFood);
--   2) Apaga o cardápio atual do Mary Delivery (produtos, adicionais e bebidas);
--   3) Insere o cardápio real: 22 produtos + 3 adicionais + 30 bebidas.
--
-- Pode rodar de novo sem duplicar: ele substitui o cardápio atual por este.
-- (Se você cadastrou bebida no painel manualmente, ela é substituída por esta lista.)
--
-- Fica de fora (o cardápio físico não mostra):
--   - dias de funcionamento e endereço de retirada — Configurações do painel.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- 1) Dados do negócio
update establishments set
  description          = 'A fome bateu? Chama a Mary!',
  opening_hours        = 'Aberto das 19h às 3h da manhã',
  delivery_areas       = 'Muriqui, Praia do Saco e Itacuruçá',
  app_delivery_enabled = true,
  app_delivery_service = 'iFood',
  updated_at           = now()
where slug = 'mary-delivery';

-- 2) Limpa o cardápio atual (produtos, adicionais e bebidas do Mary Delivery)
delete from meal_items
  where meal_id in (
    select id from meals
    where establishment_id = (select id from establishments where slug = 'mary-delivery')
  );
delete from meals
  where establishment_id = (select id from establishments where slug = 'mary-delivery');
delete from menu_items
  where establishment_id = (select id from establishments where slug = 'mary-delivery');

-- 3) Adicionais — "TURBINE SEU LANCHE" (valem pra todos os produtos)
insert into menu_items (establishment_id, category, name, price_cents, sort_order)
select e.id, 'extra', x.name, x.price, x.ord
from establishments e, (values
  ('Ovo',     200, 1),
  ('Bacon',   300, 2),
  ('Cheddar', 300, 3)
) as x(name, price, ord)
where e.slug = 'mary-delivery';

-- 4) Produtos do cardápio real, agrupados pelas seções do cardápio físico
--    (max_choices 0 = produto simples, sem escolha de proteína/acompanhamento)
insert into meals (establishment_id, name, category, description, price_cents,
                   sort_order, max_choices, allow_extras, allow_notes)
select e.id, m.name, m.category, m.description, m.price,
       m.ord, 0, m.extras, true
from establishments e, (values
  -- OS CAMPEÕES DA CASA
  ('Clássico da Mary',      'Campeões da casa', 'Suculento, queijo derretido, alface e tomate fresquinhos.',         1400, 1, true),
  ('Turbinado',             'Campeões da casa', 'Tudo isso + calabresa!',                                            2200, 2, true),
  ('Duplo Cheddar',         'Campeões da casa', 'Duas carnes + cheddar escorrendo.',                                 2500, 3, true),
  ('Hambúrguer de Picanha', 'Campeões da casa', 'Brioche, picanha 180g, cheddar derretido, alface, tomate e molho.', 2500, 4, true),
  -- LINHA X • TÁ NO PONTO
  ('X-Salada',              'Linha X', '', 1400, 1, true),
  ('X-Calabresa',           'Linha X', '', 1400, 2, true),
  ('X-Bacon',               'Linha X', '', 1500, 3, true),
  ('X-Tudo',                'Linha X', '', 1400, 4, true),
  ('X-Duplo',               'Linha X', '', 1700, 5, true),
  ('X-Triplo',              'Linha X', '', 2000, 6, true),
  ('X-Picanha',             'Linha X', '', 1800, 7, true),
  ('X-Egg',                 'Linha X', '', 1200, 8, true),
  ('Hambúrguer Simples',    'Linha X', '',  900, 9, true),
  -- COMBOS QUE COMPENSAM
  ('Combo Solteiro',        'Combos', 'Duplo Cheddar + Batata P + Guaravita 290ml', 3200, 1, false),
  ('Combo Casal',           'Combos', '2 Clássicos + Batata P + 2 Guaravitas',      3500, 2, false),
  ('Combo Família',         'Combos', '3 Turbinados + Batata G + Guaraná 1L',       7000, 3, false),
  -- PORÇÕES
  ('Nugget + Anel de Cebola', 'Porções', '', 2500, 1, false),
  ('Nugget + Batata',         'Porções', '', 2500, 2, false),
  ('Só Nugget',               'Porções', '', 1000, 3, false),
  -- BOXES DE FRANGO FRITO (pedaços são diferentes de tiras — nomes como no cardápio físico)
  ('Box com 10 tiras de filé de frango', 'Boxes', 'Tiras de filé de frango frito e crocante + molho especial', 2490, 1, false),
  ('Box Frango P (6 pedaços)',           'Boxes', '6 pedaços de frango frito crocante + um molho especial',     2490, 2, false),
  ('Box Frango M (12 pedaços)',          'Boxes', '12 pedaços de frango frito crocante + um molho especial',    4490, 3, false)
) as m(name, category, description, price, ord, extras)
where e.slug = 'mary-delivery';

-- 5) Bebidas da casa (o nome já leva o tamanho, pra não confundir na hora do pedido)
insert into menu_items (establishment_id, category, name, price_cents, sort_order)
select e.id, 'drink', x.name, x.price, x.ord
from establishments e, (values
  ('Coca-Cola Lata',           700, 1),
  ('Coca-Cola Zero Lata',      700, 2),
  ('Fanta Laranja Lata',       700, 3),
  ('Fanta Uva Lata',           700, 4),
  ('Guaraná Antártica Lata',   700, 5),
  ('Sprite Lata',              700, 6),
  ('Guaraviton Açaí 500ml',    600, 7),
  ('Guaraviton Natural 500ml', 600, 8),
  ('Guaravita 290ml',          400, 9),
  ('H2O de Limão 500ml',       800, 10),
  ('H2O de Limoneto 500ml',    800, 11),
  ('Guaraná Antártica 1L',     900, 12),
  ('Convenção de Uva 2L',     1100, 13),
  ('Convenção de Limão 2L',   1100, 14),
  ('Convenção de Guaraná',    1100, 15),
  ('Sprite 2L',               1500, 16),
  ('Fanta Laranja 2L',        1500, 17),
  ('Fanta Uva 2L',            1500, 18),
  ('Coca-Cola 2L',            2000, 19),
  ('Coca-Cola Zero 2L',       2000, 20),
  -- Sucos (300ml; "ao leite" leva o leite no nome, os outros são naturais)
  ('Maracujá ao leite 300ml',  1000, 21),
  ('Morango ao leite 300ml',   1000, 22),
  ('Acerola 300ml',             700, 23),
  ('Laranja 300ml',             700, 24),
  ('Maracujá 300ml',            700, 25),
  ('Morango 300ml',             700, 26),
  ('Abacaxi 300ml',             700, 27),
  ('Abacaxi com Hortelã 300ml', 700, 28),
  ('Manga 300ml',               700, 29),
  ('Goiaba 300ml',              700, 30)
) as x(name, price, ord)
where e.slug = 'mary-delivery';

commit;

-- Confere o resultado: deve listar os 22 produtos com os preços
select category, name, price_cents / 100.0 as preco
from meals
where establishment_id = (select id from establishments where slug = 'mary-delivery')
order by category, sort_order;

-- ...e os 33 adicionais + bebidas
select category, name, price_cents / 100.0 as preco
from menu_items
where establishment_id = (select id from establishments where slug = 'mary-delivery')
order by category, sort_order;
