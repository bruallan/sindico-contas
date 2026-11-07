-- =============================================================================
-- SíndicoContas SaaS — Esquema Completo PostgreSQL + RLS + Storage (Supabase)
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Função Auxiliar de Verificação de Administrador Master
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or lower(auth.jwt() ->> 'email') in ('brunoallan004@gmail.com', 'admin@sindicocontas.com.br'),
    false
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. Tabela: clients (Condomínios / Clientes — Limite Operacional 4x4 = 16 Slots)
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  condo_name text not null,
  syndic_name text not null,
  syndic_email text not null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  scheduled_inactivation_date date,
  created_at timestamptz not null default now()
);

-- Remove restrição de unicidade em syndic_email caso já exista (permite que um síndico gerencie múltiplos condomínios)
alter table public.clients drop constraint if exists clients_syndic_email_key;

create index if not exists idx_clients_syndic_email on public.clients(lower(syndic_email));

create index if not exists idx_clients_user_id on public.clients(user_id);
create index if not exists idx_clients_status on public.clients(status);

-- -----------------------------------------------------------------------------
-- 3. Tabela: account_categories (Plano de Contas Hierárquico)
-- -----------------------------------------------------------------------------
create table if not exists public.account_categories (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  parent_id uuid references public.account_categories(id) on delete cascade
);

create index if not exists idx_account_categories_client_id on public.account_categories(client_id);
create index if not exists idx_account_categories_parent_id on public.account_categories(parent_id);

-- -----------------------------------------------------------------------------
-- 4. Tabela: transactions (Lançamentos Financeiros)
-- -----------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  category_id uuid not null references public.account_categories(id) on delete restrict,
  type text not null check (type in ('income', 'expense')),
  counterparty text not null,
  amount numeric(14, 2) not null check (amount > 0),
  due_date date not null,
  effective_date date,
  status text not null default 'realized' check (status in ('realized', 'pending')),
  receipt_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_client_id on public.transactions(client_id);
create index if not exists idx_transactions_category_id on public.transactions(category_id);
create index if not exists idx_transactions_dates on public.transactions(client_id, due_date, effective_date);

-- -----------------------------------------------------------------------------
-- 5. Rotina de Inativação Automática por Agendamento (scheduled_inactivation_date)
-- -----------------------------------------------------------------------------
create or replace function public.enforce_scheduled_inactivations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  update public.clients
  set status = 'inactive'
  where status = 'active'
    and scheduled_inactivation_date is not null
    and scheduled_inactivation_date <= current_date;

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

-- Função auxiliar para validar se o condomínio do usuário logado está ativo hoje
create or replace function public.is_active_client_owner(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = target_client_id
      and (c.user_id = auth.uid() or lower(c.syndic_email) = lower(auth.jwt() ->> 'email'))
      and c.status = 'active'
      and (c.scheduled_inactivation_date is null or c.scheduled_inactivation_date > current_date)
  );
$$;

-- -----------------------------------------------------------------------------
-- 6. Semeadura Automática do Plano de Contas Condominial Hierárquico por Cliente
-- -----------------------------------------------------------------------------
create or replace function public.seed_default_categories_for_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  grp_rec_ord uuid;
  grp_rec_ext uuid;
  grp_rec_fin uuid;
  grp_desp_pes uuid;
  grp_desp_con uuid;
  grp_desp_man uuid;
  grp_desp_adm uuid;
