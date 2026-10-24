-- =====================================================================
-- PAUSA PARA SENTIR — banco de dados (Supabase / Postgres)
-- Rode este arquivo inteiro em: Supabase > SQL Editor > New query > Run
-- Pode ser executado mais de uma vez sem quebrar nada (também atualiza
-- bancos criados com a versão anterior deste arquivo).
-- =====================================================================

-- ---------- Perfis (1 por usuário do Supabase Auth) -------------------
-- Login é por username; e-mail e celular aqui são dados de CONTATO (opcionais).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  whatsapp boolean not null default false,
  address jsonb not null default '{}'::jsonb,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Atualização de bancos criados com a versão anterior.
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists whatsapp boolean not null default false;
alter table public.profiles add column if not exists address jsonb not null default '{}'::jsonb;
alter table public.profiles alter column email set default '';
update public.profiles p
  set username = lower(split_part(u.email, '@', 1))
  from auth.users u
  where u.id = p.id and p.username is null;
create unique index if not exists profiles_username_key on public.profiles (username);

-- Cria o perfil automaticamente no cadastro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------- Conteúdo da vitrine (um único documento JSON) -------------
create table if not exists public.site_content (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Configurações da loja --------------------------------------
create table if not exists public.store_settings (
  id int primary key default 1 check (id = 1),
  product_name text not null default 'Kit Pausa para Sentir',
  price_cents int not null default 0 check (price_cents >= 0),
  pix_key text not null default '57341335000190',
  merchant_name text not null default 'Pausa para Sentir',
  merchant_city text not null default 'Sao Paulo',
  payment_note text not null default ''
);

insert into public.store_settings (id) values (1) on conflict (id) do nothing;
-- Chave Pix: CNPJ 57.341.335/0001-90 (só preenche se ainda estiver vazia).
update public.store_settings set pix_key = '57341335000190' where id = 1 and pix_key = '';
-- (product_name e price_cents ficaram da primeira versão; hoje o preço fica em catalog_items.)

-- ---------- Catálogo: produtos avulsos e kits ---------------------------
-- Um kit é um item com "components": [{ productId, name, quantity }].
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'product' check (kind in ('product', 'kit')),
  name text not null,
  description text not null default '',
  price_cents int not null default 0 check (price_cents >= 0),
  images jsonb not null default '[]'::jsonb,
  components jsonb not null default '[]'::jsonb,
  active boolean not null default false,
  featured boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Só um "kit principal" por vez (o da seção "O que vem no seu kit").
create or replace function public.catalog_single_featured()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.featured then
    update public.catalog_items set featured = false where featured and id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists catalog_single_featured on public.catalog_items;
create trigger catalog_single_featured
  after insert or update of featured on public.catalog_items
  for each row when (new.featured) execute function public.catalog_single_featured();

-- Primeira carga: os cinco elementos do ritual (fora da vitrine até receberem preço)
-- e o kit que reúne todos, com o preço antigo da loja.
do $$
declare
  ids uuid[] := array[]::uuid[];
  rec record;
  kit_price int;
begin
  if exists (select 1 from public.catalog_items) then
    return;
  end if;
  for rec in
    select * from (values
      ('Livro Entre o Concreto e o Verde', 'Um convite para olhar para os espaços que habitamos de outra maneira.', 'img/kit3.jpeg', 10),
      ('Meditação guiada para relaxamento', 'Experiência guiada por Thiago Sousa, terapeuta integrativo sistêmico.', 'img/kit4.jpeg', 20),
      ('Chá de lavanda', 'Uma pausa também pode ser saboreada. Curadoria: Fernanda Familiar.', 'img/kit5.jpeg', 30),
      ('Escalda-pés para relaxamento', 'Alecrim, calêndula, camomila e erva-doce. AteLILIê — Liliane Silva.', 'img/kit2.jpeg', 40),
      ('Vela aromática de acolhimento', 'Baunilha e quartzo rosa. AteLILIê — Liliane Silva.', 'img/kit1.jpeg', 50)
    ) as t(name, description, image, sort)
  loop
    insert into public.catalog_items (kind, name, description, images, sort)
    values ('product', rec.name, rec.description, jsonb_build_array(rec.image), rec.sort);
  end loop;

  select coalesce(price_cents, 0) into kit_price from public.store_settings where id = 1;
  insert into public.catalog_items (kind, name, description, price_cents, images, components, active, featured, sort)
  select
    'kit',
    'Kit Pausa para Sentir',
    'Um ritual para os cinco sentidos: livro, meditação guiada, chá, escalda-pés e vela aromática.',
    coalesce(kit_price, 0),
    '["img/kit2.jpeg", "img/kit1.jpeg", "img/kit4.jpeg", "img/kit3.jpeg"]'::jsonb,
    (select jsonb_agg(jsonb_build_object('productId', id, 'name', name, 'quantity', 1) order by sort)
       from public.catalog_items where kind = 'product'),
    true,
    true,
    0;
end;
$$;

-- ---------- Pedidos -----------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_username text not null default '',
  customer_name text not null,
  customer_email text not null default '',
  customer_phone text not null default '',
  customer_whatsapp boolean not null default false,
  address jsonb not null,
  quantity int not null check (quantity between 1 and 10),
  unit_price_cents int not null,
  total_cents int not null,
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento', 'pago', 'em_preparacao', 'enviado', 'entregue', 'cancelado')),
  tracking_code text not null default '',
  admin_note text not null default '',
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists customer_username text not null default '';
alter table public.orders add column if not exists customer_whatsapp boolean not null default false;
alter table public.orders alter column customer_email set default '';
alter table public.orders alter column customer_phone set default '';
-- Loja: o pedido guarda os itens comprados (retrato de nome e preço na hora da compra).
alter table public.orders add column if not exists items jsonb not null default '[]'::jsonb;
alter table public.orders alter column unit_price_cents set default 0;
alter table public.orders drop constraint if exists orders_quantity_check;
alter table public.orders add constraint orders_quantity_check check (quantity between 1 and 400);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- Na criação, o servidor copia os dados de entrega do perfil, busca nome e preço
-- de cada item no catálogo e calcula o total — o navegador só informa
-- [{ itemId, quantity }]. Assim ninguém consegue alterar o valor cobrado.
create or replace function public.orders_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  prof public.profiles%rowtype;
  line jsonb;
  it public.catalog_items%rowtype;
  q int;
  snapshot jsonb := '[]'::jsonb;
  total int := 0;
  units int := 0;
begin
  if jsonb_typeof(new.items) is distinct from 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'Sua sacola está vazia.';
  end if;
  if jsonb_array_length(new.items) > 30 then
    raise exception 'Itens demais em um só pedido.';
  end if;

  for line in select value from jsonb_array_elements(new.items) loop
    q := coalesce((line ->> 'quantity')::int, 0);
    if q < 1 or q > 20 then
      raise exception 'Quantidade inválida.';
    end if;
    select * into it from public.catalog_items where id = (line ->> 'itemId')::uuid and active;
    if it.id is null then
      raise exception 'Um dos itens da sacola não está mais disponível.';
    end if;
    if it.price_cents <= 0 then
      raise exception 'Um dos itens ainda não está à venda.';
    end if;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object(
      'itemId', it.id,
      'kind', it.kind,
      'name', it.name,
      'unitPriceCents', it.price_cents,
      'quantity', q,
      'image', coalesce(it.images ->> 0, '')
    ));
    total := total + it.price_cents * q;
    units := units + q;
  end loop;

  select * into prof from public.profiles where id = auth.uid();
  if prof.id is null
     or trim(prof.name) = ''
     or coalesce(trim(prof.address ->> 'cep'), '') = ''
     or coalesce(trim(prof.address ->> 'street'), '') = ''
     or coalesce(trim(prof.address ->> 'number'), '') = ''
     or coalesce(trim(prof.address ->> 'district'), '') = ''
     or coalesce(trim(prof.address ->> 'city'), '') = ''
     or coalesce(trim(prof.address ->> 'state'), '') = '' then
    raise exception 'Preencha os dados de entrega antes de finalizar.';
  end if;

  loop
    new_code := 'PPS';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.orders where code = new_code);
  end loop;

  new.id := gen_random_uuid();
  new.code := new_code;
  new.user_id := auth.uid();
  new.customer_username := coalesce(prof.username, '');
  new.customer_name := prof.name;
  new.customer_email := prof.email;
  new.customer_phone := prof.phone;
  new.customer_whatsapp := prof.whatsapp;
  new.address := prof.address;
  new.items := snapshot;
  new.quantity := units;
  new.unit_price_cents := 0;
  new.total_cents := total;
  new.status := 'aguardando_pagamento';
  new.tracking_code := '';
  new.admin_note := '';
  new.history := jsonb_build_array(jsonb_build_object('status', new.status, 'at', now()));
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_before_insert on public.orders;
create trigger orders_before_insert
  before insert on public.orders
  for each row execute function public.orders_before_insert();

