-- =============================================================================
-- Migração 003: Gestão de Funcionários (CNPJ Próprio), Escalas 24/7 e Calendário Condominial
-- =============================================================================

-- 1. Configuração de RH por Condomínio (Contratação Direta via CNPJ vs Terceirizada)
create table if not exists public.condo_hr_configs (
  client_id uuid primary key references public.clients(id) on delete cascade,
  enabled boolean not null default true,
  cnpj text not null default '18.492.310/0001-54',
  corporate_name text not null default '',
  min_day_staff integer not null default 2 check (min_day_staff >= 1),
  min_night_staff integer not null default 2 check (min_night_staff >= 1),
  updated_at timestamptz not null default now()
);

-- 2. Colaboradores Contratados Diretamente pelo CNPJ do Condomínio
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  registration_code text not null,
  full_name text not null,
  role text not null,
  role_category text not null check (role_category in ('portaria', 'ronda', 'cobertura', 'zeladoria', 'limpeza')),
  cpf_masked text not null,
  admission_date date not null,
  birth_date date not null,
  phone text not null default '',
  schedule_pattern text not null check (
    schedule_pattern in (
      '12x36_day_even',
      '12x36_day_odd',
      '12x36_night_even',
      '12x36_night_odd',
      'commercial_mon_sat',
      'relief_flex'
    )
  ),
  work_hours_label text not null,
  base_salary numeric(12, 2) not null default 0,
  status text not null default 'ativo' check (status in ('ativo', 'ferias', 'afastado')),
  emergency_contact text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_employees_client_id on public.employees(client_id);

-- 3. Documentos, Exames Ocupacionais (ASO) e Certificados (Brigada de Incêndio, NRs)
create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  doc_type text not null,
  title text not null,
  issuer text not null default '',
  issue_date date not null,
  expiry_date date,
  certificate_number text not null default '',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_documents_client_id on public.employee_documents(client_id);
create index if not exists idx_employee_documents_expiry on public.employee_documents(client_id, expiry_date);

-- 4. Controle de Férias dos Colaboradores
create table if not exists public.employee_vacations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  acquisitive_start date not null,
  acquisitive_end date not null,
  concessive_limit date not null,
  start_date date not null,
  end_date date not null,
  days integer not null check (days > 0 and days <= 30),
  status text not null default 'programada' check (status in ('programada', 'em_andamento', 'concluida')),
  cover_employee_id uuid references public.employees(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_vacations_client_id on public.employee_vacations(client_id);

-- 5. Ajustes Manuais na Escala Automática 24/7
create table if not exists public.schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  date_iso date not null,
  shift_code text not null check (shift_code in ('D', 'N', 'C', 'CD', 'CN', 'FG', 'FE', 'AT')),
  reason text,
  updated_at timestamptz not null default now(),
  unique(client_id, employee_id, date_iso)
);

create index if not exists idx_schedule_overrides_client_date on public.schedule_overrides(client_id, date_iso);

-- 6. Registro Oficial de Validação e Exportação de Escalas (PDF)
create table if not exists public.schedule_validations (
  client_id uuid not null references public.clients(id) on delete cascade,
  year_month text not null,
  status text not null default 'draft' check (status in ('draft', 'validated', 'modified_after_validation')),
  validated_at timestamptz,
  validated_by text,
  validation_code text,
  last_exported_at timestamptz,
  export_count integer not null default 0,
  notes text,
  primary key (client_id, year_month)
);

-- 7. Reservas do Salão de Festas e Espaços Comuns
create table if not exists public.party_room_bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  space_name text not null,
  resident_name text not null,
  unit_label text not null,
  event_title text not null,
  date_iso date not null,
  start_time text not null default '12:00',
  end_time text not null default '22:00',
  status text not null default 'confirmada' check (status in ('confirmada', 'pendente_taxa', 'cancelada')),
  guest_count integer not null default 20,
  fee_amount numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_party_room_bookings_client_date on public.party_room_bookings(client_id, date_iso);

-- 8. Documentos Obrigatórios e Contratos do Condomínio
create table if not exists public.condo_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  category text not null check (category in ('condo_doc', 'contract')),
  title text not null,
  provider_or_issuer text not null,
  document_number text not null default '',
  issue_date date not null,
  expiry_date date not null,
  alert_days_before integer not null default 30,
  annual_or_monthly_value numeric(12, 2),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_condo_documents_client_expiry on public.condo_documents(client_id, expiry_date);

-- RLS Policies
alter table public.condo_hr_configs enable row level security;
alter table public.employees enable row level security;
alter table public.employee_documents enable row level security;
alter table public.employee_vacations enable row level security;
alter table public.schedule_overrides enable row level security;
alter table public.schedule_validations enable row level security;
alter table public.party_room_bookings enable row level security;
alter table public.condo_documents enable row level security;

create policy "Acesso HR Config por condominio ativo ou admin" on public.condo_hr_configs
  for all to authenticated
  using (public.is_admin() or public.is_active_client_owner(client_id))
  with check (public.is_admin() or public.is_active_client_owner(client_id));

create policy "Acesso Colaboradores por condominio ativo ou admin" on public.employees
  for all to authenticated
  using (public.is_admin() or public.is_active_client_owner(client_id))
  with check (public.is_admin() or public.is_active_client_owner(client_id));

create policy "Acesso Docs Colaboradores por condominio ativo ou admin" on public.employee_documents
  for all to authenticated
  using (public.is_admin() or public.is_active_client_owner(client_id))
  with check (public.is_admin() or public.is_active_client_owner(client_id));

create policy "Acesso Ferias por condominio ativo ou admin" on public.employee_vacations
  for all to authenticated
  using (public.is_admin() or public.is_active_client_owner(client_id))
  with check (public.is_admin() or public.is_active_client_owner(client_id));

create policy "Acesso Escala Overrides por condominio ativo ou admin" on public.schedule_overrides
  for all to authenticated
  using (public.is_admin() or public.is_active_client_owner(client_id))
  with check (public.is_admin() or public.is_active_client_owner(client_id));

create policy "Acesso Escala Validations por condominio ativo ou admin" on public.schedule_validations
  for all to authenticated
  using (public.is_admin() or public.is_active_client_owner(client_id))
  with check (public.is_admin() or public.is_active_client_owner(client_id));

create policy "Acesso Salao de Festas por condominio ativo ou admin" on public.party_room_bookings
  for all to authenticated
  using (public.is_admin() or public.is_active_client_owner(client_id))
  with check (public.is_admin() or public.is_active_client_owner(client_id));

create policy "Acesso Docs e Contratos Condominio por condominio ativo ou admin" on public.condo_documents
  for all to authenticated
  using (public.is_admin() or public.is_active_client_owner(client_id))
  with check (public.is_admin() or public.is_active_client_owner(client_id));