begin
  -- Grupos Pais: Entradas (income)
  insert into public.account_categories (client_id, name, type, parent_id)
  values (new.id, '1.1 Receitas Ordinárias', 'income', null)
  returning id into grp_rec_ord;

  insert into public.account_categories (client_id, name, type, parent_id)
  values (new.id, '1.2 Receitas Extraordinárias', 'income', null)
  returning id into grp_rec_ext;

  insert into public.account_categories (client_id, name, type, parent_id)
  values (new.id, '1.3 Receitas Financeiras', 'income', null)
  returning id into grp_rec_fin;

  -- Contas Analíticas: Entradas
  insert into public.account_categories (client_id, name, type, parent_id) values
    (new.id, 'Taxa Condominial Ordinária', 'income', grp_rec_ord),
    (new.id, 'Rateio de Água e Gás', 'income', grp_rec_ord),
    (new.id, 'Recuperação de Inadimplência', 'income', grp_rec_ord),
    (new.id, 'Fundo de Reserva', 'income', grp_rec_ext),
    (new.id, 'Taxa Extra de Obras e Benfeitorias', 'income', grp_rec_ext),
    (new.id, 'Uso de Salão de Festas e Espaços', 'income', grp_rec_ext),
    (new.id, 'Rendimentos de Aplicação Financeira', 'income', grp_rec_fin),
    (new.id, 'Multas e Juros Moratórios', 'income', grp_rec_fin);

  -- Grupos Pais: Saídas (expense)
  insert into public.account_categories (client_id, name, type, parent_id)
  values (new.id, '2.1 Pessoal e Encargos', 'expense', null)
  returning id into grp_desp_pes;

  insert into public.account_categories (client_id, name, type, parent_id)
  values (new.id, '2.2 Concessionárias e Consumo', 'expense', null)
  returning id into grp_desp_con;

  insert into public.account_categories (client_id, name, type, parent_id)
  values (new.id, '2.3 Manutenção e Conservação', 'expense', null)
  returning id into grp_desp_man;

  insert into public.account_categories (client_id, name, type, parent_id)
  values (new.id, '2.4 Despesas Administrativas', 'expense', null)
  returning id into grp_desp_adm;

  -- Contas Analíticas: Saídas
  insert into public.account_categories (client_id, name, type, parent_id) values
    (new.id, 'Folha de Pagamento e Portaria', 'expense', grp_desp_pes),
    (new.id, 'Encargos Sociais (INSS / FGTS / PIS)', 'expense', grp_desp_pes),
    (new.id, 'Benefícios (Vale-Transporte / Alimentação)', 'expense', grp_desp_pes),
    (new.id, 'Energia Elétrica', 'expense', grp_desp_con),
    (new.id, 'Água e Esgoto', 'expense', grp_desp_con),
    (new.id, 'Gás Canalizado', 'expense', grp_desp_con),
    (new.id, 'Manutenção de Elevadores', 'expense', grp_desp_man),
    (new.id, 'Manutenção de Bombas, Portões e CFTV', 'expense', grp_desp_man),
    (new.id, 'Materiais de Limpeza e Piscina', 'expense', grp_desp_man),
    (new.id, 'Honorários Contábeis / Administradora', 'expense', grp_desp_adm),
    (new.id, 'Seguro Condominial Obrigatório', 'expense', grp_desp_adm),
    (new.id, 'Tarifas Bancárias', 'expense', grp_desp_adm);

  return new;
end;
$$;

drop trigger if exists trg_seed_client_categories on public.clients;
create trigger trg_seed_client_categories
after insert on public.clients
for each row
execute function public.seed_default_categories_for_client();

-- -----------------------------------------------------------------------------
-- 7. Trigger de Vinculação / Auto-Cadastro de Síndico no Supabase Auth
-- -----------------------------------------------------------------------------
create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ignora usuários administradores
  if coalesce(new.raw_user_meta_data ->> 'role', '') = 'admin' then
    return new;
  end if;

  -- Caso o Admin já tenha pré-cadastrado o condomínio com este e-mail, vincula o user_id
  update public.clients
  set user_id = new.id
  where lower(syndic_email) = lower(new.email)
    and user_id is null;

  -- Se não existia pré-cadastro e o síndico informou condo_name no cadastro próprio:
  if not found and (new.raw_user_meta_data ->> 'condo_name') is not null then
    insert into public.clients (condo_name, syndic_name, syndic_email, user_id, status)
    values (
      new.raw_user_meta_data ->> 'condo_name',
      coalesce(new.raw_user_meta_data ->> 'syndic_name', split_part(new.email, '@', 1)),
      lower(new.email),
      new.id,
      'active'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

-- -----------------------------------------------------------------------------
-- 8. Políticas de Segurança em Nível de Linha (RLS)
-- -----------------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.account_categories enable row level security;
alter table public.transactions enable row level security;

-- Políticas: clients
create policy "Admins gerenciam todos os clientes"
  on public.clients
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Síndicos visualizam seu próprio condomínio"
  on public.clients
  for select
  to authenticated
  using (user_id = auth.uid());

-- Políticas: account_categories
create policy "Admins gerenciam todas as categorias"
  on public.account_categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Síndicos ativos gerenciam categorias do próprio condomínio"
  on public.account_categories
  for all
  to authenticated
  using (public.is_active_client_owner(client_id))
  with check (public.is_active_client_owner(client_id));

-- Políticas: transactions
create policy "Admins gerenciam todas as transações"
  on public.transactions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Síndicos ativos gerenciam transações do próprio condomínio"
  on public.transactions
  for all
  to authenticated
  using (public.is_active_client_owner(client_id))
  with check (public.is_active_client_owner(client_id));

-- -----------------------------------------------------------------------------
-- 9. Supabase Storage Bucket: receipts (Comprovantes Imagem/PDF)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

create policy "Usuários autenticados enviam comprovantes do próprio condomínio"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and (
      public.is_admin()
      or public.is_active_client_owner((storage.foldername(name))[1]::uuid)
    )
  );

create policy "Leitura de comprovantes autorizada"
  on storage.objects
  for select
  to public
  using (bucket_id = 'receipts');
