import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Sliders,
  X,
  User,
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

    // Call PDF generator
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
    <div className="space-y-3 font-sans">
      {/* Top Toolbar (Solid, Crisp, Enterprise Styling) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none shadow-sm text-xs">
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYM((prev) => shiftMonth(prev, -1))}
            className="p-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm text-slate-900 dark:text-white min-w-[140px] text-center tracking-wide uppercase">
            {monthName} {yStr}
          </span>
          <button
            onClick={() => setSelectedYM((prev) => shiftMonth(prev, 1))}
            className="p-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            title="Próximo Mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Minimum Staff Inputs */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Mínimo Dia (D):</span>
            <input
              type="number"
              min="0"
              max="20"
              value={minDayStaff}
              onChange={(e) => handleMinDayChange(parseInt(e.target.value) || 0)}
              className="w-14 px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-bold text-slate-900 dark:text-white rounded-none focus:outline-none focus:border-slate-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Mínimo Noite (N):</span>
            <input
              type="number"
              min="0"
              max="20"
              value={minNightStaff}
              onChange={(e) => handleMinNightChange(parseInt(e.target.value) || 0)}
              className="w-14 px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-bold text-slate-900 dark:text-white rounded-none focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm(`Deseja limpar todos os ajustes manuais de ${monthName}/${yStr}?`)) {
                clearMonthOverridesV2(selectedYM);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar Ajustes Manuais
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Escala em PDF
          </button>
        </div>
      </div>

      {/* Grid Table Container (Excel / ERP style with duplicated columns per day) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none overflow-x-auto shadow-sm">
        <table className="w-full border-collapse text-left border-spacing-0 text-xs">
          <thead>
            {/* Top Header: Days of the Month */}
            <tr className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 select-none">
              <th
                rowSpan={2}
                className="py-2 px-3 border-r border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white min-w-[200px] sticky left-0 z-20 bg-slate-200 dark:bg-slate-800"
              >
                COLABORADOR ({employees.length})
              </th>

              {days.map((d) => {
                const cov = doubleCoverage.find((c) => c.date_iso === d.dateISO);
                const isDeficit = cov?.total_under_staffed;
                return (
                  <th
                    key={d.dateISO}
                    colSpan={2}
                    className={`py-1.5 px-1 text-center border-r border-slate-300 dark:border-slate-700 ${
                      isDeficit
                        ? 'bg-red-200 dark:bg-red-950/80 text-red-900 dark:text-red-200 font-bold'
                        : d.isSunday
                        ? 'bg-slate-300 dark:bg-slate-750 font-bold text-slate-900 dark:text-white'
                        : d.isWeekend
                        ? 'bg-slate-250 dark:bg-slate-750 font-semibold text-slate-900 dark:text-white'
                        : ''
                    }`}
                  >
                    <div className="text-[11px] leading-tight">{d.day}</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      {d.weekdayShort}
                    </div>
                  </th>
                );
              })}

              <th
                rowSpan={2}
                colSpan={2}
                className="py-2 px-2 text-center border-l border-slate-300 dark:border-slate-700 font-bold bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white min-w-[64px]"
              >
                TOTAL
                <div className="text-[9px] text-slate-500 font-normal">D / N</div>
              </th>
            </tr>

            {/* Sub-Header: D and N columns for each day */}
            <tr className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 border-b border-slate-300 dark:border-slate-700 text-[10px] select-none font-semibold">
              {days.map((d) => (
                <React.Fragment key={`sub-${d.dateISO}`}>
                  <th
                    className={`w-7 text-center border-r border-slate-200 dark:border-slate-750 py-1 ${
                      d.isSunday ? 'bg-slate-250 dark:bg-slate-750' : ''
                    }`}
                  >
                    D
                  </th>
                  <th
                    className={`w-7 text-center border-r border-slate-300 dark:border-slate-700 py-1 ${
                      d.isSunday ? 'bg-slate-250 dark:bg-slate-750' : ''
                    }`}
                  >
                    N
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {employees.map((emp, empIdx) => {
              let totalEmpDay = 0;
              let totalEmpNight = 0;

              return (
                <tr
                  key={emp.id}
                  className={`transition-colors ${
                    empIdx % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50/70 dark:bg-slate-850/50'
                  } hover:bg-slate-100 dark:hover:bg-slate-800`}
                >
                  {/* Employee Name (Clickable to open Rule settings) */}
                  <td
                    onClick={() => openEmployeeRules(emp)}
                    className="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 cursor-pointer sticky left-0 z-10 bg-inherit group"
                    title="Clique para configurar as regras deste colaborador"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="truncate font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {emp.full_name}
                      </div>
                      <Sliders className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{emp.role}</div>
                  </td>

                  {/* Day and Night sub-columns */}
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
                          className={`w-7 text-center border-r border-slate-200 dark:border-slate-750 p-0 select-none ${
                            isVac
                              ? 'bg-slate-200 dark:bg-slate-750 text-slate-500 cursor-not-allowed text-[10px]'
                              : assignment.day
                              ? 'bg-emerald-600 text-white font-bold cursor-pointer hover:bg-emerald-700'
                              : 'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title={
                            isVac
                              ? 'Em férias regulamentares'
                              : assignment.day
                              ? 'Ativo no Turno Diurno (Clique para desmarcar)'
                              : 'Folga no Turno Diurno (Clique para marcar)'
                          }
                        >
                          <div className="h-7 flex items-center justify-center">
                            {isVac ? 'F' : assignment.day ? '1' : ''}
                          </div>
                        </td>

                        {/* Night Cell */}
                        <td
                          onClick={() => !isVac && toggleCellShift(emp.id, d.dateISO, 'night')}
                          className={`w-7 text-center border-r border-slate-300 dark:border-slate-700 p-0 select-none ${
                            isVac
                              ? 'bg-slate-200 dark:bg-slate-750 text-slate-500 cursor-not-allowed text-[10px]'
                              : assignment.night
                              ? 'bg-emerald-600 text-white font-bold cursor-pointer hover:bg-emerald-700'
                              : 'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title={
                            isVac
                              ? 'Em férias regulamentares'
                              : assignment.night
                              ? 'Ativo no Turno Noturno (Clique para desmarcar)'
                              : 'Folga no Turno Noturno (Clique para marcar)'
                          }
                        >
                          <div className="h-7 flex items-center justify-center">
                            {isVac ? 'F' : assignment.night ? '1' : ''}
                          </div>
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* Total for this employee in month */}
                  <td className="w-8 text-center border-l border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-850/50">
                    {totalEmpDay}
                  </td>
                  <td className="w-8 text-center border-l border-slate-200 dark:border-slate-750 font-bold text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-850/50">
                    {totalEmpNight}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Bottom Totals Footer (Shows active staff per day & shift; highlights deficits directly) */}
          <tfoot className="border-t-2 border-slate-400 dark:border-slate-600 font-bold select-none text-[11px]">
            {/* Total Geral Dia */}
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-700">
              <td className="py-2 px-3 border-r border-slate-300 dark:border-slate-700 sticky left-0 z-10 bg-inherit">
                Total Ativos — Dia (D)
                <span className="text-[10px] block font-normal text-slate-500">
                  Mínimo exigido: {minDayStaff}
                </span>
              </td>
              {days.map((d) => {
                const cov = doubleCoverage.find((c) => c.date_iso === d.dateISO);
                const count = cov?.day_active_count ?? 0;
                const isUnder = cov?.day_under_staffed;
                return (
                  <td
                    key={`tot-day-${d.dateISO}`}
                    colSpan={2}
                    className={`py-1.5 px-1 text-center border-r border-slate-300 dark:border-slate-700 ${
                      isUnder
                        ? 'bg-red-500 text-white font-extrabold'
                        : 'text-slate-900 dark:text-white'
                    }`}
                    title={
                      isUnder
                        ? `Abaixo do mínimo! Ativos: ${count} / Exigido: ${minDayStaff}`
                        : `Ativos: ${count}`
                    }
                  >
                    {count}
                  </td>
                );
              })}
              <td colSpan={2} className="py-1.5 px-1 text-center font-extrabold bg-slate-200 dark:bg-slate-750">
                {doubleCoverage.reduce((acc, c) => acc + c.day_active_count, 0)}
              </td>
            </tr>

            {/* Total Geral Noite */}
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-700">
              <td className="py-2 px-3 border-r border-slate-300 dark:border-slate-700 sticky left-0 z-10 bg-inherit">
                Total Ativos — Noite (N)
                <span className="text-[10px] block font-normal text-slate-500">
                  Mínimo exigido: {minNightStaff}
                </span>
              </td>
              {days.map((d) => {
                const cov = doubleCoverage.find((c) => c.date_iso === d.dateISO);
                const count = cov?.night_active_count ?? 0;
                const isUnder = cov?.night_under_staffed;
                return (
                  <td
                    key={`tot-night-${d.dateISO}`}
                    colSpan={2}
                    className={`py-1.5 px-1 text-center border-r border-slate-300 dark:border-slate-700 ${
                      isUnder
                        ? 'bg-red-500 text-white font-extrabold'
                        : 'text-slate-900 dark:text-white'
                    }`}
                    title={
                      isUnder
                        ? `Abaixo do mínimo! Ativos: ${count} / Exigido: ${minNightStaff}`
                        : `Ativos: ${count}`
                    }
                  >
                    {count}
                  </td>
                );
              })}
              <td colSpan={2} className="py-1.5 px-1 text-center font-extrabold bg-slate-200 dark:bg-slate-750">
                {doubleCoverage.reduce((acc, c) => acc + c.night_active_count, 0)}
              </td>
            </tr>

            {/* Total Geral Diário (Dia + Noite) */}
            <tr className="bg-slate-200 dark:bg-slate-750 text-slate-900 dark:text-white">
              <td className="py-2 px-3 border-r border-slate-300 dark:border-slate-700 sticky left-0 z-10 bg-inherit">
                Total Geral (Dia + Noite)
              </td>
              {days.map((d) => {
                const cov = doubleCoverage.find((c) => c.date_iso === d.dateISO);
                const count = cov?.total_active_count ?? 0;
                return (
                  <td
                    key={`tot-all-${d.dateISO}`}
                    colSpan={2}
                    className="py-1.5 px-1 text-center border-r border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold"
                  >
                    {count}
                  </td>
                );
              })}
              <td colSpan={2} className="py-1.5 px-1 text-center font-black bg-slate-300 dark:bg-slate-700">
                {doubleCoverage.reduce((acc, c) => acc + c.total_active_count, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Employee Schedule Rules Modal */}
      {ruleModalEmp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-slate-700 w-full max-w-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Regras de Escala • {ruleModalEmp.full_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {ruleModalEmp.role} • Matrícula {ruleModalEmp.registration_code}
                </p>
              </div>
              <button
                onClick={() => setRuleModalEmp(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Rule Type Selector */}
            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setRuleType('sequence_cycle')}
                className={`py-2 px-3 text-xs font-semibold border ${
                  ruleType === 'sequence_cycle'
                    ? 'border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Sequência / Escala Cíclica (ex: 3x1, 12x36)
              </button>

              <button
                type="button"
                onClick={() => setRuleType('weekly_fixed')}
                className={`py-2 px-3 text-xs font-semibold border ${
                  ruleType === 'weekly_fixed'
                    ? 'border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Fixo por Dias da Semana
              </button>

              <button
                type="button"
                onClick={() => setRuleType('custom_days')}
                className={`py-2 px-3 text-xs font-semibold border ${
                  ruleType === 'custom_days'
                    ? 'border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Personalizado Dia a Dia
              </button>
            </div>

            {/* Content for Sequence Cycle */}
            {ruleType === 'sequence_cycle' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Padrão de Escala Cíclica:
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: '3x1', label: 'Escala 3x1 (3 trabalha, 1 folga)', w: 3, o: 1 },
                      { id: '12x36', label: 'Escala 12x36 (1 trabalha, 1 folga)', w: 1, o: 1 },
                      { id: '5x2', label: 'Escala 5x2 (5 trabalha, 2 folga)', w: 5, o: 2 },
                      { id: '6x1', label: 'Escala 6x1 (6 trabalha, 1 folga)', w: 6, o: 1 },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSeqPreset(p.id as any);
                          setSeqWorkDays(p.w);
                          setSeqOffDays(p.o);
                        }}
                        className={`px-3 py-1.5 border text-xs font-medium ${
                          seqPreset === p.id && seqWorkDays === p.w && seqOffDays === p.o
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p.id.toUpperCase()}
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
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                      Turno do Trabalho:
                    </label>
                    <select
                      value={seqShift}
                      onChange={(e) => setSeqShift(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Content for Weekly Fixed */}
            {ruleType === 'weekly_fixed' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-500">
                  Marque os turnos em que o colaborador trabalha de forma fixa em cada dia da semana:
                </p>
                <div className="border border-slate-300 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-800">
                  {[1, 2, 3, 4, 5, 6, 0].map((dIdx) => {
                    const current = weeklyDays[dIdx] || { day: false, night: false };
                    return (
                      <div
                        key={dIdx}
                        className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-850"
                      >
                        <span className="font-semibold text-slate-900 dark:text-white w-32">
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
              <div className="space-y-3 text-xs max-h-[320px] overflow-y-auto">
                <p className="text-slate-500">
                  Selecione dia a dia a presença no turno do dia e no turno da noite:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {days.map((d) => {
                    const current = customDaysMap[d.dateISO] || { day: false, night: false };
                    return (
                      <div
                        key={d.dateISO}
                        className="p-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        <div className="font-bold text-slate-900 dark:text-white mb-1">
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
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRuleModalEmp(null)}
                className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEmployeeRule}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold"
              >
                Salvar Regra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export to PDF Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-slate-700 w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                Exportar Escala em PDF
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4 text-slate-500" />
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
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-900 dark:text-white mb-1">
                  Autenticidade e Validade:
                </div>
                O documento gerado conterá a data e hora exatas da validação e da exportação,
                tornando-o válido para impressão, afixação e entrega pessoal aos colaboradores.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold"
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
