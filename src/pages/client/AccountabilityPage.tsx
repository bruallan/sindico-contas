import React, { useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { CashFlowChart } from '@/components/accountability/CashFlowChart';
import { HierarchicalDreTable } from '@/components/accountability/HierarchicalDreTable';
import { ReceiptCompactModal } from '@/components/accountability/ReceiptCompactModal';
import { MonthlyCashFlowPoint, Transaction } from '@/types/database';
import {
  formatYearMonthShort,
  getMonthsInRange,
  getRelativeYearMonth,
  getTransactionYearMonth,
} from '@/utils/formatters';

const MONTHS_OPTIONS = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Fev' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Abr' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Ago' },
  { value: '09', label: 'Set' },
  { value: '10', label: 'Out' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dez' },
];

interface MonthYearSelectorProps {
  label: string;
  value: string; // YYYY-MM
  years: number[];
  onChange: (nextYM: string) => void;
}

const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({
  label,
  value,
  years,
  onChange,
}) => {
  const [yStr, mStr] = value.split('-');

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs opacity-65 whitespace-nowrap">{label}</span>
      <div className="inline-flex items-center h-9 rounded-lg bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 px-2.5 gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-[#1A73E9] shrink-0" />
        <select
          aria-label={`${label} Mês`}
          value={mStr}
          onChange={(e) => onChange(`${yStr}-${e.target.value}`)}
          className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer pr-1"
        >
          {MONTHS_OPTIONS.map((m) => (
            <option
              key={m.value}
              value={m.value}
              className="bg-white dark:bg-[#15263B] text-[#0E1B2B] dark:text-[#E6EAED]"
            >
              {m.label}
            </option>
          ))}
        </select>
        <span className="opacity-30 text-xs">/</span>
        <select
          aria-label={`${label} Ano`}
          value={yStr}
          onChange={(e) => onChange(`${e.target.value}-${mStr}`)}
          className="bg-transparent text-xs font-medium tabular-nums focus:outline-none cursor-pointer"
        >
          {years.map((yr) => (
            <option
              key={yr}
              value={String(yr)}
              className="bg-white dark:bg-[#15263B] text-[#0E1B2B] dark:text-[#E6EAED]"
            >
              {yr}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export const AccountabilityPage: React.FC = () => {
  const { categories, transactions, loading } = useFinancialData();

  const [startYM, setStartYM] = useState<string>(() => getRelativeYearMonth(-3));
  const [endYM, setEndYM] = useState<string>(() => getRelativeYearMonth(2));

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
      {/* Topo: Filtro de Período (Mês/Ano Inicial e Mês/Ano Final) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-base font-semibold tracking-tight">Prestação de Contas</h1>

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
    </div>
  );
};
