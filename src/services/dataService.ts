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
const MAX_CLIENT_SLOTS = 16;

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

    const configuredAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.toLowerCase();
    const isAdmin =
      user.app_metadata?.role === 'admin' ||
      user.user_metadata?.role === 'admin' ||
      (configuredAdminEmail && user.email?.toLowerCase() === configuredAdminEmail);

    if (isAdmin) {
      return {
        id: user.id,
        email: user.email ?? '',
        role: 'admin',
        client: null,
      };
    }

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!clientData) return null;

    const client = clientData as Client;
    if (client.status === 'inactive' || isClientScheduledExpired(client)) {
      await supabase.auth.signOut();
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      role: 'syndic',
      client,
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

    if (account.role === 'admin') {
      return { id: account.id, email: account.email, role: 'admin', client: null };
    }

    const client = db.clients.find((c) => c.user_id === account.id) ?? null;
    if (!client || client.status === 'inactive' || isClientScheduledExpired(client)) {
      localStorage.removeItem(LOCAL_SESSION_KEY);
      return null;
    }

    return { id: account.id, email: account.email, role: 'syndic', client };
  } catch {
    return null;
  }
}

export async function signInSyndic(email: string, password: string): Promise<AuthUserSession> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    await supabase.rpc('enforce_scheduled_inactivations').then(() => undefined, () => undefined);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      throw new Error('E-mail ou senha inválidos.');
    }

    if (data.user.app_metadata?.role === 'admin' || data.user.user_metadata?.role === 'admin') {
      await supabase.auth.signOut();
      throw new Error('Utilize a rota /admin/login para credenciais administrativas.');
    }

    const { data: clientRow, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (clientError || !clientRow) {
      await supabase.auth.signOut();
      throw new Error('Nenhum condomínio vinculado a este usuário.');
    }

    const client = clientRow as Client;
    if (client.status === 'inactive' || isClientScheduledExpired(client)) {
      if (client.status === 'active') {
        await supabase.from('clients').update({ status: 'inactive' }).eq('id', client.id);
      }
      await supabase.auth.signOut();
      throw new Error('Acesso do condomínio encontra-se inativo. Contate a administração.');
    }

    return {
      id: data.user.id,
      email: data.user.email ?? normalizedEmail,
      role: 'syndic',
      client,
    };
  }

  // Modo Local Persistente
  const db = loadLocalDb();
  const account = db.users.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
  );

  if (!account) {
    throw new Error('E-mail ou senha inválidos.');
  }

  if (account.role === 'admin') {
    throw new Error('Credencial administrativa. Acesse exclusivamente por /admin/login.');
  }

  const client = db.clients.find((c) => c.user_id === account.id);
  if (!client) {
    throw new Error('Nenhum condomínio vinculado a este síndico.');
  }

  if (client.status === 'inactive' || isClientScheduledExpired(client)) {
    throw new Error('O acesso deste condomínio encontra-se inativo. Contate o administrador.');
  }

  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ userId: account.id }));
  return {
    id: account.id,
    email: account.email,
    role: 'syndic',
    client,
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

    const { data: clientRow } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', data.user.id)
      .maybeSingle();

    let resolvedClient = clientRow as Client | null;

    if (!resolvedClient) {
      const { data: inserted, error: insertErr } = await supabase
        .from('clients')
        .insert({
          condo_name: params.condo_name.trim(),
          syndic_name: params.syndic_name.trim(),
          syndic_email: normalizedEmail,
          user_id: data.user.id,
          status: 'active',
        })
        .select('*')
        .single();

      if (insertErr) {
        throw new Error(insertErr.message);
      }
      resolvedClient = inserted as Client;
    }

    return {
      id: data.user.id,
      email: normalizedEmail,
      role: 'syndic',
      client: resolvedClient,
    };
  }

  // Modo Local Persistente
  const db = loadLocalDb();
  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('Já existe um usuário cadastrado com este e-mail.');
  }

  const newUserId = `u-syndic-${crypto.randomUUID().slice(0, 8)}`;

  // Verifica se o Admin já pré-cadastrou um slot com este e-mail
  const existingPreClient = db.clients.find(
    (c) => c.syndic_email?.toLowerCase() === normalizedEmail && !c.user_id
  );

  if (!existingPreClient && db.clients.length >= MAX_CLIENT_SLOTS) {
    throw new Error('Limite máximo de 16 condomínios atingido na matriz administrativa.');
  }

  let targetClient: Client;
  let updatedCategories = db.account_categories;
  let updatedClients = db.clients;

  if (existingPreClient) {
    targetClient = {
      ...existingPreClient,
      user_id: newUserId,
      condo_name: params.condo_name.trim() || existingPreClient.condo_name,
      syndic_name: params.syndic_name.trim() || existingPreClient.syndic_name,
    };
    updatedClients = db.clients.map((c) => (c.id === targetClient.id ? targetClient : c));
  } else {
    const newClientId = crypto.randomUUID();
    targetClient = {
      id: newClientId,
      condo_name: params.condo_name.trim(),
      syndic_name: params.syndic_name.trim(),
      syndic_email: normalizedEmail,
      user_id: newUserId,
      status: 'active',
      scheduled_inactivation_date: null,
      created_at: new Date().toISOString(),
    };
    updatedClients = [...db.clients, targetClient];
    updatedCategories = [
      ...db.account_categories,
      ...createDefaultCategoriesForClient(newClientId),
    ];
  }

  if (targetClient.status === 'inactive') {
    throw new Error('Este condomínio encontra-se inativo pela administração.');
  }

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
    account_categories: updatedCategories,
  };

  saveLocalDb(nextDb);
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ userId: newUserId }));

  return {
    id: newUserId,
    email: normalizedEmail,
    role: 'syndic',
    client: targetClient,
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

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      throw new Error('Credenciais administrativas inválidas.');
    }

    const configuredAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.toLowerCase();
    const isAdmin =
      data.user.app_metadata?.role === 'admin' ||
      data.user.user_metadata?.role === 'admin' ||
      (configuredAdminEmail && data.user.email?.toLowerCase() === configuredAdminEmail);

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
    };
  }

  // Modo Local Persistente
  const db = loadLocalDb();
  const adminAccount = db.users.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === password && u.role === 'admin'
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
  };
}

export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem(LOCAL_SESSION_KEY);
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

    // Garante sincronização caso haja agendamento vencido ainda não processado
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
  const syndicEmail = input.syndic_email?.trim().toLowerCase() || null;

  if (!condoName || !syndicName) {
    throw new Error('Preencha o Nome do Condomínio e o Nome do Síndico.');
  }

  if (isSupabaseConfigured && supabase) {
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

    if (error) throw new Error(error.message);
    return data as Client;
  }

  const db = loadLocalDb();
  if (db.clients.length >= MAX_CLIENT_SLOTS) {
    throw new Error('Todos os 16 slots da matriz 4x4 já estão ocupados.');
  }

  if (syndicEmail && db.users.some((u) => u.email.toLowerCase() === syndicEmail)) {
    throw new Error('Este e-mail já está em uso por outro usuário.');
  }

  const newClientId = crypto.randomUUID();
  let linkedUserId: string | null = null;
  const nextUsers = [...db.users];

  if (syndicEmail) {
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

  // Se a data programada já chegou (<= hoje), inativa automaticamente
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
