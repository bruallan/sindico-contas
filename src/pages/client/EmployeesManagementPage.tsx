import React, { useState } from 'react';
import {
  CalendarClock,
  CalendarRange,
  Palmtree,
  RotateCcw,
  Settings2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHrData } from '@/contexts/HrDataContext';
import { ScheduleManagementTab } from '@/components/hr/ScheduleManagementTab';
import { EmployeesAndDocsTab } from '@/components/hr/EmployeesAndDocsTab';
import { VacationsControlTab } from '@/components/hr/VacationsControlTab';
import { CondoCalendarSection } from '@/components/hr/CondoCalendarSection';

type SubModule = 'schedules' | 'employees' | 'vacations' | 'calendar';

export const EmployeesManagementPage: React.FC = () => {
  const { session } = useAuth();
  const {
    bundle,
    loading,
    currentMonthGapsCount,
    expiredEmployeeDocsCount,
    urgentCondoDocsCount,
    updateConfig,
    resetDemoData,
  } = useHrData();

  const [activeSub, setActiveSub] = useState<SubModule>('schedules');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const [cfgEnabled, setCfgEnabled] = useState(true);
  const [cfgCnpj, setCfgCnpj] = useState('');
  const [cfgMinDay, setCfgMinDay] = useState(2);
  const [cfgMinNight, setCfgMinNight] = useState(2);

  if (loading || !bundle) {
    return (
      <div className="h-64 bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-300 dark:border-slate-700" />
    );
  }

  const { config, employees } = bundle;

  const openConfigModal = () => {
    setCfgEnabled(config.enabled);
    setCfgCnpj(config.cnpj);
    setCfgMinDay(config.min_day_staff);
    setCfgMinNight(config.min_night_staff);
    setIsConfigOpen(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      enabled: cfgEnabled,
      cnpj: cfgCnpj.trim() || '18.492.310/0001-54',
      min_day_staff: Math.max(1, Number(cfgMinDay) || 1),
      min_night_staff: Math.max(1, Number(cfgMinNight) || 1),
    });
    setIsConfigOpen(false);
    if (!cfgEnabled && activeSub !== 'calendar') {
      setActiveSub('calendar');
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Module Header (Solid, Enterprise, Rounded-2xl) */}
      <div className="bg-white dark:bg-[#15263B] border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-[#0E1B2B] text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800 rounded-lg">
              CNPJ: {config.cnpj}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-[#0E1B2B] text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800 rounded-lg">
              {config.enabled
                ? `Contratação Direta Ativa (${employees.filter((e) => e.status !== 'desligado').length} Colaboradores)`
                : 'Regime Terceirizado'}
            </span>
          </div>

          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white pt-0.5">
            Gestão de Funcionários & Escalas • {session?.client?.condo_name}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openConfigModal}
            className="h-8 px-3.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors text-slate-800 dark:text-slate-200 rounded-xl"
          >
            <Settings2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>Configurar Parâmetros</span>
          </button>
        </div>
      </div>

      {/* When disabled */}
      {!config.enabled ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#15263B] border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Módulo Trabalhista Próprio Desativado
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Este condomínio está marcado sem colaboradores contratados diretamente pelo CNPJ.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                updateConfig({ enabled: true });
                setActiveSub('schedules');
              }}
              className="h-8 px-4 bg-[#0E1B2B] hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-[#0E1B2B] text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Ativar Contratação Própria
            </button>
          </div>

          <CondoCalendarSection />
        </div>
      ) : (
        <>
          {/* Submodule Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200/80 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveSub('schedules')}
              className={`h-8 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 transition-colors rounded-xl ${
                activeSub === 'schedules'
                  ? 'bg-[#0E1B2B] text-white dark:bg-slate-100 dark:text-[#0E1B2B] shadow-xs'
                  : 'bg-white dark:bg-[#15263B] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Escalas & Revezamento</span>
              {currentMonthGapsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                  {currentMonthGapsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSub('employees')}
              className={`h-8 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 transition-colors rounded-xl ${
                activeSub === 'employees'
                  ? 'bg-[#0E1B2B] text-white dark:bg-slate-100 dark:text-[#0E1B2B] shadow-xs'
                  : 'bg-white dark:bg-[#15263B] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Colaboradores & Documentos ({employees.filter((e) => e.status !== 'desligado').length})</span>
              {expiredEmployeeDocsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                  {expiredEmployeeDocsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSub('vacations')}
              className={`h-8 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 transition-colors rounded-xl ${
                activeSub === 'vacations'
                  ? 'bg-[#0E1B2B] text-white dark:bg-slate-100 dark:text-[#0E1B2B] shadow-xs'
                  : 'bg-white dark:bg-[#15263B] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Palmtree className="h-3.5 w-3.5" />
              <span>Controle de Férias</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSub('calendar')}
              className={`h-8 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 transition-colors rounded-xl ${
                activeSub === 'calendar'
                  ? 'bg-[#0E1B2B] text-white dark:bg-slate-100 dark:text-[#0E1B2B] shadow-xs'
                  : 'bg-white dark:bg-[#15263B] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              <span>Calendário do Condomínio</span>
              {urgentCondoDocsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-600 text-white text-[10px] font-bold">
                  {urgentCondoDocsCount}
                </span>
              )}
            </button>
          </div>

          {/* Active Submodule */}
          {activeSub === 'schedules' && <ScheduleManagementTab />}
          {activeSub === 'employees' && <EmployeesAndDocsTab />}
          {activeSub === 'vacations' && <VacationsControlTab />}
          {activeSub === 'calendar' && <CondoCalendarSection />}
        </>
      )}

      {/* Settings Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#15263B] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Parâmetros Trabalhistas do Condomínio
              </h3>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                  Modelo de Contratação
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCfgEnabled(true)}
                    className={`h-9 font-semibold rounded-xl border transition-colors ${
                      cfgEnabled
                        ? 'border-[#0E1B2B] bg-[#0E1B2B] text-white dark:border-slate-100 dark:bg-slate-100 dark:text-[#0E1B2B] shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Própria via CNPJ
                  </button>
                  <button
                    type="button"
                    onClick={() => setCfgEnabled(false)}
                    className={`h-9 font-semibold rounded-xl border transition-colors ${
                      !cfgEnabled
                        ? 'border-[#0E1B2B] bg-[#0E1B2B] text-white dark:border-slate-100 dark:bg-slate-100 dark:text-[#0E1B2B] shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Terceirizada
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  CNPJ Empregador
                </label>
                <input
                  type="text"
                  required
                  value={cfgCnpj}
                  onChange={(e) => setCfgCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] font-mono text-slate-900 dark:text-white"
                />
              </div>

              {cfgEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Mínimo Diurno
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={cfgMinDay}
                      onChange={(e) => setCfgMinDay(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Mínimo Noturno
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={cfgMinNight}
                      onChange={(e) => setCfgMinNight(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    resetDemoData();
                    setIsConfigOpen(false);
                  }}
                  className="h-9 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl inline-flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Recarregar Demonstração
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="h-9 px-3.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-4 bg-[#0E1B2B] text-white dark:bg-slate-100 dark:text-[#0E1B2B] font-bold rounded-xl shadow-xs hover:bg-slate-800 dark:hover:bg-white transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
