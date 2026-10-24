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

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- Na criação, o servidor copia os dados de entrega do perfil e define preço,
-- código, status e histórico — o navegador só informa a quantidade.
create or replace function public.orders_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  price int;
  prof public.profiles%rowtype;
begin
  select price_cents into price from public.store_settings where id = 1;
  if coalesce(price, 0) <= 0 then
    raise exception 'As vendas ainda não estão abertas.';
  end if;

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
  new.unit_price_cents := price;
  new.total_cents := price * new.quantity;
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
