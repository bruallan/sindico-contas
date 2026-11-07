import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  Upload,
  X,
  Plus,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { AccountType, Transaction } from '@/types/database';
import {
  formatCurrencyBRL,
  formatDateBR,
  getAnalyticalLeafCategories,
  getLocalTodayISO,
  parseCurrencyDigits,
} from '@/utils/formatters';

export const TransactionsPage: React.FC = () => {
  const {
    categories,
    transactions,
    loading,
    addTransaction,
    confirmTransaction,
    addCategory,
  } = useFinancialData();

  const todayISO = getLocalTodayISO();

  // Estado do Formulário de Cadastro Manual
  const [operationType, setOperationType] = useState<AccountType>('income');
  const [categoryId, setCategoryId] = useState<string>('');
  const [counterparty, setCounterparty] = useState<string>('');
  const [amountFormatted, setAmountFormatted] = useState<string>('');
  const [amountNumeric, setAmountNumeric] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>(todayISO);
  const [markAsPending, setMarkAsPending] = useState<boolean>(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Modal rápido opcional para adicionar nova conta analítica na árvore
  const [isNewCatOpen, setIsNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParentId, setNewCatParentId] = useState<string>('');
  const [creatingCat, setCreatingCat] = useState(false);

  // Modal de Confirmação de Efetivação (Fila de Aprovação Manual)
  const [confirmingTx, setConfirmingTx] = useState<Transaction | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<string>(todayISO);
  const [definitiveReceipt, setDefinitiveReceipt] = useState<File | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState<boolean>(false);

  const groupedAnalyticalCategories = useMemo(
    () => getAnalyticalLeafCategories(categories, operationType),
    [categories, operationType]
  );

  const parentGroupsForType = useMemo(
    () => categories.filter((c) => c.type === operationType && c.parent_id === null),
    [categories, operationType]
  );

  const categoryNameMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  // Mantém uma conta analítica selecionada válida ao alternar Entrada/Saída
  useEffect(() => {
    const allLeaves = groupedAnalyticalCategories.flatMap((g) => g.leaves);
    if (allLeaves.length === 0) {
      setCategoryId('');
      return;
    }
    if (!allLeaves.some((l) => l.id === categoryId)) {
      setCategoryId(allLeaves[0].id);
    }
  }, [groupedAnalyticalCategories, categoryId]);

  const isFutureDate = Boolean(dueDate && dueDate > todayISO);
  const willSaveAsPending = isFutureDate || markAsPending;

  const pendingQueue = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'pending')
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [transactions]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { numeric, formatted } = parseCurrencyDigits(e.target.value);
    setAmountNumeric(numeric);
    setAmountFormatted(formatted);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setReceiptFile(file);
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFeedbackMsg(null);

    if (!categoryId) {
      setFormError('Selecione uma conta analítica.');
      return;
    }
    if (!counterparty.trim()) {
      setFormError('Informe o destinatário ou remetente.');
      return;
    }
    if (amountNumeric <= 0) {
      setFormError('Informe um valor maior que R$ 0,00.');
      return;
    }
    if (!dueDate) {
      setFormError('Selecione a data de execução.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await addTransaction({
        category_id: categoryId,
        type: operationType,
        counterparty,
        amount: amountNumeric,
        due_date: dueDate,
        forcePending: markAsPending,
        receiptFile,
      });

      // Limpa campos mantendo tipo e categoria para agilidade operacional
      setCounterparty('');
      setAmountFormatted('');
      setAmountNumeric(0);
      setMarkAsPending(false);
      setReceiptFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setFeedbackMsg(
        created.status === 'pending'
          ? 'Lançamento registrado como Pendente e projetado na Prestação de Contas.'
          : 'Lançamento efetivado e sincronizado na Prestação de Contas.'
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar lançamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirmModal = (tx: Transaction) => {
    setConfirmingTx(tx);
    setEffectiveDate(todayISO);
    setDefinitiveReceipt(null);
    setConfirmError(null);
  };

  const handleConfirmRealization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingTx) return;
    if (!effectiveDate) {
      setConfirmError('Informe a Data de Efetivação Real.');
      return;
    }

    setConfirmError(null);
    setConfirmSubmitting(true);
    try {
      await confirmTransaction({
        transaction_id: confirmingTx.id,
        effective_date: effectiveDate,
        receiptFile: definitiveReceipt,
      });
      setConfirmingTx(null);
      setFeedbackMsg('Efetivação confirmada. Valores convertidos para saldo realizado.');
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Falha ao confirmar efetivação.');
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const handleCreateNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const created = await addCategory({
        name: newCatName,
        type: operationType,
        parent_id: newCatParentId || null,
      });
      setCategoryId(created.id);
      setNewCatName('');
      setIsNewCatOpen(false);
    } finally {
      setCreatingCat(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight">Lançamentos Financeiros</h1>
      </div>

      {feedbackMsg && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[#2AC38B]/10 border border-[#2AC38B]/30 px-4 py-2.5 text-xs text-[#2AC38B]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA (5 cols): Formulário de Cadastro Manual */}
        <section className="lg:col-span-5 rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-6">
          <h2 className="text-sm font-semibold mb-4">Novo Lançamento</h2>

          {formError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 px-3 py-2.5 text-xs text-[#EF4444]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitTransaction} className="space-y-4">
            {/* Tipo de Operação */}
            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-80">
                Tipo de Operação
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#E6EAED]/70 dark:bg-[#0E1B2B]">
                <button
                  type="button"
                  onClick={() => setOperationType('income')}
                  className={`h-9 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                    operationType === 'income'
                      ? 'bg-white dark:bg-[#15263B] text-[#2AC38B] shadow-sm'
                      : 'opacity-65 hover:opacity-95'
                  }`}
                >
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                  <span>Conta a Receber</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOperationType('expense')}
                  className={`h-9 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                    operationType === 'expense'
                      ? 'bg-white dark:bg-[#15263B] text-[#EF4444] shadow-sm'
                      : 'opacity-65 hover:opacity-95'
                  }`}
                >
                  <ArrowDownCircle className="h-3.5 w-3.5" />
                  <span>Conta a Pagar</span>
                </button>
              </div>
            </div>

            {/* Conta / Categoria Analítica */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium opacity-80">Conta / Categoria</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewCatParentId(parentGroupsForType[0]?.id ?? '');
                    setIsNewCatOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-[#1A73E9] hover:underline font-medium"
                >
                  <Plus className="h-3 w-3" />
                  <span>Nova conta</span>
                </button>
              </div>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg text-xs font-medium bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
              >
                {groupedAnalyticalCategories.map((group) => (
                  <optgroup
                    key={group.groupName}
                    label={group.groupName}
                    className="bg-white dark:bg-[#15263B] text-[#0E1B2B] dark:text-[#E6EAED]"
                  >
                    {group.leaves.map((leaf) => (
                      <option key={leaf.id} value={leaf.id}>
                        {leaf.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Destinatário / Remetente */}
            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-80">
                {operationType === 'income' ? 'Remetente / Origem' : 'Destinatário / Fornecedor'}
              </label>
              <input
                type="text"
                required
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder={
                  operationType === 'income'
                    ? 'Ex: Arrecadação Condominial Unid. 101-408'
                    : 'Ex: Concessionária de Energia S.A.'
                }
                className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
              />
            </div>

            {/* Valor (R$) + Data de Execução */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-80">Valor (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-55 select-none">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={amountFormatted}
                    onChange={handleAmountChange}
                    placeholder="0,00"
                    className="w-full h-10 pl-9 pr-3 rounded-lg text-sm font-medium tabular-nums bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-80">
                  Data de Execução
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-sm tabular-nums bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
                />
              </div>
            </div>

            {/* Marcação de Lançamento Previsto / Pendente */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={willSaveAsPending}
                disabled={isFutureDate}
                onChange={(e) => setMarkAsPending(e.target.checked)}
                className="h-4 w-4 rounded border-[#0E1B2B]/25 text-[#1A73E9] focus:ring-[#1A73E9]"
              />
              <span className="text-xs opacity-80">
                {isFutureDate
                  ? 'Data futura detectada — será salvo automaticamente como Lançamento Pendente'
                  : 'Marcar como previsto (Lançamento Pendente)'}
              </span>
            </label>

            {/* Anexo de Comprovante */}
            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-80">
                Comprovante (Imagem ou PDF)
              </label>
              <label className="flex items-center justify-between gap-2 px-3 h-10 rounded-lg border border-dashed border-[#0E1B2B]/20 dark:border-[#E6EAED]/20 bg-[#E6EAED]/30 dark:bg-[#0E1B2B]/60 hover:border-[#1A73E9] cursor-pointer transition-colors text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Upload className="h-3.5 w-3.5 text-[#1A73E9] shrink-0" />
                  <span className="truncate opacity-80">
                    {receiptFile ? receiptFile.name : 'Selecionar imagem ou PDF...'}
                  </span>
                </div>
                {receiptFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setReceiptFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="opacity-60 hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-lg bg-[#1A73E9] hover:bg-[#1A73E9]/90 disabled:opacity-55 text-white text-sm font-medium transition-colors"
            >
              {submitting ? 'Salvando...' : 'Lançar'}
            </button>
          </form>
        </section>

        {/* COLUNA DIREITA (7 cols): Fila de Aprovação Manual de Lançamentos Pendentes */}
        <section className="lg:col-span-7 rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Fila de Aprovação Manual</h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums bg-[#1A73E9]/10 text-[#1A73E9]">
                {pendingQueue.length}
              </span>
            </div>
            <span className="text-xs opacity-55">Lançamentos Pendentes / Previstos</span>
          </div>

          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-16 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B]/50 animate-pulse"
                />
              ))}
            </div>
          ) : pendingQueue.length === 0 ? (
            <div className="py-12 rounded-lg border border-dashed border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 flex flex-col items-center justify-center text-center px-4">
              <CheckCircle2 className="h-5 w-5 text-[#2AC38B] mb-2 opacity-80" />
              <p className="text-xs font-medium">Nenhum lançamento pendente de aprovação</p>
              <p className="text-[11px] opacity-55 mt-0.5">
                Lançamentos com data futura aparecerão aqui para confirmação de efetivação.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#0E1B2B]/10 dark:divide-[#E6EAED]/10">
              {pendingQueue.map((tx) => {
                const isIncome = tx.type === 'income';
                return (
                  <div
                    key={tx.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            isIncome ? 'bg-[#2AC38B]/60' : 'bg-[#EF4444]/60'
                          }`}
                        />
                        <p className="text-xs font-semibold truncate">{tx.counterparty}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-65 pl-4">
                        <span>{categoryNameMap.get(tx.category_id) ?? 'Conta'}</span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock className="h-3 w-3" />
                          Previsto: {formatDateBR(tx.due_date)}
                        </span>
                        {tx.receipt_url && (
                          <span className="inline-flex items-center gap-1 text-[#1A73E9]">
                            <FileCheck className="h-3 w-3" />
                            Anexo prévio
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-4 sm:pl-0 shrink-0">
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          isIncome ? 'text-[#2AC38B]/80' : 'text-[#EF4444]/80'
                        }`}
                      >
                        {isIncome
                          ? formatCurrencyBRL(tx.amount)
                          : `-${formatCurrencyBRL(tx.amount)}`}
                      </span>

                      <button
                        type="button"
                        onClick={() => openConfirmModal(tx)}
                        className="h-8 px-3 rounded-lg bg-[#1A73E9] hover:bg-[#1A73E9]/90 text-white text-xs font-medium transition-colors whitespace-nowrap"
                      >
                        Confirmar Efetivação
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal Compacto: Confirmar Efetivação de Lançamento Pendente */}
      {confirmingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">Confirmar Efetivação</h3>
                <p className="text-xs opacity-65 truncate mt-0.5">{confirmingTx.counterparty}</p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingTx(null)}
                className="h-7 w-7 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] p-3 mb-4 flex items-center justify-between text-xs">
              <span className="opacity-70">
                Previsto em {formatDateBR(confirmingTx.due_date)}
              </span>
              <span
                className={`font-semibold tabular-nums ${
                  confirmingTx.type === 'income' ? 'text-[#2AC38B]' : 'text-[#EF4444]'
                }`}
              >
                {formatCurrencyBRL(confirmingTx.amount)}
              </span>
            </div>

            {confirmError && (
              <div className="mb-3 flex items-start gap-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 px-3 py-2 text-xs text-[#EF4444]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{confirmError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmRealization} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-85">
                  Data de Efetivação Real *
                </label>
                <input
                  type="date"
                  required
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-sm tabular-nums bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-85">
                  Comprovante Definitivo (Imagem ou PDF)
                </label>
                <label className="flex items-center justify-between gap-2 px-3 h-10 rounded-lg border border-dashed border-[#0E1B2B]/20 dark:border-[#E6EAED]/20 bg-[#E6EAED]/30 dark:bg-[#0E1B2B]/60 hover:border-[#1A73E9] cursor-pointer transition-colors text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Upload className="h-3.5 w-3.5 text-[#1A73E9] shrink-0" />
                    <span className="truncate opacity-80">
                      {definitiveReceipt
                        ? definitiveReceipt.name
                        : confirmingTx.receipt_url
                          ? 'Substituir comprovante atual (opcional)...'
                          : 'Anexar comprovante definitivo...'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setDefinitiveReceipt(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-1 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmingTx(null)}
                  className="h-9 px-4 rounded-lg text-xs font-medium border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={confirmSubmitting}
                  className="h-9 px-4 rounded-lg text-xs font-medium bg-[#2AC38B] hover:bg-[#2AC38B]/90 disabled:opacity-50 text-[#0E1B2B] font-semibold"
                >
                  {confirmSubmitting ? 'Efetivando...' : 'Confirmar e Efetivar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Compacto Opcional: Nova Conta Analítica na Árvore */}
      {isNewCatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Nova Conta Analítica</h3>
              <button
                type="button"
                onClick={() => setIsNewCatOpen(false)}
                className="h-7 w-7 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium mb-1 opacity-80">Grupo Pai</label>
                <select
                  value={newCatParentId}
                  onChange={(e) => setNewCatParentId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg text-xs bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
                >
                  {parentGroupsForType.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 opacity-80">
                  Nome da Conta Analítica
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: Manutenção de Gerador"
                  className="w-full h-9 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNewCatOpen(false)}
                  className="h-8 px-3 rounded-lg text-xs border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingCat}
                  className="h-8 px-3 rounded-lg text-xs font-medium bg-[#1A73E9] text-white"
                >
                  {creatingCat ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
