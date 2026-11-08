import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Presentation,
  X,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Scale,
  CalendarDays,
  Layers,
  BarChart3,
  TableProperties,
  ShieldCheck,
  Building2,
  ChevronsUpDown,
} from 'lucide-react';
import { ThemeToggleButton } from '@/contexts/ThemeContext';
import { AccountCategory, MonthlyCashFlowPoint, Transaction } from '@/types/database';
import { CashFlowChart } from '@/components/accountability/CashFlowChart';
import { HierarchicalDreTable } from '@/components/accountability/HierarchicalDreTable';
import { MonthYearSelector } from '@/components/accountability/MonthYearSelector';
import { formatCurrencyBRL, formatYearMonthShort } from '@/utils/formatters';
import { getCondoLogo } from '@/logoCondominio';

export type PresentationViewMode = 'overview' | 'chart' | 'dre';

interface AccountabilityPresentationModeProps {
  condoName?: string;
  syndicName?: string;
  startYM: string;
  endYM: string;
  availableYears: number[];
  months: string[];
  categories: AccountCategory[];
  transactions: Transaction[];
  chartData: MonthlyCashFlowPoint[];
  onStartChange: (next: string) => void;
  onEndChange: (next: string) => void;
  onClose: () => void;
  onOpenReceiptModal: (params: {
    categoryName: string;
    yearMonth: string;
    transactions: Transaction[];
  }) => void;
}

