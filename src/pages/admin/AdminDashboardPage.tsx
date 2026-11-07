import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Lock,
  LogOut,
  X,
  CalendarClock,
  AlertCircle,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggleButton } from '@/contexts/ThemeContext';
import { CentriaxLogo } from '@/components/CentriaxLogo';
import {
  createNewClientSlot,
  fetchAllClients,
  updateClientManagement,
} from '@/services/dataService';
import { Client, ClientStatus } from '@/types/database';
import { formatDateBR, getLocalTodayISO } from '@/utils/formatters';

const TOTAL_SLOTS = 16;

export const AdminDashboardPage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Novo Cliente
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCondoName, setNewCondoName] = useState('');
  const [newSyndicName, setNewSyndicName] = useState('');
  const [newSyndicEmail, setNewSyndicEmail] = useState('');
  const [newInitialPassword, setNewInitialPassword] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Modal Gerenciamento do Cliente
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [manageStatus, setManageStatus] = useState<ClientStatus>('active');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [manageError, setManageError] = useState<string | null>(null);
  const [savingManage, setSavingManage] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      const list = await fetchAllClients();
      setClients(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.condo_name.toLowerCase().includes(q) ||
        c.syndic_name.toLowerCase().includes(q) ||
        (c.syndic_email && c.syndic_email.toLowerCase().includes(q))
    );
  }, [clients, searchTerm]);

  // Matriz fixa 4x4 (16 posições)
  const slots = useMemo(() => {
    return Array.from({ length: TOTAL_SLOTS }, (_, index) => filteredClients[index] ?? null);
  }, [filteredClients]);

  const isCapacityReached = clients.length >= TOTAL_SLOTS;

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const openCreateModal = () => {
    setNewCondoName('');
    setNewSyndicName('');
    setNewSyndicEmail('');
    setNewInitialPassword('123456');
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const created = await createNewClientSlot({
        condo_name: newCondoName,
        syndic_name: newSyndicName,
        syndic_email: newSyndicEmail,
        initial_password: newInitialPassword || '123456',
      });
      setClients((prev) => [...prev, created].slice(0, TOTAL_SLOTS));
      setIsCreateOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao cadastrar cliente.');
    } finally {
      setCreating(false);
    }
  };

  const openManageModal = (client: Client) => {
    setSelectedClient(client);
    setManageStatus(client.status);
    setScheduledDate(client.scheduled_inactivation_date ?? '');
    setManageError(null);
  };

  const handleSaveManagement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    setManageError(null);
    setSavingManage(true);
    try {
      const updated = await updateClientManagement(selectedClient.id, {
        status: manageStatus,
        scheduled_inactivation_date: scheduledDate ? scheduledDate : null,
      });
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelectedClient(null);
    } catch (err) {
      setManageError(err instanceof Error ? err.message : 'Erro ao atualizar status.');
    } finally {
      setSavingManage(false);
    }
  };

  const handleImmediateStatusToggle = async (nextStatus: ClientStatus) => {
    if (!selectedClient || savingManage) return;
    const prevStatus = manageStatus;
    const nextSched = nextStatus === 'inactive' ? '' : scheduledDate;
    setManageStatus(nextStatus);
    setScheduledDate(nextSched);
    setManageError(null);
    setSavingManage(true);
    try {
      const updated = await updateClientManagement(selectedClient.id, {
        status: nextStatus,
        scheduled_inactivation_date: nextSched ? nextSched : null,
      });
      setSelectedClient(updated);
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setManageStatus(prevStatus);
      setManageError(err instanceof Error ? err.message : 'Erro ao alternar status.');
    } finally {
      setSavingManage(false);
    }
  };

  const todayISO = getLocalTodayISO();

  return (
    <div className="min-h-screen flex flex-col bg-[#E6EAED] dark:bg-[#0E1B2B] text-[#0E1B2B] dark:text-[#E6EAED]">
      {/* Cabeçalho Principal */}
      <header className="h-20 border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 bg-white dark:bg-[#15263B]">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CentriaxLogo size="sm" />
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 text-xs">
              <span className="font-semibold">Painel Master</span>
              <span className="tabular-nums px-2 py-0.5 rounded-full bg-[#1A73E9]/10 text-[#1A73E9] font-medium">
                {clients.length}/{TOTAL_SLOTS} slots
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggleButton />
            <button
              type="button"
              onClick={handleLogout}
              title="Encerrar sessão master"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 bg-transparent hover:border-[#EF4444]/60 hover:text-[#EF4444] text-xs font-medium transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Barra Superior: Pesquisa em Tempo Real + Botão Primário */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-7">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-45 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por condomínio, síndico ou e-mail..."
              className="w-full h-10 pl-10 pr-4 rounded-lg text-sm bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 focus:outline-none focus:border-[#1A73E9] transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={isCapacityReached}
            className="h-10 px-4 rounded-lg bg-[#1A73E9] hover:bg-[#1A73E9]/90 disabled:opacity-45 disabled:cursor-not-allowed text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>+ Cadastrar Novo Cliente</span>
          </button>
        </div>

        {/* Matriz 4x4 Fixa (16 Posições) */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: TOTAL_SLOTS }).map((_, idx) => (
              <div
                key={idx}
                className="h-36 rounded-xl bg-white/40 dark:bg-[#15263B]/40 animate-pulse border border-[#0E1B2B]/5 dark:border-[#E6EAED]/5"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {slots.map((client, index) => {
              if (!client) {
                // Slot bloqueado (cinza, opaco, ícone discreto de cadeado)
                return (
                  <div
                    key={`locked-slot-${index}`}
                    aria-label={`Slot bloqueado ${index + 1}`}
                    className="h-36 rounded-xl border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 bg-[#0E1B2B]/[0.04] dark:bg-[#15263B]/45 opacity-55 flex flex-col items-center justify-center gap-1.5 select-none"
                  >
                    <Lock className="h-4 w-4 text-[#0E1B2B]/35 dark:text-[#E6EAED]/30" />
                    <span className="text-[10px] uppercase tracking-wider text-[#0E1B2B]/35 dark:text-[#E6EAED]/30 font-semibold">
                      Slot #{index + 1}
                    </span>
                  </div>
                );
              }

              const hasScheduledInactivation =
                client.status === 'active' &&
                Boolean(client.scheduled_inactivation_date) &&
                (client.scheduled_inactivation_date ?? '') > todayISO;

              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => openManageModal(client)}
                  className={`h-36 rounded-xl p-5 text-left flex flex-col justify-between border transition-all bg-white dark:bg-[#15263B] hover:border-[#1A73E9] dark:hover:border-[#1A73E9] focus:outline-none focus:ring-2 focus:ring-[#1A73E9]/30 ${
                    client.status === 'inactive'
                      ? 'border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 opacity-70 bg-opacity-70'
                      : 'border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 shadow-sm'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <h2 className="font-semibold text-sm leading-snug truncate">
                      {client.condo_name}
                    </h2>
                    <p className="text-xs text-[#0E1B2B]/65 dark:text-[#E6EAED]/65 truncate">
                      {client.syndic_name}
                    </p>
                    {client.syndic_email && (
                      <p className="text-[11px] text-[#1A73E9] truncate flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{client.syndic_email}</span>
                      </p>
                    )}
                  </div>

                  {/* Indicador Visual Discreto de Status */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#0E1B2B]/5 dark:border-[#E6EAED]/5">
                    {client.status === 'inactive' ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#EF4444]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                        Inativo
                      </span>
                    ) : hasScheduledInactivation ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#1A73E9]">
                        <CalendarClock className="h-3 w-3" />
                        Inativa em {formatDateBR(client.scheduled_inactivation_date)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#2AC38B]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2AC38B]" />
                        Ativo
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal: Cadastrar Novo Cliente */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/15 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">Cadastrar Novo Condomínio</h3>
                <p className="text-xs opacity-60 mt-0.5">
                  Autoriza o acesso e desbloqueia a posição #{clients.length + 1} na matriz 4x4
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 px-3 py-2 text-xs text-[#EF4444]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium mb-1 opacity-80">
                  Nome do Condomínio *
                </label>
                <input
                  type="text"
                  required
                  value={newCondoName}
                  onChange={(e) => setNewCondoName(e.target.value)}
                  placeholder="Ex: Condomínio Parque das Nações"
                  className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 opacity-80">
                  Nome do Síndico *
                </label>
                <input
                  type="text"
                  required
                  value={newSyndicName}
                  onChange={(e) => setNewSyndicName(e.target.value)}
                  placeholder="Nome completo do síndico"
                  className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium opacity-80">
                    E-mail do Síndico (Chave de Login) *
                  </label>
                  <span className="text-[10px] text-[#1A73E9] font-medium">Suporta múltiplos condomínios</span>
                </div>
                <input
                  type="email"
                  required
                  value={newSyndicEmail}
                  onChange={(e) => setNewSyndicEmail(e.target.value)}
                  placeholder="sindico@condominio.com.br"
                  className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
                />
                <p className="text-[11px] opacity-60 mt-1">
                  O síndico só conseguirá acessar o sistema utilizando exatamente este e-mail. Se já tiver outro condomínio cadastrado com este e-mail, ambos ficarão vinculados a ele.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 opacity-80">
                  Senha Inicial de Acesso (padrão: 123456)
                </label>
                <input
                  type="password"
                  value={newInitialPassword}
                  onChange={(e) => setNewInitialPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-9 px-4 rounded-lg text-xs font-medium border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="h-9 px-4 rounded-lg text-xs font-medium bg-[#1A73E9] hover:bg-[#1A73E9]/90 disabled:opacity-50 text-white"
                >
                  {creating ? 'Autorizando...' : 'Autorizar e Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gerenciamento do Cliente */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/15 p-6 shadow-xl">
            <div className="flex items-start justify-between mb-5">
              <div className="min-w-0 pr-3">
                <h3 className="text-base font-semibold truncate">{selectedClient.condo_name}</h3>
                <p className="text-xs opacity-65 truncate mt-0.5">{selectedClient.syndic_name}</p>
                {selectedClient.syndic_email && (
                  <p className="text-xs text-[#1A73E9] truncate mt-0.5">{selectedClient.syndic_email}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {manageError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 px-3 py-2 text-xs text-[#EF4444]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{manageError}</span>
              </div>
            )}

            <form onSubmit={handleSaveManagement} className="space-y-5">
              {/* Alternância Imediata de Status */}
              <div>
                <label className="block text-xs font-medium mb-2 opacity-80">
                  Status Operacional de Acesso
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#E6EAED]/70 dark:bg-[#0E1B2B]">
                  <button
                    type="button"
                    onClick={() => handleImmediateStatusToggle('active')}
                    className={`h-9 rounded-md text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                      manageStatus === 'active'
                        ? 'bg-white dark:bg-[#15263B] text-[#2AC38B] shadow-sm font-semibold'
                        : 'opacity-60 hover:opacity-90'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-[#2AC38B]" />
                    Ativo (Permite Acesso)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImmediateStatusToggle('inactive')}
                    className={`h-9 rounded-md text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                      manageStatus === 'inactive'
                        ? 'bg-white dark:bg-[#15263B] text-[#EF4444] shadow-sm font-semibold'
                        : 'opacity-60 hover:opacity-90'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                    Inativo (Bloqueado)
                  </button>
                </div>
                <p className="text-[11px] opacity-60 mt-1.5">
                  Ao marcar como Inativo, o síndico não conseguirá mais entrar neste condomínio.
                </p>
              </div>

              {/* Programar Inativação Automática */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium opacity-80">
                    Programar Inativação Automática
                  </label>
                  {scheduledDate && (
                    <button
                      type="button"
                      onClick={() => setScheduledDate('')}
                      className="text-[11px] text-[#1A73E9] hover:underline"
                    >
                      Limpar data
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={scheduledDate}
                  disabled={manageStatus === 'inactive'}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 disabled:opacity-45 focus:outline-none focus:border-[#1A73E9]"
                />
                <p className="text-[11px] opacity-55 mt-1.5">
                  O acesso a este condomínio será revogado automaticamente quando a data programada chegar.
                </p>
              </div>

              <div className="pt-1 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="h-9 px-4 rounded-lg text-xs font-medium border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingManage}
                  className="h-9 px-4 rounded-lg text-xs font-medium bg-[#1A73E9] hover:bg-[#1A73E9]/90 disabled:opacity-50 text-white"
                >
                  {savingManage ? 'Aplicando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
