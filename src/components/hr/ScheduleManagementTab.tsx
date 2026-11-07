import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Sliders,
  X,
  User,
  Sun,
  Moon,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHrData } from '@/contexts/HrDataContext';
import {
  computeDaysDoubleCoverage,
  computeMonthlyDoubleMatrix,
  getDaysInYearMonth,
} from '@/services/hrScheduleEngine';
import { exportOfficialSchedulePdf } from '@/services/hrPdfExporter';
import {
  DayShiftAssignment,
  Employee,
  EmployeeScheduleConfig,
} from '@/types/hr';
import { getLocalTodayISO } from '@/utils/formatters';

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const ScheduleManagementTab: React.FC = () => {
  const { session } = useAuth();
  const {
    bundle,
    updateConfig,
    updateScheduleRule,
    setCellDayNight,
    clearMonthOverridesV2,
    validateSchedule,
    markScheduleExported,
  } = useHrData();

  const todayISO = getLocalTodayISO();
  const [selectedYM, setSelectedYM] = useState<string>(() => todayISO.slice(0, 7));

  // Employee Rule Config Modal State
  const [ruleModalEmp, setRuleModalEmp] = useState<Employee | null>(null);
  const [ruleType, setRuleType] = useState<'weekly_fixed' | 'sequence_cycle' | 'custom_days'>(
    'sequence_cycle'
  );

  // Weekly Fixed Rule State
  const [weeklyDays, setWeeklyDays] = useState<
    Record<number, { day: boolean; night: boolean }>
  >({
    1: { day: true, night: false },
    2: { day: true, night: false },
    3: { day: true, night: false },
    4: { day: true, night: false },
    5: { day: true, night: false },
    6: { day: false, night: false },
    0: { day: false, night: false },
  });

  // Sequence Cycle Rule State
  const [seqPreset, setSeqPreset] = useState<'3x1' | '12x36' | '5x2' | '6x1' | 'custom'>('3x1');
  const [seqWorkDays, setSeqWorkDays] = useState<number>(3);
  const [seqOffDays, setSeqOffDays] = useState<number>(1);
  const [seqShift, setSeqShift] = useState<'day' | 'night' | 'both'>('day');
  const [seqStartDate, setSeqStartDate] = useState<string>(() => `${selectedYM}-01`);

  // Custom Day-by-Day Rule State
  const [customDaysMap, setCustomDaysMap] = useState<
    Record<string, { day: boolean; night: boolean }>
  >({});

  // Export PDF Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [validatorName, setValidatorName] = useState<string>(
    session?.client?.syndic_name || 'Síndico Responsável'
  );
  const [validationNotes, setValidationNotes] = useState<string>('');

  const employees = bundle?.employees ?? [];
  const vacations = bundle?.vacations ?? [];
  const overrides = bundle?.schedule_overrides_v2 ?? [];
  const config = bundle?.config;

  const minDayStaff = config?.min_day_staff ?? 2;
  const minNightStaff = config?.min_night_staff ?? 2;

  const days = useMemo(() => getDaysInYearMonth(selectedYM), [selectedYM]);

  const doubleMatrix = useMemo(() => {
    return computeMonthlyDoubleMatrix({
      yearMonth: selectedYM,
      employees,
      vacations,
      overrides,
    });
  }, [selectedYM, employees, vacations, overrides]);

  const doubleCoverage = useMemo(() => {
    return computeDaysDoubleCoverage({
      yearMonth: selectedYM,
      employees,
      matrix: doubleMatrix,
      minDayStaff,
      minNightStaff,
    });
  }, [selectedYM, employees, doubleMatrix, minDayStaff, minNightStaff]);

  const totalDeficitCount = useMemo(() => {
    return doubleCoverage.filter((c) => c.total_under_staffed).length;
  }, [doubleCoverage]);

  const openEmployeeRules = (emp: Employee) => {
    setRuleModalEmp(emp);
    const existing = emp.schedule_rule;
    if (existing) {
      setRuleType(existing.ruleType);
      if (existing.weeklyFixed) {
        setWeeklyDays(existing.weeklyFixed.days || {});
      }
      if (existing.sequenceCycle) {
        setSeqWorkDays(existing.sequenceCycle.workDays);
        setSeqOffDays(existing.sequenceCycle.offDays);
        setSeqShift(existing.sequenceCycle.shiftType);
        setSeqStartDate(existing.sequenceCycle.startDate);
        if (
          existing.sequenceCycle.workDays === 3 &&
          existing.sequenceCycle.offDays === 1
        ) {
          setSeqPreset('3x1');
        } else if (
          existing.sequenceCycle.workDays === 1 &&
          existing.sequenceCycle.offDays === 1
        ) {
          setSeqPreset('12x36');
        } else if (
          existing.sequenceCycle.workDays === 5 &&
          existing.sequenceCycle.offDays === 2
        ) {
          setSeqPreset('5x2');
        } else {
          setSeqPreset('custom');
        }
      }
      if (existing.customDays) {
        setCustomDaysMap(existing.customDays.days || {});
      }
    } else {
      setRuleType('sequence_cycle');
      setSeqWorkDays(3);
      setSeqOffDays(1);
      setSeqShift('day');
      setSeqStartDate(`${selectedYM}-01`);
    }
  };

  const handleSaveEmployeeRule = () => {
    if (!ruleModalEmp) return;

    let newRule: EmployeeScheduleConfig;

    if (ruleType === 'weekly_fixed') {
      newRule = {
        employeeId: ruleModalEmp.id,
        ruleType: 'weekly_fixed',
        weeklyFixed: { days: weeklyDays },
      };
    } else if (ruleType === 'sequence_cycle') {
      newRule = {
        employeeId: ruleModalEmp.id,
        ruleType: 'sequence_cycle',
        sequenceCycle: {
          workDays: Number(seqWorkDays) || 1,
          offDays: Number(seqOffDays) || 1,
          shiftType: seqShift,
          startDate: seqStartDate,
        },
      };
    } else {
      newRule = {
        employeeId: ruleModalEmp.id,
        ruleType: 'custom_days',
        customDays: { days: customDaysMap },
      };
    }

    updateScheduleRule(ruleModalEmp.id, newRule, selectedYM);
    setRuleModalEmp(null);
  };

  const toggleCellShift = (empId: string, dateISO: string, shift: 'day' | 'night') => {
    const key = `${empId}::${dateISO}`;
    const current = doubleMatrix.get(key) || { day: false, night: false };
    const nextDay = shift === 'day' ? !current.day : current.day;
    const nextNight = shift === 'night' ? !current.night : current.night;

    setCellDayNight({
      employeeId: empId,
      dateISO,
      day: nextDay,
      night: nextNight,
      reason: 'Ajuste manual direto na grade',
    });
  };

  const handleMinDayChange = (val: number) => {
    updateConfig({ min_day_staff: Math.max(0, val) });
  };

  const handleMinNightChange = (val: number) => {
    updateConfig({ min_night_staff: Math.max(0, val) });
  };

  const handleExportPdf = () => {
    if (!bundle) return;
    const valRec = validateSchedule(selectedYM, validatorName, validationNotes);
    const exportRec = markScheduleExported(selectedYM, validatorName);

    exportOfficialSchedulePdf({
      condoName: session?.client?.condo_name || 'Condomínio Residencial',
      syndicName: validatorName,
      config: bundle.config,
      yearMonth: selectedYM,
      employees,
      matrix: new Map(),
      daysSummary: [],
      validationRecord:
        exportRec ||
        valRec || {
          client_id: session?.client?.id || '',
          year_month: selectedYM,
          validated_at: new Date().toISOString(),
          validated_by: validatorName,
          status: 'validada',
          validation_code: `ESC-${selectedYM.replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`,
          last_exported_at: new Date().toISOString(),
          export_count: 1,
        },
      includeIndividualSlips: true,
    });

    setIsExportModalOpen(false);
  };

  const [yStr, mStr] = selectedYM.split('-');
  const monthName = MONTH_NAMES[Number(mStr) - 1];

  return (
    <div className="space-y-4 font-sans">
      {/* Top Toolbar: Rounded-2xl, Soft, High-end */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-[#15263B] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm text-xs">
        {/* Month Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0E1B2B] p-1 rounded-xl">
          <button
            onClick={() => setSelectedYM((prev) => shiftMonth(prev, -1))}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shadow-none"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 py-1 font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100 min-w-[140px] text-center select-none">
            {monthName} {yStr}
          </div>
          <button
            onClick={() => setSelectedYM((prev) => shiftMonth(prev, 1))}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shadow-none"
            title="Próximo Mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Minimum Staff Parameters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0E1B2B]/60 border border-slate-200/60 dark:border-slate-800/60">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Mín. Dia:</span>
            <input
              type="number"
              min="0"
              max="20"
              value={minDayStaff}
              onChange={(e) => handleMinDayChange(parseInt(e.target.value) || 0)}
              className="w-10 px-1 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-center font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0E1B2B]/60 border border-slate-200/60 dark:border-slate-800/60">
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Mín. Noite:</span>
            <input
              type="number"
              min="0"
              max="20"
              value={minNightStaff}
              onChange={(e) => handleMinNightChange(parseInt(e.target.value) || 0)}
              className="w-10 px-1 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-center font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none"
            />
          </div>

          {totalDeficitCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-medium text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{totalDeficitCount} dia(s) com desfalque</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm(`Deseja limpar todos os ajustes manuais de ${monthName}/${yStr}?`)) {
                clearMonthOverridesV2(selectedYM);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar Ajustes
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar PDF
          </button>
        </div>
      </div>


      {/* Main Grid Table Container: Rounded-2xl, Borderless Feel, Modern Floating Capsules */}
      <div className="bg-white dark:bg-[#15263B] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              {/* Top Header: Days of the Month */}
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 select-none">
                <th
                  rowSpan={2}
                  className="py-3 px-3.5 font-bold text-slate-900 dark:text-white min-w-[210px] sticky left-0 z-20 bg-slate-50 dark:bg-[#15263B] text-xs border-r border-slate-200/60 dark:border-slate-800/60"
                >
                  COLABORADOR ({employees.length})
                </th>

                {days.map((d) => {
                  const isSun = d.isSunday;

                  return (
                    <th
                      key={d.dateISO}
                      colSpan={2}
                      className={`py-1.5 px-0.5 text-center border-r border-slate-200/60 dark:border-slate-800/60 transition-colors ${
                        isSun
                          ? 'bg-purple-50/80 text-purple-900 dark:bg-purple-950/30 dark:text-purple-300'
                          : 'bg-slate-50/50 text-slate-800 dark:bg-[#15263B] dark:text-slate-200'
                      }`}
                    >
                      <div className="text-[12px] font-bold leading-tight">{d.day}</div>
                      <div
                        className={`text-[9px] font-semibold uppercase tracking-wider ${
                          isSun
                            ? 'text-purple-700 dark:text-purple-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {d.weekdayShort}
                      </div>
                    </th>
                  );
                })}

                <th
                  rowSpan={2}
                  colSpan={2}
                  className="py-2 px-1 text-center font-bold bg-slate-50 dark:bg-[#15263B] text-slate-800 dark:text-slate-200 min-w-[70px] border-l border-slate-200/60 dark:border-slate-800/60"
                >
                  TOTAL
                  <div className="text-[9px] text-slate-400 font-normal">D / N</div>
                </th>
              </tr>

              {/* Sub-Header: D and N columns for each day */}
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 text-[10px] select-none font-semibold">
                {days.map((d) => {
                  const isSun = d.isSunday;
                  const subBg = isSun
                    ? 'bg-purple-50/50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400'
                    : 'bg-slate-50/30 text-slate-400 dark:bg-[#15263B] dark:text-slate-500';

                  return (
                    <React.Fragment key={`sub-${d.dateISO}`}>
                      <th
                        className={`w-7 text-center py-1 font-semibold ${subBg}`}
                        title={`Dia ${d.day} • Turno Diurno`}
                      >
                        D
                      </th>
                      <th
                        className={`w-7 text-center py-1 font-semibold border-r border-slate-200/60 dark:border-slate-800/60 ${subBg}`}
                        title={`Dia ${d.day} • Turno Noturno`}
                      >
                        N
                      </th>
                    </React.Fragment>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
              {employees.map((emp, empIdx) => {
                let totalEmpDay = 0;
                let totalEmpNight = 0;

                return (
                  <tr
                    key={emp.id}
                    className={`transition-colors ${
                      empIdx % 2 === 0
                        ? 'bg-white dark:bg-[#15263B]'
                        : 'bg-slate-50/40 dark:bg-[#0E1B2B]/20'
                    } hover:bg-blue-50/30 dark:hover:bg-slate-800/40`}
                  >
                    {/* Employee Name (Clickable to open Rule settings) */}
                    <td
                      onClick={() => openEmployeeRules(emp)}
                      className="py-2 px-3.5 border-r border-slate-200/60 dark:border-slate-800/60 cursor-pointer sticky left-0 z-10 bg-inherit group select-none"
                      title="Clique para configurar as regras deste colaborador"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="truncate font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-xs">
                          {emp.full_name}
                        </div>
                        <Sliders className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {emp.role}
                      </div>
                    </td>

                    {/* Day and Night sub-columns (Capsules with NO number 1) */}
                    {days.map((d) => {
                      const key = `${emp.id}::${d.dateISO}`;
                      const assignment: DayShiftAssignment = doubleMatrix.get(key) || {
                        day: false,
                        night: false,
                      };

                      if (assignment.day) totalEmpDay++;
                      if (assignment.night) totalEmpNight++;

                      const isVac = assignment.isVacation;

                      return (
                        <React.Fragment key={key}>
                          {/* Day Cell */}
                          <td
                            onClick={() => !isVac && toggleCellShift(emp.id, d.dateISO, 'day')}
                            className="w-7 h-8 p-0.5 text-center select-none cursor-pointer"
                            title={
                              isVac
                                ? 'Em férias regulamentares'
                                : assignment.day
                                ? 'Ativo no Turno Diurno (Clique para desmarcar)'
                                : 'Folga no Turno Diurno (Clique para marcar)'
                            }
                          >
                            {isVac ? (
                              <div className="h-6 w-full rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center">
                                F
                              </div>
                            ) : assignment.day ? (
                              <div className="h-6 w-full rounded-md bg-emerald-500 hover:bg-emerald-600 transition-all shadow-sm active:scale-95" />
                            ) : (
                              <div className="h-6 w-full rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors" />
                            )}
                          </td>

                          {/* Night Cell */}
                          <td
                            onClick={() => !isVac && toggleCellShift(emp.id, d.dateISO, 'night')}
                            className="w-7 h-8 p-0.5 text-center border-r border-slate-200/60 dark:border-slate-800/60 select-none cursor-pointer"
                            title={
                              isVac
                                ? 'Em férias regulamentares'
                                : assignment.night
                                ? 'Ativo no Turno Noturno (Clique para desmarcar)'
                                : 'Folga no Turno Noturno (Clique para marcar)'
                            }
                          >
                            {isVac ? (
                              <div className="h-6 w-full rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center">
                                F
                              </div>
                            ) : assignment.night ? (
                              <div className="h-6 w-full rounded-md bg-emerald-500 hover:bg-emerald-600 transition-all shadow-sm active:scale-95" />
                            ) : (
                              <div className="h-6 w-full rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors" />
                            )}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    {/* Total for this employee in month */}
                    <td className="w-8 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-[#0E1B2B]/30 border-l border-slate-200/60 dark:border-slate-800/60">
                      {totalEmpDay}
                    </td>
                    <td className="w-8 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-100/50 dark:bg-[#0E1B2B]/50">
                      {totalEmpNight}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Bottom Totals Footer (Clean, Rounded alerts for deficits) */}
            <tfoot className="border-t border-slate-200 dark:border-slate-800 select-none text-[11px]">
              {/* Total Geral Dia */}
              <tr className="bg-slate-50/70 dark:bg-[#0E1B2B]/40 font-semibold border-b border-slate-200/60 dark:border-slate-800/60">
                <td className="py-2.5 px-3.5 border-r border-slate-200/60 dark:border-slate-800/60 sticky left-0 z-10 bg-inherit text-slate-800 dark:text-slate-200">
                  Total Dia (D)
                </td>
                {days.map((d) => {
                  const cov = doubleCoverage.find((c) => c.date_iso === d.dateISO);
                  const count = cov?.day_active_count ?? 0;
                  const isUnder = cov?.day_under_staffed;
                  return (
                    <td
                      key={`tot-day-${d.dateISO}`}
                      colSpan={2}
                      className="py-1 px-0.5 text-center border-r border-slate-200/60 dark:border-slate-800/60"
                    >
                      {isUnder ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white font-extrabold text-[11px] shadow-sm">
                          {count}
                        </span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300 font-bold">
                          {count}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td colSpan={2} className="py-1 px-1 text-center font-extrabold bg-slate-100 dark:bg-[#0E1B2B]/80 text-slate-900 dark:text-white border-l border-slate-200/60 dark:border-slate-800/60">
                  {doubleCoverage.reduce((acc, c) => acc + c.day_active_count, 0)}
                </td>
              </tr>

              {/* Total Geral Noite */}
              <tr className="bg-slate-50/70 dark:bg-[#0E1B2B]/40 font-semibold border-b border-slate-200/60 dark:border-slate-800/60">
                <td className="py-2.5 px-3.5 border-r border-slate-200/60 dark:border-slate-800/60 sticky left-0 z-10 bg-inherit text-slate-800 dark:text-slate-200">
                  Total Noite (N)
                </td>
                {days.map((d) => {
                  const cov = doubleCoverage.find((c) => c.date_iso === d.dateISO);
                  const count = cov?.night_active_count ?? 0;
                  const isUnder = cov?.night_under_staffed;
                  return (
                    <td
                      key={`tot-night-${d.dateISO}`}
                      colSpan={2}
                      className="py-1 px-0.5 text-center border-r border-slate-200/60 dark:border-slate-800/60"
                    >
                      {isUnder ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white font-extrabold text-[11px] shadow-sm">
                          {count}
                        </span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300 font-bold">
                          {count}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td colSpan={2} className="py-1 px-1 text-center font-extrabold bg-slate-100 dark:bg-[#0E1B2B]/80 text-slate-900 dark:text-white border-l border-slate-200/60 dark:border-slate-800/60">
                  {doubleCoverage.reduce((acc, c) => acc + c.night_active_count, 0)}
                </td>
              </tr>

              {/* Total Geral Diário (Dia + Noite) */}
              <tr className="bg-slate-100/90 dark:bg-[#0E1B2B] text-slate-900 dark:text-white font-bold">
                <td className="py-2.5 px-3.5 border-r border-slate-200/60 dark:border-slate-800/60 sticky left-0 z-10 bg-inherit font-extrabold">
                  Total Geral (Dia + Noite)
                </td>
                {days.map((d) => {
                  const cov = doubleCoverage.find((c) => c.date_iso === d.dateISO);
                  const count = cov?.total_active_count ?? 0;
                  return (
                    <td
                      key={`tot-all-${d.dateISO}`}
                      colSpan={2}
                      className="py-1 px-0.5 text-center border-r border-slate-200/60 dark:border-slate-800/60 font-extrabold text-slate-800 dark:text-slate-100"
                    >
                      {count}
                    </td>
                  );
                })}
                <td colSpan={2} className="py-1 px-1 text-center font-black bg-slate-200 dark:bg-slate-800 text-slate-950 dark:text-white border-l border-slate-200/60 dark:border-slate-800/60">
                  {doubleCoverage.reduce((acc, c) => acc + c.total_active_count, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Employee Schedule Rules Modal: Rounded-2xl */}
      {ruleModalEmp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#15263B] border border-slate-200 dark:border-slate-700 w-full max-w-2xl shadow-2xl p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Regras de Escala • {ruleModalEmp.full_name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {ruleModalEmp.role} • Matrícula {ruleModalEmp.registration_code}
                </p>
              </div>
              <button
                onClick={() => setRuleModalEmp(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rule Type Selector */}
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setRuleType('sequence_cycle')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  ruleType === 'sequence_cycle'
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Sequência (3x1, 12x36)
              </button>

              <button
                type="button"
                onClick={() => setRuleType('weekly_fixed')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  ruleType === 'weekly_fixed'
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Fixo Semanal
              </button>

              <button
                type="button"
                onClick={() => setRuleType('custom_days')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  ruleType === 'custom_days'
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Personalizado Dia a Dia
              </button>
            </div>

            {/* Content for Sequence Cycle */}
            {ruleType === 'sequence_cycle' && (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Padrão de Escala:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: '3x1', label: '3x1', w: 3, o: 1 },
                      { id: '12x36', label: '12x36', w: 1, o: 1 },
                      { id: '5x2', label: '5x2', w: 5, o: 2 },
                      { id: '6x1', label: '6x1', w: 6, o: 1 },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSeqPreset(p.id as any);
                          setSeqWorkDays(p.w);
                          setSeqOffDays(p.o);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          seqPreset === p.id && seqWorkDays === p.w && seqOffDays === p.o
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Escala {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      Dias de Trabalho Consecutivos:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={seqWorkDays}
                      onChange={(e) => {
                        setSeqWorkDays(parseInt(e.target.value) || 1);
                        setSeqPreset('custom');
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      Dias de Folga Consecutivos:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={seqOffDays}
                      onChange={(e) => {
                        setSeqOffDays(parseInt(e.target.value) || 1);
                        setSeqPreset('custom');
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      Turno de Atuação:
                    </label>
                    <select
                      value={seqShift}
                      onChange={(e) => setSeqShift(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="day">Turno do Dia (D)</option>
                      <option value="night">Turno da Noite (N)</option>
                      <option value="both">Ambos os Turnos (D + N)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      Data de Início da Sequência:
                    </label>
                    <input
                      type="date"
                      value={seqStartDate}
                      onChange={(e) => setSeqStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Content for Weekly Fixed */}
            {ruleType === 'weekly_fixed' && (
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                  {[1, 2, 3, 4, 5, 6, 0].map((dIdx) => {
                    const current = weeklyDays[dIdx] || { day: false, night: false };
                    return (
                      <div
                        key={dIdx}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-slate-800/60"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200 w-32">
                          {WEEKDAY_NAMES[dIdx]}
                        </span>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(current.day)}
                              onChange={(e) =>
                                setWeeklyDays((prev) => ({
                                  ...prev,
                                  [dIdx]: { ...prev[dIdx], day: e.target.checked },
                                }))
                              }
                              className="rounded"
                            />
                            <span>Turno Dia (D)</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(current.night)}
                              onChange={(e) =>
                                setWeeklyDays((prev) => ({
                                  ...prev,
                                  [dIdx]: { ...prev[dIdx], night: e.target.checked },
                                }))
                              }
                              className="rounded"
                            />
                            <span>Turno Noite (N)</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Content for Custom Days */}
            {ruleType === 'custom_days' && (
              <div className="space-y-3 text-xs max-h-[300px] overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {days.map((d) => {
                    const current = customDaysMap[d.dateISO] || { day: false, night: false };
                    return (
                      <div
                        key={d.dateISO}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        <div className="font-bold text-slate-900 dark:text-white mb-1.5">
                          Dia {d.day} ({d.weekdayShort})
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(current.day)}
                              onChange={(e) =>
                                setCustomDaysMap((prev) => ({
                                  ...prev,
                                  [d.dateISO]: {
                                    day: e.target.checked,
                                    night: Boolean(prev[d.dateISO]?.night),
                                  },
                                }))
                              }
                            />
                            <span>Dia</span>
                          </label>

                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(current.night)}
                              onChange={(e) =>
                                setCustomDaysMap((prev) => ({
                                  ...prev,
                                  [d.dateISO]: {
                                    day: Boolean(prev[d.dateISO]?.day),
                                    night: e.target.checked,
                                  },
                                }))
                              }
                            />
                            <span>Noite</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRuleModalEmp(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEmployeeRule}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm"
              >
                Salvar Regra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export to PDF Modal: Rounded-2xl */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#15263B] border border-slate-200 dark:border-slate-700 w-full max-w-md shadow-2xl p-6 rounded-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                Exportar Escala em PDF
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Responsável pela Validação / Assinatura:
                </label>
                <input
                  type="text"
                  value={validatorName}
                  onChange={(e) => setValidatorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Observações para a emissão oficial:
                </label>
                <textarea
                  rows={2}
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  placeholder="Ex: Escala aprovada em conformidade com o regime 24/7."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0E1B2B]/60 border border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">
                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                  Autenticidade e Validade:
                </div>
                O documento gerado conterá a data e hora exatas da validação e da exportação registrada.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm"
              >
                Gerar e Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