export const AccountabilityPresentationMode: React.FC<AccountabilityPresentationModeProps> = ({
  condoName = 'Condomínio',
  syndicName = '—',
  startYM,
  endYM,
  availableYears,
  months,
  categories,
  transactions,
  chartData,
  onStartChange,
  onEndChange,
  onClose,
  onOpenReceiptModal,
}) => {
  const [viewMode, setViewMode] = useState<PresentationViewMode>('overview');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => Boolean(document.fullscreenElement));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // Logo oficial do condomínio
  const condoLogo = useMemo(() => getCondoLogo(condoName), [condoName]);

  // Expandir / Recolher tudo no DRE
  const allCategoryIds = useMemo(() => {
    return new Set<string>(['MASTER_INCOME', 'MASTER_EXPENSE', ...categories.map((c) => c.id)]);
  }, [categories]);

  const areAllExpanded = expandedIds.size > 0 && expandedIds.size >= allCategoryIds.size;

  const toggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(allCategoryIds));
    }
  };

  // Cálculo dos KPIs Executivos do período
  const summary = useMemo(() => {
    let incomeRealized = 0;
    let incomePending = 0;
    let expenseRealized = 0;
    let expensePending = 0;

    for (const pt of chartData) {
      incomeRealized += pt.incomeRealized;
      incomePending += pt.incomePending;
      expenseRealized += pt.expenseRealizedAbs;
      expensePending += pt.expensePendingAbs;
    }

    const totalIncome = incomeRealized + incomePending;
    const totalExpense = expenseRealized + expensePending;
    const netBalance = totalIncome - totalExpense;
    const isSurplus = netBalance >= 0;

    const count = chartData.length || 1;
    const avgMonthlyIncome = totalIncome / count;
    const avgMonthlyExpense = totalExpense / count;

    return {
      totalIncome,
      incomeRealized,
      incomePending,
      totalExpense,
      expenseRealized,
      expensePending,
      netBalance,
      isSurplus,
      monthCount: count,
      avgMonthlyIncome,
      avgMonthlyExpense,
    };
  }, [chartData]);

  // Gestão de Tela Cheia Nativa do Navegador
  const toggleBrowserFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignora restrições do navegador, o overlay continuará em tela cheia via CSS fixed inset-0
    }
  }, []);

  useEffect(() => {
    // Solicita tela cheia nativa ao entrar no modo de apresentação
    const enterFullscreenOnMount = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Ignora caso bloqueado por política de usuário
      }
    };
    enterFullscreenOnMount();

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '1') {
        setViewMode('overview');
      } else if (e.key === '2') {
        setViewMode('chart');
      } else if (e.key === '3') {
        setViewMode('dre');
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        toggleBrowserFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);

      // Sai de tela cheia se estiver em tela cheia ao fechar
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen();
        } catch {
          // Ignora
        }
      }
    };
  }, [onClose, toggleBrowserFullscreen]);

  const currentFormattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Modo de Apresentação da Prestação de Contas"
      className="fixed inset-0 z-50 bg-[#F4F6F8] dark:bg-[#09111B] text-[#0E1B2B] dark:text-[#E6EAED] flex flex-col overflow-hidden select-none animate-in fade-in duration-200"
    >
      {/* =========================================================================
          CABEÇALHO EXECUTIVO DE APRESENTAÇÃO (SEM MENU LATERAL E SEM DADOS SENSÍVEIS)
         ========================================================================= */}
      <header className="shrink-0 bg-white dark:bg-[#111F30] border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 shadow-sm px-4 lg:px-8 py-3 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Identificação Oficial do Condomínio para a Assembleia */}
          <div className="flex items-center gap-3.5 min-w-0">
            {condoLogo ? (
              <div className="h-11 w-11 rounded-xl overflow-hidden bg-white dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 shadow-sm flex items-center justify-center shrink-0 p-1">
                <img
                  src={condoLogo}
                  alt={condoName}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-11 w-11 rounded-xl bg-[#1A73E9]/15 text-[#1A73E9] flex items-center justify-center shrink-0 shadow-sm">
                <Building2 className="h-6 w-6" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base lg:text-lg font-bold tracking-tight text-[#0E1B2B] dark:text-[#E6EAED] truncate leading-tight">
                  {condoName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#1A73E9]/10 dark:bg-[#1A73E9]/20 text-[#1A73E9] border border-[#1A73E9]/25">
                  <Presentation className="h-3 w-3" />
                  Assembleia Geral • Prestação de Contas
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#2AC38B]/10 dark:bg-[#2AC38B]/20 text-[#2AC38B] border border-[#2AC38B]/20">
                  <ShieldCheck className="h-3 w-3" />
                  Modo Seguro Ativo
                </span>
              </div>
              <p className="text-xs text-[#0E1B2B]/65 dark:text-[#E6EAED]/65 mt-0.5">
                Demonstrativo Financeiro Oficial • Síndico(a): <strong className="font-semibold text-[#0E1B2B]/85 dark:text-[#E6EAED]/90">{syndicName}</strong> • {currentFormattedDate}
              </p>
            </div>
          </div>

          {/* Controles de Apresentação: Seletor de Telas, Filtro, Tema e Fechar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Seletor Segmentado de Visualização */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[#E6EAED]/70 dark:bg-[#09111B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'overview'
                    ? 'bg-white dark:bg-[#1A73E9] text-[#1A73E9] dark:text-white shadow-xs'
                    : 'text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 hover:text-[#0E1B2B] dark:hover:text-[#E6EAED]'
                }`}
                title="Visão Executiva Completa (Atalho: 1)"
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Visão Completa</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'chart'
                    ? 'bg-white dark:bg-[#1A73E9] text-[#1A73E9] dark:text-white shadow-xs'
                    : 'text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 hover:text-[#0E1B2B] dark:hover:text-[#E6EAED]'
                }`}
                title="Gráfico de Fluxo de Caixa (Atalho: 2)"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Gráfico</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('dre')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'dre'
                    ? 'bg-white dark:bg-[#1A73E9] text-[#1A73E9] dark:text-white shadow-xs'
                    : 'text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 hover:text-[#0E1B2B] dark:hover:text-[#E6EAED]'
                }`}
                title="Demonstrativo DRE Detalhado (Atalho: 3)"
              >
                <TableProperties className="h-3.5 w-3.5" />
                <span className="hidden md:inline">DRE Detalhado</span>
              </button>
            </div>

            {/* Filtros de Período para Ajuste Rápido durante a Assembleia */}
            <div className="hidden xl:flex items-center gap-2 pl-1 border-l border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
              <MonthYearSelector
                label="De"
                value={startYM}
                years={availableYears}
                onChange={onStartChange}
                compact
              />
              <MonthYearSelector
                label="Até"
                value={endYM}
                years={availableYears}
                onChange={onEndChange}
                compact
              />
            </div>

            {/* Botão de Expandir / Recolher DRE */}
            {viewMode !== 'chart' && (
              <button
                type="button"
                onClick={toggleExpandAll}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 text-xs font-semibold hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10 transition-colors"
                title={areAllExpanded ? 'Recolher todas as contas do DRE' : 'Expandir todas as contas do DRE'}
              >
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-70" />
                <span className="hidden lg:inline">{areAllExpanded ? 'Recolher DRE' : 'Expandir DRE'}</span>
              </button>
            )}

            {/* Alternador de Tema (Projetor Claro / OLED Escuro) */}
            <ThemeToggleButton />

            {/* Alternador de Tela Cheia Nativa */}
            <button
              type="button"
              onClick={toggleBrowserFullscreen}
              className="h-8 w-8 rounded-lg inline-flex items-center justify-center bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 text-[#0E1B2B]/80 dark:text-[#E6EAED]/80 hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10 transition-colors"
              title={isFullscreen ? 'Restaurar janela (Atalho: F)' : 'Tela cheia do navegador (Atalho: F)'}
              aria-label={isFullscreen ? 'Restaurar janela' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Botão de Fechar Apresentação (Retornar ao Painel) */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-[#EF4444]/25 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Sair do modo de apresentação (Atalho: Esc)"
            >
              <X className="h-4 w-4" />
              <span>Sair</span>
              <kbd className="hidden sm:inline-block ml-0.5 px-1.5 py-0.2 rounded text-[10px] uppercase font-mono bg-black/10 dark:bg-white/20">
                Esc
              </kbd>
            </button>
          </div>
        </div>

        {/* Barra Secundária para Telas Menores: Filtro de Mês */}
        <div className="flex xl:hidden items-center justify-between gap-3 pt-2 mt-2 border-t border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
          <div className="flex items-center gap-2">
            <MonthYearSelector
              label="Início"
              value={startYM}
              years={availableYears}
              onChange={onStartChange}
              compact
            />
            <MonthYearSelector
              label="Fim"
              value={endYM}
              years={availableYears}
              onChange={onEndChange}
              compact
            />
          </div>
          <span className="text-xs text-[#0E1B2B]/60 dark:text-[#E6EAED]/60 font-medium">
            Período: {formatYearMonthShort(startYM)} a {formatYearMonthShort(endYM)}
          </span>
        </div>
      </header>

      {/* =========================================================================
          CORPO DA APRESENTAÇÃO (SCROLL COM CARDS DE KPI + GRÁFICO + TABELA DRE)
         ========================================================================= */}
      <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-5 space-y-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* CARDS DE RESUMO EXECUTIVO (KPIs) PARA A ASSEMBLEIA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total de Entradas */}
            <div className="p-4 lg:p-5 rounded-2xl bg-white dark:bg-[#111F30] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0E1B2B]/60 dark:text-[#E6EAED]/60">
                  Total de Entradas
                </span>
                <div className="h-8 w-8 rounded-xl bg-[#2AC38B]/15 text-[#2AC38B] flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl lg:text-3xl font-extrabold text-[#2AC38B] tabular-nums tracking-tight">
                  {formatCurrencyBRL(summary.totalIncome)}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 flex-wrap">
                  <span>Realizadas: <strong className="font-semibold text-[#0E1B2B] dark:text-[#E6EAED]">{formatCurrencyBRL(summary.incomeRealized)}</strong></span>
                  {summary.incomePending > 0 && (
                    <span className="opacity-75">· Previstas: {formatCurrencyBRL(summary.incomePending)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Total de Saídas */}
            <div className="p-4 lg:p-5 rounded-2xl bg-white dark:bg-[#111F30] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0E1B2B]/60 dark:text-[#E6EAED]/60">
                  Total de Despesas
                </span>
                <div className="h-8 w-8 rounded-xl bg-[#EF4444]/15 text-[#EF4444] flex items-center justify-center shrink-0">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl lg:text-3xl font-extrabold text-[#EF4444] tabular-nums tracking-tight">
                  -{formatCurrencyBRL(summary.totalExpense)}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 flex-wrap">
                  <span>Pagas: <strong className="font-semibold text-[#0E1B2B] dark:text-[#E6EAED]">{formatCurrencyBRL(summary.expenseRealized)}</strong></span>
                  {summary.expensePending > 0 && (
                    <span className="opacity-75">· A Pagar: {formatCurrencyBRL(summary.expensePending)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Resultado Líquido do Período */}
            <div className={`p-4 lg:p-5 rounded-2xl bg-white dark:bg-[#111F30] border shadow-xs flex flex-col justify-between ${
              summary.isSurplus
                ? 'border-[#2AC38B]/30 bg-gradient-to-br from-[#2AC38B]/5 to-transparent'
                : 'border-[#EF4444]/30 bg-gradient-to-br from-[#EF4444]/5 to-transparent'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0E1B2B]/60 dark:text-[#E6EAED]/60">
                  Resultado do Período
                </span>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                  summary.isSurplus ? 'bg-[#2AC38B]/15 text-[#2AC38B]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                }`}>
                  <Scale className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className={`text-2xl lg:text-3xl font-extrabold tabular-nums tracking-tight ${
                    summary.isSurplus ? 'text-[#1A73E9]' : 'text-[#EF4444]'
                  }`}>
                    {summary.netBalance >= 0 ? '+' : ''}{formatCurrencyBRL(summary.netBalance)}
                  </p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    summary.isSurplus
                      ? 'bg-[#2AC38B]/15 text-[#2AC38B]'
                      : 'bg-[#EF4444]/15 text-[#EF4444]'
                  }`}>
                    {summary.isSurplus ? 'Superávit' : 'Déficit'}
                  </span>
                </div>
                <p className="text-xs text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 mt-1.5">
                  Saldo Líquido apurado no intervalo selecionado
                </p>
              </div>
            </div>

            {/* 4. Médias Mensais */}
            <div className="p-4 lg:p-5 rounded-2xl bg-white dark:bg-[#111F30] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0E1B2B]/60 dark:text-[#E6EAED]/60">
                  Média Mensal ({summary.monthCount} {summary.monthCount === 1 ? 'mês' : 'meses'})
                </span>
                <div className="h-8 w-8 rounded-xl bg-[#1A73E9]/15 text-[#1A73E9] flex items-center justify-center shrink-0">
                  <CalendarDays className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#0E1B2B]/70 dark:text-[#E6EAED]/70">Entradas médias:</span>
                  <strong className="text-[#2AC38B] font-semibold tabular-nums">{formatCurrencyBRL(summary.avgMonthlyIncome)}</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#0E1B2B]/70 dark:text-[#E6EAED]/70">Despesas médias:</span>
                  <strong className="text-[#EF4444] font-semibold tabular-nums">-{formatCurrencyBRL(summary.avgMonthlyExpense)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* VISUALIZAÇÃO: GRÁFICO DE FLUXO DE CAIXA */}
          {(viewMode === 'overview' || viewMode === 'chart') && (
            <div className="rounded-2xl bg-white dark:bg-[#111F30] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm lg:text-base font-bold tracking-tight text-[#0E1B2B] dark:text-[#E6EAED]">
                    Evolução Mensal do Fluxo de Caixa
                  </h2>
                  <p className="text-xs text-[#0E1B2B]/60 dark:text-[#E6EAED]/60 mt-0.5">
                    Entradas (barras superiores verdes), Despesas (barras inferiores vermelhas) e Saldo Líquido (linha azul)
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#E6EAED]/50 dark:bg-[#09111B] text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
                  {months.length} {months.length === 1 ? 'mês analisado' : 'meses analisados'}
                </span>
              </div>

              <div className={viewMode === 'chart' ? 'min-h-[520px]' : ''}>
                <CashFlowChart data={chartData} />
              </div>
            </div>
          )}

          {/* VISUALIZAÇÃO: TABELA HIERÁRQUICA DRE */}
          {(viewMode === 'overview' || viewMode === 'dre') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-sm lg:text-base font-bold tracking-tight text-[#0E1B2B] dark:text-[#E6EAED]">
                    Demonstrativo de Resultado do Exercício (DRE)
                  </h2>
                  <p className="text-xs text-[#0E1B2B]/60 dark:text-[#E6EAED]/60 mt-0.5">
                    Detalhamento analítico por categorias. Clique no ícone de anexo para inspecionar comprovantes e notas fiscais.
                  </p>
                </div>
              </div>

              <HierarchicalDreTable
                categories={categories}
                transactions={transactions}
                months={months}
                expandedIds={expandedIds}
                onExpandedIdsChange={setExpandedIds}
                onOpenReceiptModal={onOpenReceiptModal}
              />
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          RODAPÉ INFORMATIVO DA APRESENTAÇÃO
         ========================================================================= */}
      <footer className="shrink-0 bg-white dark:bg-[#111F30] border-t border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 px-4 lg:px-8 py-2.5 flex items-center justify-between text-xs text-[#0E1B2B]/60 dark:text-[#E6EAED]/60 transition-colors">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[#0E1B2B]/80 dark:text-[#E6EAED]/80">
            Centriax Condomínios
          </span>
          <span className="opacity-30">•</span>
          <span>Apresentação Oficial para Assembleia Geral</span>
          <span className="hidden md:inline opacity-30">•</span>
          <span className="hidden md:inline">
            Exibição segura sem dados pessoais ou cadastros internos
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="hidden sm:inline">
            Atalhos: <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">1</kbd> Completo · <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">2</kbd> Gráfico · <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">3</kbd> DRE · <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">Esc</kbd> Sair
          </span>
        </div>
      </footer>
    </div>
  );
};
