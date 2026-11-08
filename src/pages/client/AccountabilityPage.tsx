import React, { useMemo, useState } from 'react';
import { Presentation } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { CashFlowChart } from '@/components/accountability/CashFlowChart';
import { HierarchicalDreTable } from '@/components/accountability/HierarchicalDreTable';
import { ReceiptCompactModal } from '@/components/accountability/ReceiptCompactModal';
import { MonthYearSelector } from '@/components/accountability/MonthYearSelector';
import { AccountabilityPresentationMode } from '@/components/accountability/AccountabilityPresentationMode';
import { MonthlyCashFlowPoint, Transaction } from '@/types/database';
import {
  formatYearMonthShort,
  getMonthsInRange,
  getRelativeYearMonth,
  getTransactionYearMonth,
} from '@/utils/formatters';

export const AccountabilityPage: React.FC = () => {
  const { session } = useAuth();
  const { categories, transactions, loading } = useFinancialData();

  const [startYM, setStartYM] = useState<string>(() => getRelativeYearMonth(-3));
  const [endYM, setEndYM] = useState<string>(() => getRelativeYearMonth(2));
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);

  const [receiptModalState, setReceiptModalState] = useState<{
    categoryName: string;
    yearMonth: string;
    transactions: Transaction[];
  } | null>(null);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const set = new Set<number>([
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1,
      currentYear + 2,
    ]);
    for (const tx of transactions) {
      const yr = Number(getTransactionYearMonth(tx).slice(0, 4));
      if (yr) set.add(yr);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [transactions]);

  const handleStartChange = (next: string) => {
    setStartYM(next);
    if (next > endYM) {
      setEndYM(next);
    }
  };

  const handleEndChange = (next: string) => {
    setEndYM(next);
    if (next < startYM) {
      setStartYM(next);
    }
  };

  const months = useMemo(() => getMonthsInRange(startYM, endYM), [startYM, endYM]);

  // Série agregada para o Gráfico Divergente de Fluxo de Caixa
  const chartData = useMemo<MonthlyCashFlowPoint[]>(() => {
    const map = new Map<string, MonthlyCashFlowPoint>();

    for (const ym of months) {
      map.set(ym, {
        yearMonth: ym,
        label: formatYearMonthShort(ym),
        incomeRealized: 0,
        incomePending: 0,
        expenseRealizedNeg: 0,
        expensePendingNeg: 0,
        expenseRealizedAbs: 0,
        expensePendingAbs: 0,
        netBalance: 0,
        hasOnlyPending: false,
      });
    }

    for (const tx of transactions) {
      const ym = getTransactionYearMonth(tx);
      const bucket = map.get(ym);
      if (!bucket) continue;

      if (tx.type === 'income') {
        if (tx.status === 'realized') {
          bucket.incomeRealized += tx.amount;
        } else {
          bucket.incomePending += tx.amount;
        }
      } else {
        if (tx.status === 'realized') {
          bucket.expenseRealizedAbs += tx.amount;
          bucket.expenseRealizedNeg -= tx.amount; // negativo (-Y)
        } else {
          bucket.expensePendingAbs += tx.amount;
          bucket.expensePendingNeg -= tx.amount; // negativo (-Y)
        }
      }
    }

    return months.map((ym) => {
      const item = map.get(ym)!;
      const totalIn = item.incomeRealized + item.incomePending;
      const totalOut = item.expenseRealizedAbs + item.expensePendingAbs;
      item.netBalance = totalIn - totalOut;
      item.hasOnlyPending =
        item.incomeRealized === 0 &&
        item.expenseRealizedAbs === 0 &&
        (item.incomePending > 0 || item.expensePendingAbs > 0);
      return item;
    });
  }, [months, transactions]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-80 rounded-lg bg-white/50 dark:bg-[#15263B]/50 animate-pulse" />
        <div className="h-[350px] rounded-xl bg-white/50 dark:bg-[#15263B]/50 animate-pulse" />
        <div className="h-44 rounded-xl bg-white/50 dark:bg-[#15263B]/50 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Topo: Título + Botão Apresentar + Filtro de Período */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight">Prestação de Contas</h1>

          {/* Botão de Apresentar para Assembleias (Oculta menu lateral e tela cheia) */}
          <button
            type="button"
            onClick={() => setIsPresentationOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-[#1A73E9] hover:bg-[#155fc0] text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer group"
            title="Abrir apresentação em tela cheia para assembleia (sem menu lateral)"
          >
            <Presentation className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span>Apresentar</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <MonthYearSelector
            label="Início"
            value={startYM}
            years={availableYears}
            onChange={handleStartChange}
          />
          <MonthYearSelector
            label="Fim"
            value={endYM}
            years={availableYears}
            onChange={handleEndChange}
          />
        </div>
      </div>

      {/* Gráfico de Fluxo de Caixa (Mixed Diverging Bar & Line Chart) */}
      <CashFlowChart data={chartData} />

      {/* Tabela Demonstrativa Hierárquica (Tree Table / DRE) */}
      <HierarchicalDreTable
        categories={categories}
        transactions={transactions}
        months={months}
        onOpenReceiptModal={(payload) => setReceiptModalState(payload)}
      />

      {/* Modal Compacto (max-w-md) de Comprovante e Metadados */}
      {receiptModalState && (
        <ReceiptCompactModal
          categoryName={receiptModalState.categoryName}
          yearMonth={receiptModalState.yearMonth}
          transactions={receiptModalState.transactions}
          onClose={() => setReceiptModalState(null)}
        />
      )}

      {/* Modo de Apresentação em Tela Cheia para Assembleias (Sem menu lateral) */}
      {isPresentationOpen && (
        <AccountabilityPresentationMode
          condoName={session?.client?.condo_name}
          syndicName={session?.client?.syndic_name}
          startYM={startYM}
          endYM={endYM}
          availableYears={availableYears}
          months={months}
          categories={categories}
          transactions={transactions}
          chartData={chartData}
          onStartChange={handleStartChange}
          onEndChange={handleEndChange}
          onClose={() => setIsPresentationOpen(false)}
          onOpenReceiptModal={(payload) => setReceiptModalState(payload)}
        />
      )}
    </div>
  );
};
