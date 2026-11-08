import React from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  FilePlus2,
  ArrowRight,
  Clock,
  Users,
  CalendarRange,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useHrData } from '@/contexts/HrDataContext';
import { formatCurrencyBRL } from '@/utils/formatters';

export const WelcomePage: React.FC = () => {
  const { session } = useAuth();
  const { transactions } = useFinancialData();
  const { bundle, currentMonthGapsCount, expiredEmployeeDocsCount, urgentCondoDocsCount } =
    useHrData();

  const realizedIncome = transactions
    .filter((t) => t.status === 'realized' && t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const realizedExpense = transactions
    .filter((t) => t.status === 'realized' && t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const realizedBalance = realizedIncome - realizedExpense;
  const pendingCount = transactions.filter((t) => t.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Cartão Minimalista de Boas-vindas */}
      <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-7">
        <p className="text-xs uppercase tracking-wider text-[#1A73E9] font-semibold mb-1.5">
          SGC — Sistema de Gestão Condominial
        </p>
        <h1 className="text-xl font-semibold tracking-tight">
          Bem-vindo(a), {session?.client?.syndic_name}
        </h1>
        <p className="text-sm text-[#0E1B2B]/65 dark:text-[#E6EAED]/65 mt-1">
          Acompanhe o fluxo de caixa, o demonstrativo hierárquico de contas e a fila de efetivação de{' '}
          <strong className="font-medium text-[#0E1B2B] dark:text-[#E6EAED]">
            {session?.client?.condo_name}
          </strong>
          .
        </p>

        {/* Indicadores Sintéticos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
          <div>
            <span className="text-xs opacity-60">Entradas Efetivadas (Acumulado)</span>
            <p className="text-lg font-semibold tabular-nums text-[#2AC38B] mt-0.5">
              {formatCurrencyBRL(realizedIncome)}
            </p>
          </div>
          <div>
            <span className="text-xs opacity-60">Saídas Efetivadas (Acumulado)</span>
            <p className="text-lg font-semibold tabular-nums text-[#EF4444] mt-0.5">
              {formatCurrencyBRL(realizedExpense)}
            </p>
          </div>
          <div>
            <span className="text-xs opacity-60">Resultado Realizado</span>
            <p className="text-lg font-semibold tabular-nums text-[#1A73E9] mt-0.5">
              {formatCurrencyBRL(realizedBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Atalhos Diretos para os Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/app/prestacao-contas"
          className="group rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 hover:border-[#1A73E9] dark:hover:border-[#1A73E9] p-6 flex items-start justify-between transition-colors"
        >
          <div className="space-y-1.5">
            <div className="h-9 w-9 rounded-lg bg-[#1A73E9]/10 text-[#1A73E9] flex items-center justify-center mb-3">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold">Prestação de Contas</h2>
            <p className="text-xs text-[#0E1B2B]/65 dark:text-[#E6EAED]/65">
              Gráfico divergente de fluxo de caixa, projeções futuras e DRE em árvore com comprovantes.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:text-[#1A73E9] transition-all shrink-0 mt-1" />
        </Link>

        <Link
          to="/app/lancamentos"
          className="group rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 hover:border-[#1A73E9] dark:hover:border-[#1A73E9] p-6 flex items-start justify-between transition-colors"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-lg bg-[#2AC38B]/10 text-[#2AC38B] flex items-center justify-center">
                <FilePlus2 className="h-4 w-4" />
              </div>
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#1A73E9]/10 text-[#1A73E9]">
                  <Clock className="h-3 w-3" />
                  {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h2 className="text-sm font-semibold">Lançamentos e Efetivações</h2>
            <p className="text-xs text-[#0E1B2B]/65 dark:text-[#E6EAED]/65">
              Cadastre contas a receber/pagar, anexe comprovantes e aprove lançamentos previstos.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:text-[#1A73E9] transition-all shrink-0 mt-1" />
        </Link>

        <Link
          to="/app/funcionarios"
          className="group rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 hover:border-[#1A73E9] dark:hover:border-[#1A73E9] p-6 flex items-start justify-between transition-colors"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-lg bg-[#1A73E9]/10 text-[#1A73E9] flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              {currentMonthGapsCount + expiredEmployeeDocsCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#EF4444]/12 text-[#EF4444]">
                  <ShieldAlert className="h-3 w-3" />
                  {currentMonthGapsCount > 0
                    ? `${currentMonthGapsCount} desfalque(s) 24/7`
                    : `${expiredEmployeeDocsCount} doc(s) vencido(s)`}
                </span>
              )}
            </div>
            <h2 className="text-sm font-semibold">
              Gestão de Funcionários ({bundle?.employees.length ?? 10} no CNPJ)
            </h2>
            <p className="text-xs text-[#0E1B2B]/65 dark:text-[#E6EAED]/65">
              Escalas automáticas 24/7 com PDF validado, exames periódicos, brigada de incêndio e controle de férias.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:text-[#1A73E9] transition-all shrink-0 mt-1" />
        </Link>

        <Link
          to="/app/calendario"
          className="group rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 hover:border-[#1A73E9] dark:hover:border-[#1A73E9] p-6 flex items-start justify-between transition-colors"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-lg bg-purple-500/12 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                <CalendarRange className="h-4 w-4" />
              </div>
              {urgentCondoDocsCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300">
                  <Clock className="h-3 w-3" />
                  {urgentCondoDocsCount} vencimento(s) próximo(s)
                </span>
              )}
            </div>
            <h2 className="text-sm font-semibold">Calendário do Condomínio</h2>
            <p className="text-xs text-[#0E1B2B]/65 dark:text-[#E6EAED]/65">
              Aniversários da equipe, reservas do salão de festas, vencimentos de laudos prediais e contratos.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:text-[#1A73E9] transition-all shrink-0 mt-1" />
        </Link>
      </div>
    </div>
  );
};
