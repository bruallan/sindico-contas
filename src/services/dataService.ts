import { isSupabaseConfigured, RECEIPTS_BUCKET, supabase } from '@/lib/supabase';
import {
  buildInitialSeedDatabase,
  createDefaultCategoriesForClient,
  LocalDatabaseSchema,
} from '@/services/mockSeed';
import {
  AccountCategory,
  AuthUserSession,
  Client,
  ConfirmTransactionInput,
  CreateClientInput,
  CreateTransactionInput,
  Transaction,
  UpdateClientManagementInput,
} from '@/types/database';
import { getLocalTodayISO, isClientScheduledExpired } from '@/utils/formatters';

const LOCAL_DB_KEY = 'sindico_contas_db_v1';
const LOCAL_SESSION_KEY = 'sindico_contas_session_v1';
const SELECTED_CLIENT_STORAGE_KEY = 'sindico_selected_client_id';
const MAX_CLIENT_SLOTS = 16;

export const DEFAULT_ADMIN_EMAILS = [
  'brunoallan004@gmail.com',
  'admin@sindicocontas.com.br',
];

export function isConfiguredAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (DEFAULT_ADMIN_EMAILS.includes(normalized)) return true;
  const envEmail = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.toLowerCase();
  if (envEmail) {
    const list = envEmail.split(',').map((e) => e.trim());
    if (list.includes(normalized)) return true;
  }
  return false;
}

// =============================================================================
// Utilitários Internos de Persistência Local (Fallback quando .env não configurado)
// =============================================================================

function loadLocalDb(): LocalDatabaseSchema {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalDatabaseSchema;
      if (parsed && Array.isArray(parsed.clients)) {
        return enforceLocalScheduledInactivations(parsed);
      }
    }
  } catch {
    // Recria banco inicial caso corrompido
  }
  const initial = enforceLocalScheduledInactivations(buildInitialSeedDatabase());
  saveLocalDb(initial);
  return initial;
}

function saveLocalDb(db: LocalDatabaseSchema): void {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
}

function enforceLocalScheduledInactivations(db: LocalDatabaseSchema): LocalDatabaseSchema {
  const today = getLocalTodayISO();
  let mutated = false;

  const updatedClients = db.clients.map((client) => {
    if (client.status === 'active' && isClientScheduledExpired(client, today)) {
      mutated = true;
      return { ...client, status: 'inactive' as const };
    }
    return client;
  });

  if (mutated) {
    const next = { ...db, clients: updatedClients };
    saveLocalDb(next);
    return next;
  }
  return db;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao processar o arquivo de comprovante.'));
    reader.readAsDataURL(file);
  });
}

