import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Paperclip } from 'lucide-react';
import {
  AccountCategory,
  AccountType,
  CategoryTreeNode,
  CellAggregation,
  Transaction,
} from '@/types/database';
import {
  buildCategoryTree,
  formatCurrencyBRL,
  formatYearMonthShort,
  getTransactionYearMonth,
} from '@/utils/formatters';

interface HierarchicalDreTableProps {
  categories: AccountCategory[];
  transactions: Transaction[];
  months: string[]; // YYYY-MM[]
  onOpenReceiptModal: (params: {
    categoryName: string;
    yearMonth: string;
    transactions: Transaction[];
  }) => void;
}

function emptyCell(): CellAggregation {
  return { realized: 0, pending: 0, total: 0, transactions: [] };
}

export const HierarchicalDreTable: React.FC<HierarchicalDreTableProps> = ({
  categories,
  transactions,
  months,
  onOpenReceiptModal,
}) => {
  // Estado inicial oculto: todos os níveis recolhidos (exibe apenas Total de Entradas, Total de Saídas e Saldo)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const monthSet = useMemo(() => new Set(months), [months]);

  const incomeTree = useMemo(() => buildCategoryTree(categories, 'income'), [categories]);
  const expenseTree = useMemo(() => buildCategoryTree(categories, 'expense'), [categories]);

  // Índice rápido de transações por (category_id + yearMonth) apenas para os meses no filtro
  const leafMonthIndex = useMemo(() => {
    const map = new Map<string, CellAggregation>();
    for (const tx of transactions) {
      const ym = getTransactionYearMonth(tx);
      if (!monthSet.has(ym)) continue;
      const key = `${tx.category_id}::${ym}`;
      const cur = map.get(key) ?? emptyCell();
      if (tx.status === 'realized') {
        cur.realized += tx.amount;
      } else {
        cur.pending += tx.amount;
      }
      cur.total += tx.amount;
      cur.transactions.push(tx);
      map.set(key, cur);
    }
    return map;
  }, [transactions, monthSet]);

  // Agregação recursiva para qualquer nó da árvore em um mês específico
  const nodeAggregationMap = useMemo(() => {
    const memo = new Map<string, Record<string, CellAggregation>>();

    const computeNode = (node: CategoryTreeNode): Record<string, CellAggregation> => {
      const byMonth: Record<string, CellAggregation> = {};
      for (const m of months) {
        const direct = leafMonthIndex.get(`${node.id}::${m}`);
        byMonth[m] = direct
          ? {
              realized: direct.realized,
              pending: direct.pending,
              total: direct.total,
              transactions: [...direct.transactions],
            }
          : emptyCell();
      }

      for (const child of node.children) {
        const childMonths = computeNode(child);
        for (const m of months) {
          byMonth[m].realized += childMonths[m].realized;
          byMonth[m].pending += childMonths[m].pending;
          byMonth[m].total += childMonths[m].total;
          byMonth[m].transactions.push(...childMonths[m].transactions);
        }
      }

      memo.set(node.id, byMonth);
      return byMonth;
    };

    for (const root of incomeTree) computeNode(root);
    for (const root of expenseTree) computeNode(root);

    return memo;
  }, [incomeTree, expenseTree, months, leafMonthIndex]);

  // Totais das 3 linhas-mestre (Total de Entradas, Total de Saídas e Saldo)
  const masterSummary = useMemo(() => {
    const incomeByMonth: Record<string, CellAggregation> = {};
    const expenseByMonth: Record<string, CellAggregation> = {};

    for (const m of months) {
      incomeByMonth[m] = emptyCell();
      expenseByMonth[m] = emptyCell();
    }

    for (const root of incomeTree) {
      const data = nodeAggregationMap.get(root.id);
      if (!data) continue;
      for (const m of months) {
        incomeByMonth[m].realized += data[m].realized;
        incomeByMonth[m].pending += data[m].pending;
        incomeByMonth[m].total += data[m].total;
      }
    }

    for (const root of expenseTree) {
      const data = nodeAggregationMap.get(root.id);
      if (!data) continue;
      for (const m of months) {
        expenseByMonth[m].realized += data[m].realized;
        expenseByMonth[m].pending += data[m].pending;
        expenseByMonth[m].total += data[m].total;
      }
    }

    return { incomeByMonth, expenseByMonth };
  }, [incomeTree, expenseTree, nodeAggregationMap, months]);

  const sumPeriod = (byMonth: Record<string, CellAggregation>): CellAggregation => {
    const acc = emptyCell();
    for (const m of months) {
      const cell = byMonth[m];
      if (!cell) continue;
      acc.realized += cell.realized;
      acc.pending += cell.pending;
      acc.total += cell.total;
    }
    return acc;
  };

  const renderValueContent = (cell: CellAggregation, type: AccountType, isMaster = false) => {
    if (cell.total === 0) {
      return <span className="opacity-25 select-none">—</span>;
    }

    const solidColor =
      type === 'income'
        ? isMaster
          ? 'text-[#2AC38B] font-semibold'
          : 'text-[#0E1B2B] dark:text-[#E6EAED]'
        : isMaster
          ? 'text-[#EF4444] font-semibold'
          : 'text-[#0E1B2B] dark:text-[#E6EAED]';

    const pastelColor =
      type === 'income'
        ? 'text-[#2AC38B]/55 dark:text-[#2AC38B]/55'
        : 'text-[#EF4444]/55 dark:text-[#EF4444]/55';

    // Apenas valores previstos/pendentes -> exibe integralmente em tom pastel/suavizado
    if (cell.realized === 0 && cell.pending > 0) {
      return (
        <span className={`tabular-nums ${pastelColor} ${isMaster ? 'font-semibold' : 'font-normal'}`}>
          {type === 'expense' ? `-${formatCurrencyBRL(cell.pending)}` : formatCurrencyBRL(cell.pending)}
        </span>
      );
    }

    // Misto no mesmo mês (efetivado + previsto) -> efetivado sólido + previsto em pastel logo abaixo
    if (cell.realized > 0 && cell.pending > 0) {
      return (
        <span className="inline-flex flex-col items-end leading-tight tabular-nums">
          <span className={solidColor}>
            {type === 'expense'
              ? `-${formatCurrencyBRL(cell.realized)}`
              : formatCurrencyBRL(cell.realized)}
          </span>
          <span className={`text-[10px] ${pastelColor}`}>
            {type === 'expense'
              ? `-${formatCurrencyBRL(cell.pending)}`
              : `+${formatCurrencyBRL(cell.pending)}`}
          </span>
        </span>
      );
    }

    // 100% Efetivado
    return (
      <span className={`tabular-nums ${solidColor}`}>
        {type === 'expense'
          ? `-${formatCurrencyBRL(cell.realized)}`
          : formatCurrencyBRL(cell.realized)}
      </span>
    );
  };

  const renderTreeRows = (nodes: CategoryTreeNode[], type: AccountType): React.ReactNode => {
    return nodes.map((node) => {
      const isExpanded = expandedIds.has(node.id);
      const byMonth = nodeAggregationMap.get(node.id) ?? {};
      const periodCell = sumPeriod(byMonth);
      const indentPx = 20 + node.depth * 18;

      return (
        <React.Fragment key={node.id}>
          <tr className="border-b border-[#0E1B2B]/5 dark:border-[#E6EAED]/5 hover:bg-[#0E1B2B]/[0.02] dark:hover:bg-[#E6EAED]/[0.02] transition-colors">
            <td
              style={{ paddingLeft: `${indentPx}px` }}
              className="sticky left-0 z-10 bg-white dark:bg-[#15263B] py-2.5 pr-4 text-xs whitespace-nowrap"
            >
              {node.isLeaf ? (
                <div className="flex items-center gap-2 text-[#0E1B2B]/80 dark:text-[#E6EAED]/80">
                  <span className="h-1 w-1 rounded-full bg-[#0E1B2B]/30 dark:bg-[#E6EAED]/30 shrink-0" />
                  <span>{node.name}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleExpand(node.id)}
                  className="inline-flex items-center gap-1.5 font-medium text-left hover:text-[#1A73E9] transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 opacity-70 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 opacity-70 shrink-0" />
                  )}
                  <span>{node.name}</span>
                </button>
              )}
            </td>

            {months.map((m) => {
              const cell = byMonth[m] ?? emptyCell();
              const isClickableLeaf = node.isLeaf && cell.transactions.length > 0;
              const hasReceipt = cell.transactions.some((t) => Boolean(t.receipt_url));

              return (
                <td key={m} className="py-2.5 px-3.5 text-right text-xs whitespace-nowrap">
                  {isClickableLeaf ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenReceiptModal({
                          categoryName: node.name,
                          yearMonth: m,
                          transactions: cell.transactions,
                        })
                      }
                      title="Visualizar comprovante e detalhes"
                      className="inline-flex items-center justify-end gap-1 px-1.5 py-0.5 -mx-1.5 rounded hover:bg-[#1A73E9]/10 hover:ring-1 hover:ring-[#1A73E9]/30 transition-all cursor-pointer"
                    >
                      {hasReceipt && (
                        <Paperclip className="h-2.5 w-2.5 text-[#1A73E9] opacity-75 shrink-0" />
                      )}
                      {renderValueContent(cell, type, false)}
                    </button>
                  ) : (
                    renderValueContent(cell, type, false)
                  )}
                </td>
              );
            })}

            <td className="py-2.5 px-4 text-right text-xs font-medium whitespace-nowrap bg-[#0E1B2B]/[0.015] dark:bg-[#E6EAED]/[0.02]">
              {renderValueContent(periodCell, type, false)}
            </td>
          </tr>

          {!node.isLeaf && isExpanded && renderTreeRows(node.children, type)}
        </React.Fragment>
      );
    });
  };

  const incomeExpanded = expandedIds.has('MASTER_INCOME');
  const expenseExpanded = expandedIds.has('MASTER_EXPENSE');

  const totalIncomePeriod = sumPeriod(masterSummary.incomeByMonth);
  const totalExpensePeriod = sumPeriod(masterSummary.expenseByMonth);
  const netPeriodTotal = totalIncomePeriod.total - totalExpensePeriod.total;
  const isPeriodOnlyProjected =
    totalIncomePeriod.realized === 0 &&
    totalExpensePeriod.realized === 0 &&
    (totalIncomePeriod.pending > 0 || totalExpensePeriod.pending > 0);

  return (
    <section className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 bg-[#E6EAED]/45 dark:bg-[#0E1B2B]/50">
              <th className="sticky left-0 z-20 bg-[#EDF0F2] dark:bg-[#112033] py-3 px-4 text-xs font-semibold tracking-tight min-w-[250px]">
                Hierarquia de Contas
              </th>
              {months.map((m) => (
                <th
                  key={m}
                  className="py-3 px-3.5 text-right text-xs font-semibold tracking-tight whitespace-nowrap min-w-[118px]"
                >
                  {formatYearMonthShort(m)}
                </th>
              ))}
              <th className="py-3 px-4 text-right text-xs font-semibold tracking-tight whitespace-nowrap min-w-[136px]">
                Total do Período
              </th>
            </tr>
          </thead>

          <tbody>
            {/* LINHA MESTRE 1: TOTAL DE ENTRADAS */}
            <tr className="border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 hover:bg-[#0E1B2B]/[0.02] dark:hover:bg-[#E6EAED]/[0.03] transition-colors">
              <td className="sticky left-0 z-10 bg-white dark:bg-[#15263B] py-3.5 px-4 text-xs font-semibold whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleExpand('MASTER_INCOME')}
                  className="inline-flex items-center gap-2 text-left hover:text-[#1A73E9] transition-colors"
                >
                  {incomeExpanded ? (
                    <ChevronDown className="h-4 w-4 text-[#2AC38B]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[#2AC38B]" />
                  )}
                  <span>Total de Entradas</span>
                </button>
              </td>

              {months.map((m) => (
                <td key={m} className="py-3.5 px-3.5 text-right text-xs whitespace-nowrap">
                  {renderValueContent(masterSummary.incomeByMonth[m], 'income', true)}
                </td>
              ))}

              <td className="py-3.5 px-4 text-right text-xs whitespace-nowrap bg-[#0E1B2B]/[0.02] dark:bg-[#E6EAED]/[0.025]">
                {renderValueContent(totalIncomePeriod, 'income', true)}
              </td>
            </tr>

            {incomeExpanded && renderTreeRows(incomeTree, 'income')}

            {/* LINHA MESTRE 2: TOTAL DE SAÍDAS */}
            <tr className="border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 hover:bg-[#0E1B2B]/[0.02] dark:hover:bg-[#E6EAED]/[0.03] transition-colors">
              <td className="sticky left-0 z-10 bg-white dark:bg-[#15263B] py-3.5 px-4 text-xs font-semibold whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleExpand('MASTER_EXPENSE')}
                  className="inline-flex items-center gap-2 text-left hover:text-[#1A73E9] transition-colors"
                >
                  {expenseExpanded ? (
                    <ChevronDown className="h-4 w-4 text-[#EF4444]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[#EF4444]" />
                  )}
                  <span>Total de Saídas</span>
                </button>
              </td>

              {months.map((m) => (
                <td key={m} className="py-3.5 px-3.5 text-right text-xs whitespace-nowrap">
                  {renderValueContent(masterSummary.expenseByMonth[m], 'expense', true)}
                </td>
              ))}

              <td className="py-3.5 px-4 text-right text-xs whitespace-nowrap bg-[#0E1B2B]/[0.02] dark:bg-[#E6EAED]/[0.025]">
                {renderValueContent(totalExpensePeriod, 'expense', true)}
              </td>
            </tr>

            {expenseExpanded && renderTreeRows(expenseTree, 'expense')}

            {/* LINHA MESTRE 3: SALDO */}
            <tr className="bg-[#E6EAED]/35 dark:bg-[#0E1B2B]/40 font-semibold">
              <td className="sticky left-0 z-10 bg-[#F2F4F6] dark:bg-[#112033] py-3.5 px-4 text-xs whitespace-nowrap">
                <span className="pl-6">Saldo</span>
              </td>

              {months.map((m) => {
                const inc = masterSummary.incomeByMonth[m];
                const exp = masterSummary.expenseByMonth[m];
                const net = inc.total - exp.total;
                const isOnlyProjected =
                  inc.realized === 0 &&
                  exp.realized === 0 &&
                  (inc.pending > 0 || exp.pending > 0);

                if (inc.total === 0 && exp.total === 0) {
                  return (
                    <td key={m} className="py-3.5 px-3.5 text-right text-xs opacity-25">
                      —
                    </td>
                  );
                }

                const colorClass = isOnlyProjected
                  ? net >= 0
                    ? 'text-[#1A73E9]/55'
                    : 'text-[#EF4444]/55'
                  : net >= 0
                    ? 'text-[#1A73E9]'
                    : 'text-[#EF4444]';

                return (
                  <td
                    key={m}
                    className={`py-3.5 px-3.5 text-right text-xs tabular-nums whitespace-nowrap ${colorClass}`}
                  >
                    {formatCurrencyBRL(net)}
                  </td>
                );
              })}

              <td
                className={`py-3.5 px-4 text-right text-xs tabular-nums whitespace-nowrap ${
                  isPeriodOnlyProjected
                    ? netPeriodTotal >= 0
                      ? 'text-[#1A73E9]/55'
                      : 'text-[#EF4444]/55'
                    : netPeriodTotal >= 0
                      ? 'text-[#1A73E9]'
                      : 'text-[#EF4444]'
                }`}
              >
                {formatCurrencyBRL(netPeriodTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};
