-- =============================================================================
-- Migração 002: Correção de RLS, Senha Master e RPC com SECURITY DEFINER (Sem ON CONFLICT)
-- =============================================================================

-- 1. Atualiza ou insere o usuário master brunoallan004@gmail.com com a senha admin123
do $$
begin
  update auth.users
  set encrypted_password = crypt('admin123', gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      raw_user_meta_data = '{"role":"admin"}'::jsonb
  where lower(email) = 'brunoallan004@gmail.com';

  if not found then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'brunoallan004@gmail.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      '{"role":"admin"}'::jsonb,
      now(),
      now()
    );
  end if;
end $$;

-- 2. Atualiza public.is_admin() para verificar com segurança pelo auth.uid() e metadata
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and (
        lower(email) in ('brunoallan004@gmail.com', 'admin@sindicocontas.com.br')
        or raw_app_meta_data ->> 'role' = 'admin'
        or raw_user_meta_data ->> 'role' = 'admin'
      )
  )
  or coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or lower(auth.jwt() ->> 'email') in ('brunoallan004@gmail.com', 'admin@sindicocontas.com.br'),
    false
  );
$$;

-- 3. Recria as Políticas RLS da tabela clients
drop policy if exists "Admins gerenciam todos os clientes" on public.clients;
drop policy if exists "Síndicos visualizam seu próprio condomínio" on public.clients;
drop policy if exists "Checagem de whitelist para login e cadastro" on public.clients;

-- Permite checagem prévia de whitelist para o login e cadastro do síndico
create policy "Checagem de whitelist para login e cadastro"
  on public.clients
  for select
  to anon, authenticated
  using (true);

-- Permite que administradores gerenciem a tabela clients
create policy "Admins gerenciam todos os clientes"
  on public.clients
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Função RPC com SECURITY DEFINER para criar condomínios (imune a erros de RLS)
create or replace function public.admin_create_client_slot(
  p_condo_name text,
  p_syndic_name text,
  p_syndic_email text
)
returns public.clients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients;
  v_count integer;
begin
  select count(*) into v_count from public.clients;
  if v_count >= 16 then
    raise exception 'Todos os 16 slots da matriz administrativa já estão ocupados.';
  end if;

  insert into public.clients (
    condo_name,
    syndic_name,
    syndic_email,
    status,
    scheduled_inactivation_date
  )
  values (
    trim(p_condo_name),
    trim(p_syndic_name),
    lower(trim(p_syndic_email)),
    'active',
    null
  )
  returning * into v_client;

  return v_client;
end;
$$;

grant execute on function public.admin_create_client_slot(text, text, text) to authenticated, anon;
