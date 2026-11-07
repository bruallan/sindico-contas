import React, { useState } from 'react';
import {
  Building2,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  Palmtree,
  RotateCcw,
  Settings2,
  ShieldCheck,
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

  // Estado local do modal de configuração do regime CNPJ
  const [cfgEnabled, setCfgEnabled] = useState(true);
  const [cfgCnpj, setCfgCnpj] = useState('');
  const [cfgMinDay, setCfgMinDay] = useState(2);
  const [cfgMinNight, setCfgMinNight] = useState(2);

  if (loading || !bundle) {
    return (
      <div className="h-64 rounded-xl bg-white/50 dark:bg-[#15263B]/50 animate-pulse border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10" />
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
    <div className="space-y-6">
      {/* Cabeçalho do Módulo: Vínculo Direto pelo CNPJ do Condomínio */}
      <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#1A73E9]/12 text-[#1A73E9]">
              <Building2 className="h-3 w-3" />
              CNPJ: {config.cnpj}
            </span>

            {config.enabled ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#2AC38B]/15 text-[#15855C] dark:text-[#2AC38B]">
                <CheckCircle2 className="h-3 w-3" />
                Contratação Própria via CNPJ Ativa ({employees.length} Colaboradores)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#0E1B2B]/10 dark:bg-[#E6EAED]/15 opacity-80">
                Sem Contratação Direta no CNPJ (Terceirizado)
              </span>
            )}
          </div>

          <h1 className="text-lg font-semibold tracking-tight pt-0.5">
            Gestão de Funcionários, Escalas 24/7 & Calendário — {session?.client?.condo_name}
          </h1>
          <p className="text-xs text-[#0E1B2B]/65 dark:text-[#E6EAED]/65">
            Controle completo de revezamentos 24/7, validade de exames/certificados (ASO, Brigada de Incêndio), férias e calendário condominial.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openConfigModal}
            className="h-9 px-3.5 rounded-lg border border-[#0E1B2B]/12 dark:border-[#E6EAED]/15 hover:border-[#1A73E9] text-xs font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5 text-[#1A73E9]" />
            <span>Regime CNPJ & Parâmetros</span>
          </button>
        </div>
      </div>

      {/* Caso o condomínio esteja configurado como Terceirizado (sem funcionários próprios no CNPJ) */}
      {!config.enabled ? (
        <div className="space-y-6">
          <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A73E9]">
                <ShieldCheck className="h-4 w-4" />
                Módulo de RH Próprio Desativado para este Condomínio
              </div>
              <h2 className="text-base font-semibold">
                {session?.client?.condo_name} está configurado sem funcionários diretos no CNPJ
              </h2>
              <p className="text-xs opacity-70 leading-relaxed">
                Cada condomínio pode habilitar ou desabilitar o sistema de gestão de funcionários próprios conforme contrate diretamente pelo seu CNPJ ou utilize portaria/limpeza terceirizada. O Calendário do Condomínio (reservas do salão, documentos prediais e contratos) permanece ativo abaixo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                updateConfig({ enabled: true });
                setActiveSub('schedules');
              }}
              className="h-10 px-4 rounded-lg bg-[#1A73E9] hover:bg-[#1A73E9]/90 text-white text-xs font-semibold shrink-0 shadow-sm"
            >
              Ativar Contratação Própria pelo CNPJ
            </button>
          </div>

          <CondoCalendarSection />
        </div>
      ) : (
        <>
          {/* Navegação Interna entre os 4 Submódulos */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 pb-3">
            <button
              type="button"
              onClick={() => setActiveSub('schedules')}
              className={`h-10 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                activeSub === 'schedules'
                  ? 'bg-[#1A73E9] text-white shadow-sm'
                  : 'bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 hover:border-[#1A73E9]'
              }`}
            >
              <CalendarClock className="h-4 w-4" />
              <span>Escalas & Revezamento 24/7</span>
              {currentMonthGapsCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                    activeSub === 'schedules'
                      ? 'bg-white text-[#EF4444]'
                      : 'bg-[#EF4444]/15 text-[#EF4444]'
                  }`}
                >
                  {currentMonthGapsCount} desfalque{currentMonthGapsCount > 1 ? 's' : ''}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSub('employees')}
              className={`h-10 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                activeSub === 'employees'
                  ? 'bg-[#1A73E9] text-white shadow-sm'
                  : 'bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 hover:border-[#1A73E9]'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Colaboradores & Documentos ({employees.length})</span>
              {expiredEmployeeDocsCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                    activeSub === 'employees'
                      ? 'bg-white text-[#EF4444]'
                      : 'bg-[#EF4444]/15 text-[#EF4444]'
                  }`}
                >
                  {expiredEmployeeDocsCount} vencido{expiredEmployeeDocsCount > 1 ? 's' : ''}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSub('vacations')}
              className={`h-10 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                activeSub === 'vacations'
                  ? 'bg-[#1A73E9] text-white shadow-sm'
                  : 'bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 hover:border-[#1A73E9]'
              }`}
            >
              <Palmtree className="h-4 w-4" />
              <span>Controle de Férias</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSub('calendar')}
              className={`h-10 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                activeSub === 'calendar'
                  ? 'bg-[#1A73E9] text-white shadow-sm'
                  : 'bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 hover:border-[#1A73E9]'
              }`}
            >
              <CalendarRange className="h-4 w-4" />
              <span>Calendário do Condomínio</span>
              {urgentCondoDocsCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                    activeSub === 'calendar'
                      ? 'bg-white text-amber-600'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                  }`}
                >
                  {urgentCondoDocsCount} alerta{urgentCondoDocsCount > 1 ? 's' : ''}
                </span>
              )}
            </button>
          </div>

          {/* Conteúdo Ativo */}
          {activeSub === 'schedules' && <ScheduleManagementTab />}
          {activeSub === 'employees' && <EmployeesAndDocsTab />}
          {activeSub === 'vacations' && <VacationsControlTab />}
          {activeSub === 'calendar' && <CondoCalendarSection />}
        </>
      )}

      {/* Modal: Configurar Contratação pelo CNPJ e Parâmetros Mínimos 24/7 */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/15 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">Configuração Trabalhista do Condomínio</h3>
                <p className="text-xs opacity-65">{session?.client?.condo_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1.5 opacity-80">
                  Modelo de Contratação deste Condomínio
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#E6EAED]/70 dark:bg-[#0E1B2B]">
                  <button
                    type="button"
                    onClick={() => setCfgEnabled(true)}
                    className={`h-9 rounded-md font-semibold transition-colors ${
                      cfgEnabled
                        ? 'bg-white dark:bg-[#15263B] text-[#2AC38B] shadow-sm'
                        : 'opacity-60'
                    }`}
                  >
                    Própria via CNPJ
                  </button>
                  <button
                    type="button"
                    onClick={() => setCfgEnabled(false)}
                    className={`h-9 rounded-md font-semibold transition-colors ${
                      !cfgEnabled
                        ? 'bg-white dark:bg-[#15263B] text-[#EF4444] shadow-sm'
                        : 'opacity-60'
                    }`}
                  >
                    Terceirizada (Sem CLT)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">
                  CNPJ do Condomínio Empregador *
                </label>
                <input
                  type="text"
                  required
                  value={cfgCnpj}
                  onChange={(e) => setCfgCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                />
              </div>

              {cfgEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1 opacity-80">
                      Mínimo Diurno (06h–18h)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={cfgMinDay}
                      onChange={(e) => setCfgMinDay(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 opacity-80">
                      Mínimo Noturno (18h–06h)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={cfgMinNight}
                      onChange={(e) => setCfgMinNight(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetDemoData();
                    setIsConfigOpen(false);
                  }}
                  className="h-8 px-2.5 rounded-lg text-[11px] font-medium text-[#1A73E9] hover:bg-[#1A73E9]/10 inline-flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Recarregar Dados Fictícios</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="h-9 px-3.5 rounded-lg border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-4 rounded-lg bg-[#1A73E9] text-white font-semibold"
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
