import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  confirmPendingTransaction,
  createAnalyticalCategory,
  createTransaction,
  fetchClientFinancialData,
} from '@/services/dataService';
import {
  AccountCategory,
  ConfirmTransactionInput,
  CreateTransactionInput,
  Transaction,
} from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

interface FinancialDataContextValue {
  categories: AccountCategory[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addTransaction: (
    input: Omit<CreateTransactionInput, 'client_id'>
  ) => Promise<Transaction>;
  confirmTransaction: (
    input: Omit<ConfirmTransactionInput, 'client_id'>
  ) => Promise<Transaction>;
  addCategory: (params: {
    name: string;
    type: 'income' | 'expense';
    parent_id: string | null;
  }) => Promise<AccountCategory>;
}

const FinancialDataContext = createContext<FinancialDataContextValue | undefined>(undefined);

export const FinancialDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const clientId = session?.client?.id ?? null;

  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!clientId) {
      setCategories([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await fetchClientFinancialData(clientId);
      setCategories(data.categories);
      setTransactions(data.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados financeiros.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  // Sincronização em tempo real com Supabase Postgres Changes (quando configurado)
  useEffect(() => {
    const sb = supabase;
    if (!isSupabaseConfigured || !sb || !clientId) return;

    const channel = sb
      .channel(`financial-sync-${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `client_id=eq.${clientId}` },
        () => {
          void reload();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'account_categories', filter: `client_id=eq.${clientId}` },
        () => {
          void reload();
        }
      )
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [clientId, reload]);

  const addTransaction = async (input: Omit<CreateTransactionInput, 'client_id'>) => {
    if (!clientId) throw new Error('Sessão de condomínio inválida.');
    const created = await createTransaction({ ...input, client_id: clientId });
    setTransactions((prev) =>
      [...prev, created].sort((a, b) => a.due_date.localeCompare(b.due_date))
    );
    return created;
  };

  const confirmTransaction = async (input: Omit<ConfirmTransactionInput, 'client_id'>) => {
    if (!clientId) throw new Error('Sessão de condomínio inválida.');
    const updated = await confirmPendingTransaction({ ...input, client_id: clientId });
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    return updated;
  };

  const addCategory = async (params: {
    name: string;
    type: 'income' | 'expense';
    parent_id: string | null;
  }) => {
    if (!clientId) throw new Error('Sessão de condomínio inválida.');
    const created = await createAnalyticalCategory({ ...params, client_id: clientId });
    setCategories((prev) => [...prev, created]);
    return created;
  };

  return (
    <FinancialDataContext.Provider
      value={{
        categories,
        transactions,
        loading,
        error,
        reload,
        addTransaction,
        confirmTransaction,
        addCategory,
      }}
    >
      {children}
    </FinancialDataContext.Provider>
  );
};

export function useFinancialData(): FinancialDataContextValue {
  const ctx = useContext(FinancialDataContext);
  if (!ctx) {
    throw new Error('useFinancialData deve ser utilizado dentro de um FinancialDataProvider.');
  }
  return ctx;
}
