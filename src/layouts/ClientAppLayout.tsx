import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FilePlus2,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Building2,
  ChevronDown,
  Users,
  CalendarRange,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggleButton } from '@/contexts/ThemeContext';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useHrData } from '@/contexts/HrDataContext';
import { CentriaxLogo } from '@/components/CentriaxLogo';
import { getCondoLogo } from '@/logoCondominio';

const SIDEBAR_STORAGE_KEY = 'sindico_contas_sidebar_collapsed';

export const ClientAppLayout: React.FC = () => {
  const { session, selectCondominium, logout } = useAuth();
  const { transactions } = useFinancialData();
  const { currentMonthGapsCount, expiredEmployeeDocsCount, urgentCondoDocsCount } = useHrData();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const pendingCount = transactions.filter((t) => t.status === 'pending').length;
  const availableClients = session?.availableClients ?? [];
  const hasMultipleCondos = availableClients.length > 1;

  const handleCondoSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const target = availableClients.find((c) => c.id === e.target.value);
    if (target) {
      selectCondominium(target);
    }
  };

  const navItems = [
    {
      to: '/app',
      end: true,
      label: 'Boas-vindas',
      icon: Home,
      badge: 0,
    },
    {
      to: '/app/prestacao-contas',
      end: false,
      label: 'Prestação de Contas',
      icon: BarChart3,
      badge: 0,
    },
    {
      to: '/app/lancamentos',
      end: false,
      label: 'Lançamentos',
      icon: FilePlus2,
      badge: pendingCount,
    },
    {
      to: '/app/funcionarios',
      end: false,
      label: 'Gestão de Funcionários',
      icon: Users,
      badge: currentMonthGapsCount + expiredEmployeeDocsCount,
    },
    {
      to: '/app/documentos',
      end: false,
      label: 'Documentos',
      icon: FolderOpen,
      badge: 0,
    },
    {
      to: '/app/calendario',
      end: false,
      label: 'Calendário Condominial',
      icon: CalendarRange,
      badge: urgentCondoDocsCount,
    },
  ];

  return (
    <div className="min-h-screen flex bg-[#E6EAED] dark:bg-[#0E1B2B] text-[#0E1B2B] dark:text-[#E6EAED]">
      {/* Sidebar Lateral Retrátil */}
      <aside
        className={`shrink-0 flex flex-col border-r border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 bg-white dark:bg-[#15263B] transition-[width] duration-200 ease-out ${
          collapsed ? 'w-16' : 'w-72'
        }`}
      >
        {/* Topo da Sidebar: Logo Centriax + Botão Recolher */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 overflow-hidden">
          {!collapsed ? (
            <div className="min-w-0 flex-1 pr-2">
              <CentriaxLogo size="sm" />
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
              className="mx-auto block hover:opacity-80 transition-opacity"
            >
              <CentriaxLogo size="sm" showSubtitle={false} collapsedIconOnly />
            </button>
          )}

          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className={`h-8 w-8 shrink-0 rounded-lg inline-flex items-center justify-center text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10 transition-colors ${
              collapsed ? 'hidden' : ''
            }`}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 py-4 px-2.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `relative flex items-center rounded-lg h-10 text-xs font-medium transition-colors ${
                    collapsed ? 'justify-center px-0' : 'px-3 gap-3'
                  } ${
                    isActive
                      ? 'bg-[#1A73E9] text-white shadow-sm'
                      : 'text-[#0E1B2B]/75 dark:text-[#E6EAED]/75 hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/5'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                {!collapsed && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full tabular-nums bg-[#0E1B2B]/10 dark:bg-[#E6EAED]/15">
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge > 0 && (
                  <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#2AC38B]" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-2.5 border-t border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 space-y-1">
          {collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expandir menu"
              className="w-full h-8 flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10 rounded-lg mb-1"
            >
              <PanelLeftOpen className="h-4 w-4 opacity-75" />
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? 'Sair da conta' : undefined}
            className={`w-full h-10 rounded-lg flex items-center text-xs font-medium text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 hover:text-[#EF4444] dark:hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors ${
              collapsed ? 'justify-center px-0' : 'px-3 gap-3'
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Encerrar Sessão</span>}
          </button>
        </div>
      </aside>

      {/* Área Principal Direita */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Cabeçalho */}
        <header className="h-16 px-6 border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 bg-white dark:bg-[#15263B] flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            {collapsed && (
              <button
                type="button"
                onClick={toggleSidebar}
                title="Expandir menu lateral"
                aria-label="Expandir menu lateral"
                className="h-8 w-8 shrink-0 rounded-lg inline-flex items-center justify-center text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10 transition-colors mr-0.5"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}

            {(() => {
              const condoLogo = getCondoLogo(session?.client?.condo_name);
              return condoLogo ? (
                <div className="h-10 w-10 rounded-lg overflow-hidden bg-white dark:bg-[#0E1B2B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/15 shadow-xs flex items-center justify-center shrink-0 p-1">
                  <img
                    src={condoLogo}
                    alt={session?.client?.condo_name || 'Logo do Condomínio'}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-lg bg-[#1A73E9]/10 text-[#1A73E9] flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
              );
            })()}

            {hasMultipleCondos ? (
              /* Seletor Rápido de Condomínio no Cabeçalho */
              <div className="relative">
                <select
                  value={session?.client?.id ?? ''}
                  onChange={handleCondoSwitch}
                  className="h-9 pl-2.5 pr-8 rounded-lg text-xs font-semibold bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 text-[#0E1B2B] dark:text-[#E6EAED] focus:outline-none focus:border-[#1A73E9] cursor-pointer appearance-none"
                >
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.condo_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>
            ) : (
              <div className="min-w-0">
                <p className="text-sm font-semibold whitespace-nowrap leading-tight">
                  {session?.client?.condo_name ?? 'Condomínio'}
                </p>
                <p className="text-[11px] text-[#0E1B2B]/60 dark:text-[#E6EAED]/60 whitespace-nowrap mt-0.5">
                  Síndico(a): {session?.client?.syndic_name ?? '—'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <ThemeToggleButton />
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 min-w-0 p-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