-- Na atualização (só admin), registra mudanças de status no histórico
-- e impede alterar dados de cobrança.
create or replace function public.orders_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.code := old.code;
  new.user_id := old.user_id;
  new.unit_price_cents := old.unit_price_cents;
  new.total_cents := old.total_cents;
  new.items := old.items;
  new.quantity := old.quantity;
  new.created_at := old.created_at;
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.history := old.history || jsonb_build_array(jsonb_build_object('status', new.status, 'at', now()));
  else
    new.history := old.history;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_before_update on public.orders;
create trigger orders_before_update
  before update on public.orders
  for each row execute function public.orders_before_update();

-- ---------- Regras de acesso (Row Level Security) ----------------------
alter table public.profiles enable row level security;
alter table public.site_content enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;
alter table public.catalog_items enable row level security;

drop policy if exists "catálogo: todos veem o que está à venda" on public.catalog_items;
create policy "catálogo: todos veem o que está à venda" on public.catalog_items
  for select using (active or public.is_admin());
drop policy if exists "catálogo: admin grava" on public.catalog_items;
create policy "catálogo: admin grava" on public.catalog_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "perfil: dono ou admin lê" on public.profiles;
create policy "perfil: dono ou admin lê" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "perfil: dono atualiza" on public.profiles;
create policy "perfil: dono atualiza" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- O cliente só pode mudar os dados de entrega — nunca username nem is_admin.
revoke update on public.profiles from anon, authenticated;
grant update (name, email, phone, whatsapp, address) on public.profiles to authenticated;