async function uploadReceiptFile(clientId: string, file: File): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const safeExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const filePath = `${clientId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${safeExt}`;
    const { error: uploadError } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(filePath, file, { upsert: false, contentType: file.type });

    if (uploadError) {
      throw new Error(`Erro no upload para o Supabase Storage: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  }

  return fileToDataUrl(file);
}

// =============================================================================
// Autenticação (Rotas Independentes: Síndico vs Administrador)
// =============================================================================

export async function restoreAuthSession(): Promise<AuthUserSession | null> {
  if (isSupabaseConfigured && supabase) {
    await supabase.rpc('enforce_scheduled_inactivations').then(() => undefined, () => undefined);
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;

    const isAdmin =
      user.app_metadata?.role === 'admin' ||
      user.user_metadata?.role === 'admin' ||
      isConfiguredAdminEmail(user.email);

    if (isAdmin) {
      return {
        id: user.id,
        email: user.email ?? '',
        role: 'admin',
        client: null,
        availableClients: [],
      };
    }

    const normalizedEmail = (user.email ?? '').trim().toLowerCase();

    // Garante que o user_id esteja vinculado nos registros do cliente com este e-mail
    await supabase
      .from('clients')
      .update({ user_id: user.id })
      .ilike('syndic_email', normalizedEmail)
      .is('user_id', null);

    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .or(`user_id.eq.${user.id},syndic_email.ilike.${normalizedEmail}`);

    const allClients = (clientsData ?? []) as Client[];
    const today = getLocalTodayISO();

    // Filtra apenas condomínios com status ativo e sem inativação vencida
    const activeClients = allClients.filter(
      (c) => c.status === 'active' && !isClientScheduledExpired(c, today)
    );

    if (activeClients.length === 0) {
      await supabase.auth.signOut();
      localStorage.removeItem(SELECTED_CLIENT_STORAGE_KEY);
      return null;
    }

    // Recupera o condomínio ativo previamente selecionado pelo usuário
    const savedClientId = localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY);
    const resolvedClient =
      activeClients.find((c) => c.id === savedClientId) ?? activeClients[0];

    localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, resolvedClient.id);

    return {
      id: user.id,
      email: user.email ?? '',
      role: 'syndic',
      client: resolvedClient,
      availableClients: activeClients,
    };
  }

  // Modo Local Persistente
  try {
    const rawSession = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!rawSession) return null;
    const { userId } = JSON.parse(rawSession) as { userId: string };
    const db = loadLocalDb();
    const account = db.users.find((u) => u.id === userId);
    if (!account) return null;

    if (account.role === 'admin' || isConfiguredAdminEmail(account.email)) {
      return {
        id: account.id,
        email: account.email,
        role: 'admin',
        client: null,
        availableClients: [],
      };
    }

    const today = getLocalTodayISO();
    const normalizedEmail = account.email.trim().toLowerCase();
    const allClients = db.clients.filter(
      (c) => c.user_id === account.id || (c.syndic_email && c.syndic_email.toLowerCase() === normalizedEmail)
    );

    const activeClients = allClients.filter(
      (c) => c.status === 'active' && !isClientScheduledExpired(c, today)
    );

    if (activeClients.length === 0) {
      localStorage.removeItem(LOCAL_SESSION_KEY);
      localStorage.removeItem(SELECTED_CLIENT_STORAGE_KEY);
      return null;
    }

    const savedClientId = localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY);
    const resolvedClient =
      activeClients.find((c) => c.id === savedClientId) ?? activeClients[0];

    localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, resolvedClient.id);

    return {
      id: account.id,
      email: account.email,
      role: 'syndic',
      client: resolvedClient,
      availableClients: activeClients,
    };
  } catch {
    return null;
  }
}

export async function signInSyndic(
  email: string,
  password: string,
  targetClientId?: string
): Promise<AuthUserSession> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    await supabase.rpc('enforce_scheduled_inactivations').then(() => undefined, () => undefined);

    // 1. Verificação Estrita de Lista de Autorização (Whitelist):
    // Verifica se este e-mail foi previamente cadastrado pelo Admin em algum condomínio
    const { data: preCheckClients, error: preCheckErr } = await supabase
      .from('clients')
      .select('*')
      .ilike('syndic_email', normalizedEmail);

    if (preCheckErr || !preCheckClients || preCheckClients.length === 0) {
      throw new Error(
        'Acesso não autorizado: este e-mail não foi cadastrado pela administração do sistema. Solicite o cadastro do seu condomínio à gestão.'
      );
    }

    // 2. Autenticação das credenciais
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      throw new Error('E-mail ou senha incorretos.');
    }

    if (data.user.app_metadata?.role === 'admin' || isConfiguredAdminEmail(data.user.email)) {
      await supabase.auth.signOut();
      throw new Error('Credencial administrativa master. Acesse exclusivamente por /admin/login.');
    }

    // 3. Garante vinculação do user_id se ainda estiver nulo no Supabase
    await supabase
      .from('clients')
      .update({ user_id: data.user.id })
      .ilike('syndic_email', normalizedEmail)
      .is('user_id', null);

    // 4. Busca todos os condomínios vinculados
    const { data: clientsRows, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .or(`user_id.eq.${data.user.id},syndic_email.ilike.${normalizedEmail}`);

    if (clientsError || !clientsRows || clientsRows.length === 0) {
      await supabase.auth.signOut();
      throw new Error('Nenhum condomínio vinculado a este usuário.');
    }

    const allClients = clientsRows as Client[];
    const today = getLocalTodayISO();
    const activeClients = allClients.filter(
      (c) => c.status === 'active' && !isClientScheduledExpired(c, today)
    );

    if (activeClients.length === 0) {
      await supabase.auth.signOut();
      throw new Error(
        'Acesso inativo: o(s) condomínio(s) vinculado(s) a este e-mail encontram-se desativados pela administração.'
      );
    }

    const resolvedClient = targetClientId
      ? activeClients.find((c) => c.id === targetClientId) ?? activeClients[0]
      : activeClients[0];

    localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, resolvedClient.id);

    return {
      id: data.user.id,
      email: data.user.email ?? normalizedEmail,
      role: 'syndic',
      client: resolvedClient,
      availableClients: activeClients,
    };
  }

  // Modo Local Persistente
  const db = loadLocalDb();
  const normalizedUserEmail = normalizedEmail;

  // 1. Verificação Estrita de Lista de Autorização (Whitelist):
  const userCondos = db.clients.filter(
    (c) => c.syndic_email && c.syndic_email.toLowerCase() === normalizedUserEmail
  );

  if (userCondos.length === 0) {
    throw new Error(
      'Acesso não autorizado: este e-mail não foi cadastrado pela administração do sistema. Solicite o cadastro do seu condomínio à gestão.'
    );
  }

  const account = db.users.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
  );

  if (!account) {
    throw new Error('E-mail ou senha incorretos.');
  }

  if (account.role === 'admin' || isConfiguredAdminEmail(account.email)) {
    throw new Error('Credencial administrativa master. Acesse exclusivamente por /admin/login.');
  }

  const today = getLocalTodayISO();
  const activeClients = userCondos.filter(
    (c) => c.status === 'active' && !isClientScheduledExpired(c, today)
  );

  if (activeClients.length === 0) {
    throw new Error(
      'Acesso inativo: o(s) condomínio(s) vinculado(s) a este e-mail encontram-se desativados pela administração.'
    );
  }

  const resolvedClient = targetClientId
    ? activeClients.find((c) => c.id === targetClientId) ?? activeClients[0]
    : activeClients[0];

  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ userId: account.id }));
  localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, resolvedClient.id);

  return {
    id: account.id,
    email: account.email,
    role: 'syndic',
    client: resolvedClient,
    availableClients: activeClients,
  };
}

export async function signUpSyndic(params: {
  condo_name: string;
  syndic_name: string;
  email: string;
  password: string;
}): Promise<AuthUserSession> {
  const normalizedEmail = params.email.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    // 1. Verificação Estrita de Whitelist: O e-mail DEVE ter sido previamente cadastrado pelo Admin
    const { data: preCheckClients, error: preCheckErr } = await supabase
      .from('clients')
      .select('*')
      .ilike('syndic_email', normalizedEmail);

    if (preCheckErr || !preCheckClients || preCheckClients.length === 0) {
      throw new Error(
        'Acesso negado: o e-mail informado não foi pré-autorizado pela administração. Solicite o cadastro do seu condomínio ao administrador.'
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: params.password,
      options: {
        data: {
          condo_name: params.condo_name.trim(),
          syndic_name: params.syndic_name.trim(),
          role: 'syndic',
        },
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? 'Não foi possível concluir o cadastro.');
    }

    // Vincula o user_id nos condomínios já cadastrados para este e-mail
    await supabase
      .from('clients')
      .update({ user_id: data.user.id })
      .ilike('syndic_email', normalizedEmail);

    const { data: clientsRows } = await supabase
      .from('clients')
      .select('*')
      .or(`user_id.eq.${data.user.id},syndic_email.ilike.${normalizedEmail}`);

    const allClients = (clientsRows ?? []) as Client[];
    const today = getLocalTodayISO();
    const activeClients = allClients.filter(
      (c) => c.status === 'active' && !isClientScheduledExpired(c, today)
    );

    if (activeClients.length === 0) {
      throw new Error('Acesso bloqueado: o condomínio vinculado a este e-mail encontra-se inativo.');
    }

    const resolved = activeClients[0];
    localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, resolved.id);

    return {
      id: data.user.id,
      email: normalizedEmail,
      role: 'syndic',
      client: resolved,
      availableClients: activeClients,
    };
  }

  // Modo Local Persistente
  const db = loadLocalDb();
  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('Já existe um usuário cadastrado com este e-mail.');
  }

  // Verificação Estrita de Whitelist Local:
  const existingPreClients = db.clients.filter(
    (c) => c.syndic_email?.toLowerCase() === normalizedEmail
  );

  if (existingPreClients.length === 0) {
    throw new Error(
      'Acesso negado: o e-mail informado não foi pré-autorizado pela administração. Solicite o cadastro do seu condomínio ao administrador.'
    );
  }

  const newUserId = `u-syndic-${crypto.randomUUID().slice(0, 8)}`;
  let activeClients: Client[] = [];
  const updatedClients = db.clients.map((c) => {
    if (c.syndic_email?.toLowerCase() === normalizedEmail) {
      const linked = { ...c, user_id: newUserId };
      activeClients.push(linked);
      return linked;
    }
    return c;
  });

  const nextDb: LocalDatabaseSchema = {
    ...db,
    users: [
      ...db.users,
      {
        id: newUserId,
        email: normalizedEmail,
        password: params.password,
        role: 'syndic',
      },
    ],
    clients: updatedClients,
  };

  saveLocalDb(nextDb);
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ userId: newUserId }));
  localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, activeClients[0].id);

  return {
    id: newUserId,
    email: normalizedEmail,
    role: 'syndic',
    client: activeClients[0],
    availableClients: activeClients,
  };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Informe um endereço de e-mail válido.');
  }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw new Error(error.message);
    return;
  }

  // Valida existência no ambiente local para feedback autêntico
  const db = loadLocalDb();
  const exists = db.users.some((u) => u.email.toLowerCase() === normalizedEmail);
  if (!exists) {
    throw new Error('Nenhuma conta de síndico encontrada para o e-mail informado.');
  }
}

export async function signInAdmin(email: string, password: string): Promise<AuthUserSession> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isConfiguredAdminEmail(normalizedEmail)) {
    throw new Error('Acesso restrito: este e-mail não possui privilégios de Administrador Master.');
  }

  if (isSupabaseConfigured && supabase) {
    // 1. Tenta login direto com as credenciais informadas
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (!error && data.user) {
      const isAdmin =
        data.user.app_metadata?.role === 'admin' ||
        data.user.user_metadata?.role === 'admin' ||
        isConfiguredAdminEmail(data.user.email);

      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error('Acesso negado: esta conta não possui privilégios de Administrador Master.');
      }

      await supabase.rpc('enforce_scheduled_inactivations').then(() => undefined, () => undefined);

      return {
        id: data.user.id,
        email: data.user.email ?? normalizedEmail,
        role: 'admin',
        client: null,
        availableClients: [],
      };
    }

    // 2. Se o erro for de e-mail não confirmado
    if (error?.message?.toLowerCase().includes('email not confirmed')) {
      throw new Error(
        'E-mail master pendente de confirmação. Acesse sua caixa de entrada em ' +
          normalizedEmail +
          ' para confirmar seu acesso (ou desative "Confirm email" no painel Supabase em Authentication > Providers > Email).'
      );
    }

    // 3. Se falhou por credenciais inválidas, pode ser o primeiro acesso do master (usuário ainda não criado no Supabase Auth)
    if (error?.message?.toLowerCase().includes('invalid login credentials')) {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            role: 'admin',
          },
        },
      });

      if (!signUpErr && signUpData.user) {
        if (signUpData.session) {
          return {
            id: signUpData.user.id,
            email: signUpData.user.email ?? normalizedEmail,
            role: 'admin',
            client: null,
            availableClients: [],
          };
        }

        throw new Error(
          'Conta Master inicializada! Um e-mail de confirmação foi enviado para ' +
            normalizedEmail +
            '. Clique no link para confirmar e faça login com a senha definida (ou desative "Confirm email" em Authentication > Providers > Email no Supabase).'
        );
      }

      if (signUpErr && signUpErr.message?.toLowerCase().includes('user already registered')) {
        throw new Error('Senha administrativa incorreta para o e-mail ' + normalizedEmail + '.');
      }
    }

    throw new Error(error?.message ?? 'Credenciais administrativas inválidas.');
  }

  // Modo Local Persistente
  const db = loadLocalDb();
  const adminAccount = db.users.find(
    (u) =>
      u.email.toLowerCase() === normalizedEmail &&
      u.password === password &&
      (u.role === 'admin' || isConfiguredAdminEmail(u.email))
  );

  if (!adminAccount) {
    throw new Error('Credenciais master inválidas.');
  }

  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ userId: adminAccount.id }));
  return {
    id: adminAccount.id,
    email: adminAccount.email,
    role: 'admin',
    client: null,
    availableClients: [],
  };
}

export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem(LOCAL_SESSION_KEY);
  localStorage.removeItem(SELECTED_CLIENT_STORAGE_KEY);
}

// =============================================================================
// Operações do Módulo Administrador (/admin/dashboard)
// =============================================================================

export async function fetchAllClients(): Promise<Client[]> {
  if (isSupabaseConfigured && supabase) {
    await supabase.rpc('enforce_scheduled_inactivations').then(() => undefined, () => undefined);

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(MAX_CLIENT_SLOTS);

    if (error) throw new Error(error.message);

    const today = getLocalTodayISO();
    const clients = (data ?? []) as Client[];

    for (const c of clients) {
      if (c.status === 'active' && isClientScheduledExpired(c, today)) {
        c.status = 'inactive';
        await supabase.from('clients').update({ status: 'inactive' }).eq('id', c.id);
      }
    }

    return clients;
  }

  const db = loadLocalDb();
  return [...db.clients]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, MAX_CLIENT_SLOTS);
}

export async function createNewClientSlot(input: CreateClientInput): Promise<Client> {
  const condoName = input.condo_name.trim();
  const syndicName = input.syndic_name.trim();
  const syndicEmail = (input.syndic_email ?? '').trim().toLowerCase();

  if (!condoName || !syndicName || !syndicEmail) {
    throw new Error('Preencha o Nome do Condomínio, Nome do Síndico e E-mail do Síndico.');
  }

  if (isSupabaseConfigured && supabase) {
    // 1. Tenta criar através da função RPC segura com SECURITY DEFINER (imune a restrições de RLS)
    const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_create_client_slot', {
      p_condo_name: condoName,
      p_syndic_name: syndicName,
      p_syndic_email: syndicEmail,
    });

    if (!rpcErr && rpcData) {
      return rpcData as Client;
    }

    // 2. Fallback caso a função RPC ainda não tenha sido aplicada no SQL Editor
    const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true });
    if ((count ?? 0) >= MAX_CLIENT_SLOTS) {
      throw new Error('Todos os 16 slots do painel administrativo já estão ocupados.');
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        condo_name: condoName,
        syndic_name: syndicName,
        syndic_email: syndicEmail,
        status: 'active',
        scheduled_inactivation_date: null,
      })
      .select('*')
      .single();

    if (error) {
      if (error.message.includes('row-level security')) {
        throw new Error(
          'Permissão negada pelo Supabase. Execute o script de correção de RLS no SQL Editor do Supabase (migração 002).'
        );
      }
      throw new Error(error.message);
    }
    return data as Client;
  }

  const db = loadLocalDb();
  if (db.clients.length >= MAX_CLIENT_SLOTS) {
    throw new Error('Todos os 16 slots da matriz 4x4 já estão ocupados.');
  }

  const newClientId = crypto.randomUUID();
  const nextUsers = [...db.users];

  // Se o síndico já tiver cadastro de usuário por ter outro condomínio, reaproveita o user_id existente!
  const existingUser = db.users.find((u) => u.email.toLowerCase() === syndicEmail);
  let linkedUserId: string;

  if (existingUser) {
    linkedUserId = existingUser.id;
  } else {
    linkedUserId = `u-syndic-${crypto.randomUUID().slice(0, 8)}`;
    nextUsers.push({
      id: linkedUserId,
      email: syndicEmail,
      password: input.initial_password?.trim() || '123456',
      role: 'syndic',
    });
  }

  const newClient: Client = {
    id: newClientId,
    condo_name: condoName,
    syndic_name: syndicName,
    syndic_email: syndicEmail,
    user_id: linkedUserId,
    status: 'active',
    scheduled_inactivation_date: null,
    created_at: new Date().toISOString(),
  };

  const nextDb: LocalDatabaseSchema = {
    ...db,
    users: nextUsers,
    clients: [...db.clients, newClient],
    account_categories: [
      ...db.account_categories,
      ...createDefaultCategoriesForClient(newClientId),
    ],
  };

  saveLocalDb(nextDb);
  return newClient;
}

export async function updateClientManagement(
  clientId: string,
  input: UpdateClientManagementInput
): Promise<Client> {
  const today = getLocalTodayISO();
  let finalStatus = input.status;
  const schedDate = input.scheduled_inactivation_date || null;

  if (schedDate && schedDate <= today) {
    finalStatus = 'inactive';
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('clients')
      .update({
        status: finalStatus,
        scheduled_inactivation_date: schedDate,
      })
      .eq('id', clientId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data as Client;
  }

  const db = loadLocalDb();
  let updatedClient: Client | null = null;

  const updatedClients = db.clients.map((c) => {
    if (c.id !== clientId) return c;
    updatedClient = {
      ...c,
      status: finalStatus,
      scheduled_inactivation_date: schedDate,
    };
    return updatedClient;
  });

  if (!updatedClient) {
    throw new Error('Cliente não localizado.');
  }

  saveLocalDb({ ...db, clients: updatedClients });
  return updatedClient;
}

// =============================================================================
// Operações do Módulo Síndico (/app — Categorias e Lançamentos)
// =============================================================================

export async function fetchClientFinancialData(clientId: string): Promise<{
  categories: AccountCategory[];
  transactions: Transaction[];
}> {
  if (isSupabaseConfigured && supabase) {
    const [catRes, txRes] = await Promise.all([
      supabase.from('account_categories').select('*').eq('client_id', clientId),
      supabase
        .from('transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('due_date', { ascending: true }),
    ]);

    if (catRes.error) throw new Error(catRes.error.message);
    if (txRes.error) throw new Error(txRes.error.message);

    const transactions = ((txRes.data ?? []) as Transaction[]).map((t) => ({
      ...t,
      amount: Number(t.amount),
    }));

    return {
      categories: (catRes.data ?? []) as AccountCategory[],
      transactions,
    };
  }

  const db = loadLocalDb();
  return {
    categories: db.account_categories.filter((c) => c.client_id === clientId),
    transactions: db.transactions
      .filter((t) => t.client_id === clientId)
      .sort((a, b) => a.due_date.localeCompare(b.due_date)),
  };
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const today = getLocalTodayISO();
  const isFutureDate = input.due_date > today;
  const status = isFutureDate || input.forcePending ? 'pending' : 'realized';
  const effective_date = status === 'realized' ? input.due_date : null;

  let receipt_url: string | null = null;
  if (input.receiptFile) {
    receipt_url = await uploadReceiptFile(input.client_id, input.receiptFile);
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        client_id: input.client_id,
        category_id: input.category_id,
        type: input.type,
        counterparty: input.counterparty.trim(),
        amount: input.amount,
        due_date: input.due_date,
        effective_date,
        status,
        receipt_url,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return { ...(data as Transaction), amount: Number(data.amount) };
  }

  const db = loadLocalDb();
  const newTx: Transaction = {
    id: crypto.randomUUID(),
    client_id: input.client_id,
    category_id: input.category_id,
    type: input.type,
    counterparty: input.counterparty.trim(),
    amount: input.amount,
    due_date: input.due_date,
    effective_date,
    status,
    receipt_url,
    created_at: new Date().toISOString(),
  };

  saveLocalDb({
    ...db,
    transactions: [...db.transactions, newTx],
  });

  return newTx;
}

export async function confirmPendingTransaction(
  input: ConfirmTransactionInput
): Promise<Transaction> {
  if (!input.effective_date) {
    throw new Error('A Data de Efetivação Real é obrigatória.');
  }

  let uploadedReceiptUrl: string | undefined;
  if (input.receiptFile) {
    uploadedReceiptUrl = await uploadReceiptFile(input.client_id, input.receiptFile);
  }

  if (isSupabaseConfigured && supabase) {
    const updatePayload: Record<string, unknown> = {
      status: 'realized',
      effective_date: input.effective_date,
    };
    if (uploadedReceiptUrl !== undefined) {
      updatePayload.receipt_url = uploadedReceiptUrl;
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', input.transaction_id)
      .eq('client_id', input.client_id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return { ...(data as Transaction), amount: Number(data.amount) };
  }

  const db = loadLocalDb();
  let updated: Transaction | null = null;

  const nextTransactions = db.transactions.map((tx) => {
    if (tx.id !== input.transaction_id || tx.client_id !== input.client_id) return tx;
    updated = {
      ...tx,
      status: 'realized',
      effective_date: input.effective_date,
      receipt_url: uploadedReceiptUrl !== undefined ? uploadedReceiptUrl : tx.receipt_url,
    };
    return updated;
  });

  if (!updated) {
    throw new Error('Lançamento pendente não encontrado.');
  }

  saveLocalDb({ ...db, transactions: nextTransactions });
  return updated;
}

export async function createAnalyticalCategory(params: {
  client_id: string;
  name: string;
  type: 'income' | 'expense';
  parent_id: string | null;
}): Promise<AccountCategory> {
  const trimmed = params.name.trim();
  if (!trimmed) throw new Error('Informe o nome da conta.');

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('account_categories')
      .insert({
        client_id: params.client_id,
        name: trimmed,
        type: params.type,
        parent_id: params.parent_id,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data as AccountCategory;
  }

  const db = loadLocalDb();
  const created: AccountCategory = {
    id: crypto.randomUUID(),
    client_id: params.client_id,
    name: trimmed,
    type: params.type,
    parent_id: params.parent_id,
  };

  saveLocalDb({
    ...db,
    account_categories: [...db.account_categories, created],
  });

  return created;
}
