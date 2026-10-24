-- =====================================================================
-- PAUSA PARA SENTIR — banco de dados (Supabase / Postgres)
-- Rode este arquivo inteiro em: Supabase > SQL Editor > New query > Run
-- Pode ser executado mais de uma vez sem quebrar nada.
-- =====================================================================

-- ---------- Perfis (1 por usuário do Supabase Auth) -------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  phone text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Cria o perfil automaticamente no cadastro, com nome e telefone do formulário.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
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
  pix_key text not null default '',
  merchant_name text not null default 'Pausa para Sentir',
  merchant_city text not null default 'Sao Paulo',
  payment_note text not null default ''
);

insert into public.store_settings (id) values (1) on conflict (id) do nothing;

-- ---------- Pedidos -----------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
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

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- Na criação, o servidor define preço, código, status e histórico —
-- o navegador do cliente não consegue alterar o valor cobrado.
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
begin
  select price_cents into price from public.store_settings where id = 1;
  if coalesce(price, 0) <= 0 then
    raise exception 'As vendas ainda não estão abertas.';
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
  new.customer_email := coalesce(auth.jwt() ->> 'email', '');
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
-- DEPOIS de criar o usuário administrador em Authentication > Users
-- (e-mail admin@pausaparasentir.com.br), rode esta linha para promovê-lo:
--
--   update public.profiles set is_admin = true where email = 'admin@pausaparasentir.com.br';
-- =====================================================================
