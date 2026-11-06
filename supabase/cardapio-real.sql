-- ═══════════════════════════════════════════════════════════════════════
-- Delícias do Barão — cardápio REAL (quentinhas + bebidas)
-- Como usar: Supabase → SQL Editor → New query → cole TUDO daqui → Run.
-- O que ele faz:
--   1) Atualiza os dados do negócio
--   2) Apaga o cardápio atual do Delícias do Barão
--   3) Insere o cardápio real: quentinhas (M/G) + bebidas
-- Pode rodar de novo sem duplicar: substitui o cardápio atual por este.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- 1) Dados do negócio
update establishments set
  description          = 'Quentinhas caseiras com sabor de casa.',
  opening_hours        = 'Aberto das 11h às 14h e das 18h às 22h',
  opening_days         = 'Segunda a Sábado',
  delivery_areas       = 'Centro, Bairro Novo, Vila Rica',
  own_delivery_enabled = true,
  app_delivery_enabled = false,
  updated_at           = now()
where slug = 'delicias-do-barao';

-- 2) Limpa o cardápio atual (produtos, adicionais e bebidas)
delete from meal_items
  where meal_id in (
    select id from meals
    where establishment_id = (select id from establishments where slug = 'delicias-do-barao')
  );
delete from meals
  where establishment_id = (select id from establishments where slug = 'delicias-do-barao');
delete from menu_items
  where establishment_id = (select id from establishments where slug = 'delicias-do-barao');

-- 3) Adicionais (extras que valem para todas as quentinhas)
insert into menu_items (establishment_id, category, name, price_cents, sort_order)
select e.id, 'extra', x.name, x.price, x.ord
from establishments e, (values
  ('Ovo frito',     200, 1),
  ('Bacon',         300, 2),
  ('Queijo extra',  200, 3)
) as x(name, price, ord)
where e.slug = 'delicias-do-barao';

-- 4) Bebidas
insert into menu_items (establishment_id, category, name, price_cents, sort_order)
select e.id, 'drink', x.name, x.price, x.ord
from establishments e, (values
  ('Coca-Cola 2L (normal)',      1700, 1),
  ('Coca-Cola 2L (zero)',        1700, 2),
  ('Coca-Cola lata (normal)',     800, 3),
  ('Coca-Cola lata (zero)',       800, 4),
  ('Água 500 ml',                 400, 5),
  ('Água com gás',                500, 6),
  ('Guaraviton',                  700, 7),
  ('Guaravita',                   300, 8),
  ('Fanta uva lata',              700, 9),
  ('Fanta laranja lata',          700, 10),
  ('Guaraná lata',                700, 11),
  ('Guaraná 1 litro',            1200, 12),
  ('Guaraná 2 litros',           1600, 13),
  ('Fanta uva 2 litros',         1600, 14),
  ('Fanta laranja 2 litros',     1600, 15),
  ('Coca-Cola 600 ml (normal)',   900, 16),
  ('Coca-Cola 600 ml (zero)',     900, 17),
  ('Fanta laranja 600 ml',        900, 18),
  ('Fanta uva 600 ml',            900, 19),
  ('H2OH! 500 ml',                800, 20),
  ('Limoneto',                    800, 21)
) as x(name, price, ord)
where e.slug = 'delicias-do-barao';

-- 5) Quentinhas — base: arroz, feijão, farofa + proteína + 2/3 acompanhamentos
-- As quentinhas são produtos (meals) com escolhas de acompanhamentos (sides)
-- Acompanhamentos disponíveis (sides): couve, salada, fritas, etc.
insert into menu_items (establishment_id, category, name, price_cents, sort_order)
select e.id, 'side', x.name, x.price, x.ord
from establishments e, (values
  ('Couve refogada',     0, 1),
  ('Salada verde',       0, 2),
  ('Batata frita',       0, 3),
  ('Farofa extra',       0, 4),
  ('Vinagrete',          0, 5)
) as x(name, price, ord)
where e.slug = 'delicias-do-barao';

-- Proteínas (cada quentinha tem uma proteína fixa — a quentinha é o produto)
-- Como as quentinhas já vêm com a proteína definida, não usamos 'protein' role
-- O cliente escolhe a quentinha (produto) e depois os acompanhamentos (sides)

-- Produtos: Quentinhas M e G
insert into meals (establishment_id, name, category, description, price_cents,
                   sort_order, max_choices, allow_extras, allow_notes)
select e.id, m.name, m.category, m.description, m.price,
       m.ord, 3, true, true  -- max_choices=3 (até 3 acompanhamentos)