drop policy if exists "conteúdo: todos leem" on public.site_content;
create policy "conteúdo: todos leem" on public.site_content
  for select using (true);
drop policy if exists "conteúdo: admin grava" on public.site_content;
create policy "conteúdo: admin grava" on public.site_content
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "loja: todos leem" on public.store_settings;
create policy "loja: todos leem" on public.store_settings
  for select using (true);
drop policy if exists "loja: admin grava" on public.store_settings;
create policy "loja: admin grava" on public.store_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pedidos: dono ou admin lê" on public.orders;
create policy "pedidos: dono ou admin lê" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "pedidos: cliente logado cria" on public.orders;
create policy "pedidos: cliente logado cria" on public.orders
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "pedidos: admin atualiza" on public.orders;
create policy "pedidos: admin atualiza" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------- Imagens da vitrine (Storage) --------------------------------
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do update set public = true;

drop policy if exists "imagens: todos veem" on storage.objects;
create policy "imagens: todos veem" on storage.objects
  for select using (bucket_id = 'site-images');
drop policy if exists "imagens: admin envia" on storage.objects;
create policy "imagens: admin envia" on storage.objects
  for insert to authenticated with check (bucket_id = 'site-images' and public.is_admin());
drop policy if exists "imagens: admin altera" on storage.objects;
create policy "imagens: admin altera" on storage.objects
  for update to authenticated using (bucket_id = 'site-images' and public.is_admin());
drop policy if exists "imagens: admin remove" on storage.objects;
create policy "imagens: admin remove" on storage.objects
  for delete to authenticated using (bucket_id = 'site-images' and public.is_admin());

-- =====================================================================
-- ADMINISTRADOR
-- 1. Authentication > Users > Add user > Create new user
--      e-mail: pausa@usuarios.pausaparasentir.com.br   (= username "pausa")
--      senha:  a senha do admin  ·  marque "Auto Confirm User"
-- 2. Rode a linha abaixo para promovê-lo:
--
--   update public.profiles set is_admin = true where username = 'pausa';
-- =====================================================================