from establishments e, (values
  -- Grelhado
  ('Quentinha Grelhado M',       'Quentinhas', 'Arroz, feijão, farofa + grelhado + até 3 acompanhamentos', 2000, 1),
  ('Quentinha Grelhado G',       'Quentinhas', 'Arroz, feijão, farofa + grelhado + até 3 acompanhamentos (porção grande)', 2200, 2),
  -- Frango à Milanesa
  ('Quentinha Frango à Milanesa M', 'Quentinhas', 'Arroz, feijão, farofa + frango à milanesa + até 3 acompanhamentos', 2000, 3),
  ('Quentinha Frango à Milanesa G', 'Quentinhas', 'Arroz, feijão, farofa + frango à milanesa + até 3 acompanhamentos (porção grande)', 2200, 4),
  -- Linguiça de Churrasco com Ovo
  ('Quentinha Linguiça c/ Ovo M', 'Quentinhas', 'Arroz, feijão, farofa + linguiça de churrasco com ovo + até 3 acompanhamentos', 2000, 5),
  ('Quentinha Linguiça c/ Ovo G', 'Quentinhas', 'Arroz, feijão, farofa + linguiça de churrasco com ovo + até 3 acompanhamentos (porção grande)', 2200, 6),
  -- Fígado Acebolado
  ('Quentinha Fígado Acebolado M', 'Quentinhas', 'Arroz, feijão, farofa + fígado acebolado + até 3 acompanhamentos', 2000, 7),
  ('Quentinha Fígado Acebolado G', 'Quentinhas', 'Arroz, feijão, farofa + fígado acebolado + até 3 acompanhamentos (porção grande)', 2200, 8),
  -- Carré com Couve
  ('Quentinha Carré com Couve M', 'Quentinhas', 'Arroz, feijão, farofa + carré com couve + até 3 acompanhamentos', 2200, 9),
  ('Quentinha Carré com Couve G', 'Quentinhas', 'Arroz, feijão, farofa + carré com couve + até 3 acompanhamentos (porção grande)', 2400, 10),
  -- Frango à Parmegiana
  ('Quentinha Frango à Parmegiana M', 'Quentinhas', 'Arroz, feijão, farofa + frango à parmegiana + até 3 acompanhamentos', 2400, 11),
  ('Quentinha Frango à Parmegiana G', 'Quentinhas', 'Arroz, feijão, farofa + frango à parmegiana + até 3 acompanhamentos (porção grande)', 2600, 12),
  -- Bife com Fritas
  ('Quentinha Bife com Fritas M', 'Quentinhas', 'Arroz, feijão, farofa + bife com fritas + até 3 acompanhamentos', 2500, 13),
  ('Quentinha Bife com Fritas G', 'Quentinhas', 'Arroz, feijão, farofa + bife com fritas + até 3 acompanhamentos (porção grande)', 2700, 14),
  -- Peixe ao Molho de Camarão
  ('Quentinha Peixe c/ Camarão M', 'Quentinhas', 'Arroz, feijão, farofa + peixe ao molho de camarão + até 3 acompanhamentos', 2500, 15),
  ('Quentinha Peixe c/ Camarão G', 'Quentinhas', 'Arroz, feijão, farofa + peixe ao molho de camarão + até 3 acompanhamentos (porção grande)', 2700, 16),
  -- Contrafilé à Milanesa
  ('Quentinha Contrafilé Milanesa M', 'Quentinhas', 'Arroz, feijão, farofa + contrafilé à milanesa + até 3 acompanhamentos', 2600, 17),
  ('Quentinha Contrafilé Milanesa G', 'Quentinhas', 'Arroz, feijão, farofa + contrafilé à milanesa + até 3 acompanhamentos (porção grande)', 2800, 18),
  -- Contrafilé à Parmegiana
  ('Quentinha Contrafilé Parmegiana M', 'Quentinhas', 'Arroz, feijão, farofa + contrafilé à parmegiana + até 3 acompanhamentos', 2700, 19),
  ('Quentinha Contrafilé Parmegiana G', 'Quentinhas', 'Arroz, feijão, farofa + contrafilé à parmegiana + até 3 acompanhamentos (porção grande)', 2900, 20),
  -- Grelhado à Parmegiana (NOVO)
  ('Quentinha Grelhado Parmegiana M', 'Quentinhas', 'Arroz, feijão, farofa + grelhado à parmegiana + até 3 acompanhamentos', 2400, 21),
  ('Quentinha Grelhado Parmegiana G', 'Quentinhas', 'Arroz, feijão, farofa + grelhado à parmegiana + até 3 acompanhamentos (porção grande)', 2900, 22),
  -- Bife Grelhado à Parmegiana (NOVO)
  ('Quentinha Bife Grelhado Parmegiana M', 'Quentinhas', 'Arroz, feijão, farofa + bife grelhado à parmegiana + até 3 acompanhamentos', 2700, 23),
  ('Quentinha Bife Grelhado Parmegiana G', 'Quentinhas', 'Arroz, feijão, farofa + bife grelhado à parmegiana + até 3 acompanhamentos (porção grande)', 2900, 24)
) as m(name, category, description, price, ord)
where e.slug = 'delicias-do-barao';

-- Vincula acompanhamentos (sides) a TODAS as quentinhas como 'choice'
insert into meal_items (meal_id, itemId, role)
select m.id, mi.id, 'choice'
from meals m
join establishments e on e.id = m.establishment_id
join menu_items mi on mi.establishment_id = e.id and mi.category = 'side'
where e.slug = 'delicias-do-barao';

-- Vincula adicionais (extras) a TODAS as quentinhas como 'extra' (opcional)
insert into meal_items (meal_id, itemId, role)
select m.id, mi.id, 'extra'
from meals m
join establishments e on e.id = m.establishment_id
join menu_items mi on mi.establishment_id = e.id and mi.category = 'extra'
where e.slug = 'delicias-do-barao';

commit;

-- Confere o resultado
select category, name, price_cents / 100.0 as preco
from meals
where establishment_id = (select id from establishments where slug = 'delicias-do-barao')
order by category, sort_order;

select category, name, price_cents / 100.0 as preco
from menu_items
where establishment_id = (select id from establishments where slug = 'delicias-do-barao')
order by category, sort_order;