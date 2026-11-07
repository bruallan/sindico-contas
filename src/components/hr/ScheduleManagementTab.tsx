import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
  Clock,
  Printer,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHrData } from '@/contexts/HrDataContext';
import {
  analyzeMonthlyCoverage24x7,
  buildSuggestedGapCoverOverrides,
  computeMonthlyScheduleMatrix,
  getDaysInYearMonth,
  SHIFT_META,
} from '@/services/hrScheduleEngine';
import {
  exportOfficialSchedulePdf,
  formatIsoDateTimeBR,
  formatYearMonthFullPT,
} from '@/services/hrPdfExporter';
import { ComputedCellShift, Employee, ShiftCode } from '@/types/hr';
import { formatDateBR, getLocalTodayISO } from '@/utils/formatters';

const ALL_SHIFT_OPTIONS: ShiftCode[] = ['D', 'N', 'C', 'CD', 'CN', 'FG', 'FE', 'AT'];

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export const ScheduleManagementTab: React.FC = () => {
  const { session } = useAuth();
  const {
    bundle,
    overrideShiftCell,
    applyBatchOverrides,
    resetMonthOverrides,
    validateSchedule,
    markScheduleExported,
  } = useHrData();

  const todayISO = getLocalTodayISO();
  const [selectedYM, setSelectedYM] = useState<string>(() => todayISO.slice(0, 7));

  // Modal de edição de célula individual
  const [editingCell, setEditingCell] = useState<{
    employee: Employee;
    dateISO: string;
    current: ComputedCellShift;
  } | null>(null);
  const [editShiftCode, setEditShiftCode] = useState<ShiftCode>('D');
  const [editReason, setEditReason] = useState<string>('');

  // Modal de Validação e Exportação Oficial PDF
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [validatorName, setValidatorName] = useState<string>(
    session?.client?.syndic_name || 'Síndico Responsável'
  );
  const [validationNotes, setValidationNotes] = useState<string>('');
  const [includeIndividualSlips, setIncludeIndividualSlips] = useState<boolean>(true);
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);

  const employees = bundle?.employees ?? [];
  const vacations = bundle?.vacations ?? [];
  const overrides = bundle?.schedule_overrides ?? [];
  const config = bundle?.config;

  const days = useMemo(() => getDaysInYearMonth(selectedYM), [selectedYM]);

  const matrix = useMemo(
    () =>
      computeMonthlyScheduleMatrix({
        yearMonth: selectedYM,
        employees,
        vacations,
        overrides,
      }),
    [selectedYM, employees, vacations, overrides]
  );

  const { daysSummary, allGaps } = useMemo(
    () =>
      analyzeMonthlyCoverage24x7({
        yearMonth: selectedYM,
        employees,
        matrix,
        minDayStaff: config?.min_day_staff ?? 2,
        minNightStaff: config?.min_night_staff ?? 2,
      }),
    [selectedYM, employees, matrix, config?.min_day_staff, config?.min_night_staff]
  );

  const validationRecord = useMemo(
    () => bundle?.schedule_validations.find((v) => v.year_month === selectedYM) ?? null,
    [bundle?.schedule_validations, selectedYM]
  );

  const manualOverridesInMonthCount = useMemo(
    () => overrides.filter((o) => o.date_iso.startsWith(selectedYM)).length,
    [overrides, selectedYM]
  );

  const showToast = (msg: string) => {
    setToastFeedback(msg);
    window.setTimeout(() => {
      setToastFeedback((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const openCellEditor = (employee: Employee, dateISO: string) => {
    const cell = matrix.get(`${employee.id}::${dateISO}`);
    if (!cell) return;
    setEditingCell({ employee, dateISO, current: cell });
    setEditShiftCode(cell.shift_code);
    setEditReason(cell.override_reason ?? '');
  };

  const handleSaveCellEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCell) return;

    if (editShiftCode === editingCell.current.auto_shift_code && !editReason.trim()) {
      overrideShiftCell({
        employeeId: editingCell.employee.id,
        dateISO: editingCell.dateISO,
        shiftCode: null,
      });
    } else {
      overrideShiftCell({
        employeeId: editingCell.employee.id,
        dateISO: editingCell.dateISO,
        shiftCode: editShiftCode,
        reason: editReason,
      });
    }

    setEditingCell(null);
    showToast('Turno atualizado na escala e cobertura 24/7 recalculada.');
  };

  const handleRestoreCellAuto = () => {
    if (!editingCell) return;
    overrideShiftCell({
      employeeId: editingCell.employee.id,
      dateISO: editingCell.dateISO,
      shiftCode: null,
    });
    setEditingCell(null);
    showToast('Turno restaurado para o revezamento automático.');
  };

  const handleAutoCoverGaps = () => {
    if (!bundle || allGaps.length === 0) return;
    const suggestions = buildSuggestedGapCoverOverrides({
      clientId: bundle.config.client_id,
      employees,
      matrix,
      gaps: allGaps,
    });

    if (suggestions.length === 0) {
      showToast('Nenhum colaborador disponível de folga para cobrir automaticamente.');
      return;
    }

    applyBatchOverrides(selectedYM, suggestions);
    showToast(
      `${suggestions.length} plantão(ões) de cobertura alocado(s) automaticamente para garantir equipe 24/7!`
    );
  };

  const handleResetMonthToAuto = () => {
    resetMonthOverrides(selectedYM);
    showToast('Escala do mês restaurada para o cálculo automático original.');
  };

  const handleValidateOnly = () => {
    const respName = validatorName.trim() || session?.client?.syndic_name || 'Síndico';
    const rec = validateSchedule(selectedYM, respName, validationNotes);
    if (rec) {
      showToast(
        `Escala validada oficialmente em ${formatIsoDateTimeBR(rec.validated_at)} (${rec.validation_code}).`
      );
    }
  };

  const handleConfirmValidateAndExportPdf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bundle || !config) return;
    const respName = validatorName.trim() || session?.client?.syndic_name || 'Síndico';
    const record = markScheduleExported(selectedYM, respName);
    if (!record) return;

    exportOfficialSchedulePdf({
      condoName: session?.client?.condo_name ?? 'Condomínio',
      syndicName: respName,
      config,
      yearMonth: selectedYM,
      employees,
      matrix,
      daysSummary,
      validationRecord: record,
      includeIndividualSlips,
    });

    setIsExportModalOpen(false);
    showToast(
      `PDF Oficial gerado com Data de Validação e Exportação (${record.validation_code})!`
    );
  };

  if (!bundle || !config) return null;

  const isValidated = validationRecord?.status === 'validated';
  const isModifiedAfterVal = validationRecord?.status === 'modified_after_validation';

  return (
    <div className="space-y-5">
      {/* Feedback rápido */}
      {toastFeedback && (
        <div className="rounded-xl bg-[#1A73E9]/10 border border-[#1A73E9]/30 px-4 py-2.5 text-xs font-medium text-[#1A73E9] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{toastFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastFeedback(null)}
            className="opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Barra Superior: Seletor de Competência + Ações de Validação e PDF */}
      <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-[#0E1B2B]/12 dark:border-[#E6EAED]/12 bg-[#E6EAED]/40 dark:bg-[#0E1B2B] p-1">
            <button
              type="button"
              onClick={() => setSelectedYM((ym) => shiftMonth(ym, -1))}
              className="h-8 w-8 rounded-md inline-flex items-center justify-center hover:bg-white dark:hover:bg-[#15263B] transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-semibold min-w-[148px] text-center">
              {formatYearMonthFullPT(selectedYM)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedYM((ym) => shiftMonth(ym, 1))}
              className="h-8 w-8 rounded-md inline-flex items-center justify-center hover:bg-white dark:hover:bg-[#15263B] transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {selectedYM !== todayISO.slice(0, 7) && (
            <button
              type="button"
              onClick={() => setSelectedYM(todayISO.slice(0, 7))}
              className="h-9 px-3 rounded-lg text-xs font-medium border border-[#0E1B2B]/10 dark:border-[#E6EAED]/15 hover:border-[#1A73E9] text-[#1A73E9] transition-colors"
            >
              Mês Atual
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#0E1B2B]/65 dark:text-[#E6EAED]/65 pl-2 border-l border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
            <span>
              Mínimo 24/7: <strong>{config.min_day_staff} Diurno</strong> /{' '}
              <strong>{config.min_night_staff} Noturno</strong>
            </span>
            {manualOverridesInMonthCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#1A73E9]/10 text-[#1A73E9] font-medium">
                {manualOverridesInMonthCount} ajuste{manualOverridesInMonthCount > 1 ? 's' : ''} manual
              </span>
            )}
          </div>
        </div>

        {/* Ações de Escala, Validação e Exportação PDF */}
        <div className="flex flex-wrap items-center gap-2">
          {manualOverridesInMonthCount > 0 && (
            <button
              type="button"
              onClick={handleResetMonthToAuto}
              title="Limpar alterações manuais deste mês e voltar ao revezamento automático"
              className="h-9 px-3 rounded-lg text-xs font-medium border border-[#0E1B2B]/12 dark:border-[#E6EAED]/15 hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/5 inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 opacity-75" />
              <span>Recalcular Automático</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleValidateOnly}
            className={`h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors ${
              isValidated
                ? 'border-[#2AC38B]/40 bg-[#2AC38B]/12 text-[#16885E] dark:text-[#2AC38B]'
                : 'border-[#1A73E9]/35 bg-[#1A73E9]/10 text-[#1A73E9] hover:bg-[#1A73E9]/15'
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>{isValidated ? 'Revalidar Escala' : 'Validar Escala'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setValidatorName(
                validationRecord?.validated_by ||
                  session?.client?.syndic_name ||
                  'Síndico Responsável'
              );
              setIsExportModalOpen(true);
            }}
            className="h-9 px-4 rounded-lg bg-[#1A73E9] hover:bg-[#1A73E9]/90 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar PDF p/ Impressão</span>
          </button>
        </div>
      </div>

      {/* Painel Duplo: Monitor 24/7 de Desfalques + Carimbo Oficial de Validação/Exportação */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Monitor 24/7 */}
        <div
          className={`lg:col-span-7 rounded-xl border p-4 ${
            allGaps.length === 0
              ? 'bg-[#2AC38B]/[0.07] border-[#2AC38B]/30'
              : 'bg-[#EF4444]/[0.06] border-[#EF4444]/35'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  allGaps.length === 0
                    ? 'bg-[#2AC38B]/20 text-[#14855C] dark:text-[#2AC38B]'
                    : 'bg-[#EF4444]/15 text-[#EF4444]'
                }`}
              >
                {allGaps.length === 0 ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <ShieldAlert className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {allGaps.length === 0
                    ? 'Cobertura 24/7 Garantida em Todos os Dias do Mês'
                    : `${allGaps.length} Período${allGaps.length > 1 ? 's' : ''} com Desfalque de Pessoal Sinalizado${allGaps.length > 1 ? 's' : ''}`}
                </h3>
                <p className="text-xs opacity-75 mt-0.5">
                  {allGaps.length === 0
                    ? 'Portaria e Ronda estão 100% cobertas dia (06h–18h) e noite (18h–06h) sem lacunas na operação.'
                    : 'Clique sobre os turnos na grade abaixo para remanejar um colaborador ou utilize a cobertura automática.'}
                </p>
              </div>
            </div>

            {allGaps.length > 0 && (
              <button
                type="button"
                onClick={handleAutoCoverGaps}
                className="h-8 px-3 rounded-lg bg-[#EF4444] hover:bg-[#EF4444]/90 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 shadow-sm transition-colors"
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span>Auto-Cobrir Desfalques</span>
              </button>
            )}
          </div>

          {allGaps.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#EF4444]/20 space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {allGaps.map((gap, idx) => (
                <div
                  key={`${gap.date_iso}-${gap.period}-${idx}`}
                  className="flex items-center justify-between gap-2 text-xs rounded-lg bg-white/80 dark:bg-[#0E1B2B]/65 px-3 py-1.5 border border-[#EF4444]/20"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-[#EF4444] tabular-nums whitespace-nowrap">
                      {formatDateBR(gap.date_iso)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EF4444]/15 text-[#EF4444] whitespace-nowrap">
                      {gap.period_label}
                    </span>
                    <span className="truncate opacity-85">{gap.message}</span>
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums text-[#EF4444] shrink-0">
                    {gap.assigned_count}/{gap.required_count} ativos
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selo de Validação e Exportação Oficial */}
        <div className="lg:col-span-5 rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold opacity-60">
                Controle de Validade da Escala Impressa
              </p>
              <div className="flex items-center gap-2 mt-1">
                {isValidated ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2AC38B]">
                    <CheckCircle2 className="h-4 w-4" />
                    Escala Validada Oficialmente
                  </span>
                ) : isModifiedAfterVal ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                    <AlertTriangle className="h-4 w-4" />
                    Alterada após validação — Revalidar!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium opacity-70">
                    <Clock className="h-4 w-4 text-[#1A73E9]" />
                    Em Montagem (Aguardando Validação)
                  </span>
                )}
              </div>
            </div>

            {validationRecord?.validation_code && (
              <span className="px-2 py-0.5 rounded bg-[#1A73E9]/10 text-[#1A73E9] font-mono text-[11px] font-semibold">
                {validationRecord.validation_code}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#0E1B2B]/8 dark:border-[#E6EAED]/8 text-xs">
            <div>
              <span className="block text-[10px] uppercase opacity-55">Data de Validação</span>
              <span className="font-semibold tabular-nums">
                {validationRecord?.validated_at
                  ? formatIsoDateTimeBR(validationRecord.validated_at)
                  : 'Pendente'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase opacity-55">Última Exportação PDF</span>
              <span className="font-semibold tabular-nums">
                {validationRecord?.last_exported_at
                  ? formatIsoDateTimeBR(validationRecord.last_exported_at)
                  : 'Não exportada'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grade Mensal Interativa (10 Colaboradores × Dias do Mês) */}
      <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">
              Quadro de Escala e Revezamento Automático ({employees.length} Colaboradores)
            </h3>
            <p className="text-[11px] text-[#0E1B2B]/60 dark:text-[#E6EAED]/60">
              Escalas 12x36 e comerciais geradas automaticamente com integração de férias. Clique em qualquer dia para alterar um plantão.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ALL_SHIFT_OPTIONS.map((code) => {
              const m = SHIFT_META[code];
              return (
                <span
                  key={code}
                  title={`${m.fullLabel} (${m.hoursLabel})`}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold ${m.badgeClass}`}
                >
                  <strong>{code}</strong>
                  <span className="hidden xl:inline font-normal opacity-90">
                    {m.fullLabel.replace('Plantão ', '').replace(' 12x36', '')}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs select-none">
            <thead>
              <tr className="bg-[#E6EAED]/55 dark:bg-[#0E1B2B]/70 border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
                <th className="sticky left-0 z-20 bg-[#F3F5F7] dark:bg-[#102033] text-left px-3.5 py-2.5 min-w-[215px] font-semibold border-r border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
                  Colaborador / Escala Base
                </th>
                {daysSummary.map((ds) => {
                  const hasGap = ds.gaps.length > 0;
                  const isToday = ds.date_iso === todayISO;
                  return (
                    <th
                      key={ds.date_iso}
                      title={
                        hasGap
                          ? ds.gaps.map((g) => g.message).join(' | ')
                          : `${formatDateBR(ds.date_iso)} — Cobertura 24/7 OK`
                      }
                      className={`px-1 py-2 min-w-[32px] text-center border-r border-[#0E1B2B]/5 dark:border-[#E6EAED]/5 ${
                        hasGap
                          ? 'bg-[#EF4444]/15 text-[#EF4444]'
                          : isToday
                          ? 'bg-[#1A73E9]/15 text-[#1A73E9]'
                          : ds.is_weekend
                          ? 'bg-[#0E1B2B]/[0.04] dark:bg-[#E6EAED]/[0.04]'
                          : ''
                      }`}
                    >
                      <div className="text-[11px] font-bold tabular-nums leading-tight">
                        {String(ds.day_number).padStart(2, '0')}
                      </div>
                      <div className="text-[9px] uppercase opacity-70 font-medium leading-tight">
                        {ds.weekday_short}
                      </div>
                    </th>
                  );
                })}
                <th className="px-2.5 py-2 text-center font-semibold min-w-[46px]">Plantões</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#0E1B2B]/8 dark:divide-[#E6EAED]/8">
              {employees.map((emp) => {
                let workedCount = 0;

                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-[#0E1B2B]/[0.02] dark:hover:bg-[#E6EAED]/[0.02]"
                  >
                    <td className="sticky left-0 z-10 bg-white dark:bg-[#15263B] px-3.5 py-2 border-r border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-semibold truncate max-w-[165px]" title={emp.full_name}>
                          {emp.full_name}
                        </span>
                        <span className="text-[10px] font-mono opacity-50 shrink-0">
                          {emp.registration_code}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#0E1B2B]/60 dark:text-[#E6EAED]/60 truncate">
                        {emp.role}
                      </div>
                    </td>

                    {days.map((d) => {
                      const cell = matrix.get(`${emp.id}::${d.dateISO}`);
                      const code = cell?.shift_code ?? 'FG';
                      const meta = SHIFT_META[code];
                      if (
                        code === 'D' ||
                        code === 'N' ||
                        code === 'C' ||
                        code === 'CD' ||
                        code === 'CN'
                      ) {
                        workedCount++;
                      }

                      return (
                        <td
                          key={d.dateISO}
                          onClick={() => openCellEditor(emp, d.dateISO)}
                          title={`${emp.full_name} • ${formatDateBR(d.dateISO)}: ${meta.fullLabel}${
                            cell?.override_reason ? ` (${cell.override_reason})` : ''
                          } — Clique para editar`}
                          className={`relative p-0.5 text-center border-r border-[#0E1B2B]/5 dark:border-[#E6EAED]/5 cursor-pointer transition-transform hover:scale-105 ${
                            d.isWeekend ? 'bg-[#0E1B2B]/[0.015] dark:bg-[#E6EAED]/[0.015]' : ''
                          }`}
                        >
                          <div
                            className={`h-7 w-full rounded flex items-center justify-center text-[10px] tabular-nums ${meta.cellClass}`}
                          >
                            {code}
                          </div>
                          {cell?.is_manual_override && (
                            <span
                              className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#1A73E9]"
                              title="Ajustado manualmente"
                            />
                          )}
                        </td>
                      );
                    })}

                    <td className="px-2 py-2 text-center font-semibold tabular-nums text-[11px]">
                      {workedCount}
                    </td>
                  </tr>
                );
              })}

              {/* Rodapé Analítico de Cobertura 24/7 */}
              <tr className="bg-[#E6EAED]/40 dark:bg-[#0E1B2B]/60 border-t-2 border-[#0E1B2B]/15 dark:border-[#E6EAED]/15">
                <td className="sticky left-0 z-10 bg-[#EEF1F4] dark:bg-[#102033] px-3.5 py-2 font-semibold text-[11px] border-r border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
                  Cobertura Diurna (06h–18h)
                </td>
                {daysSummary.map((ds) => (
                  <td
                    key={`day-${ds.date_iso}`}
                    title={
                      ds.day_shift_staff.length > 0
                        ? `Diurno 06h–18h: ${ds.day_shift_staff.map((e) => e.full_name).join(', ')}`
                        : 'Ninguém escalado no plantão 06h–18h!'
                    }
                    className={`text-center py-1.5 text-[11px] font-bold tabular-nums border-r border-[#0E1B2B]/5 dark:border-[#E6EAED]/5 ${
                      ds.day_ok
                        ? 'text-[#16885E] dark:text-[#2AC38B]'
                        : 'bg-[#EF4444]/20 text-[#EF4444]'
                    }`}
                  >
                    {ds.day_shift_staff.length}
                  </td>
                ))}
                <td className="text-center text-[10px] opacity-60">24/7</td>
              </tr>

              <tr className="bg-[#E6EAED]/40 dark:bg-[#0E1B2B]/60">
                <td className="sticky left-0 z-10 bg-[#EEF1F4] dark:bg-[#102033] px-3.5 py-2 font-semibold text-[11px] border-r border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
                  Cobertura Noturna (18h–06h)
                </td>
                {daysSummary.map((ds) => (
                  <td
                    key={`night-${ds.date_iso}`}
                    title={
                      ds.night_shift_staff.length > 0
                        ? `Noturno 18h–06h: ${ds.night_shift_staff.map((e) => e.full_name).join(', ')}`
                        : 'Ninguém escalado no plantão 18h–06h!'
                    }
                    className={`text-center py-1.5 text-[11px] font-bold tabular-nums border-r border-[#0E1B2B]/5 dark:border-[#E6EAED]/5 ${
                      ds.night_ok
                        ? 'text-[#16885E] dark:text-[#2AC38B]'
                        : 'bg-[#EF4444]/20 text-[#EF4444]'
                    }`}
                  >
                    {ds.night_shift_staff.length}
                  </td>
                ))}
                <td className="text-center text-[10px] opacity-60">24/7</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Alterar Turno Individual na Escala */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/15 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1A73E9]">
                  Ajuste Pontual de Escala • {formatDateBR(editingCell.dateISO)}
                </span>
                <h3 className="text-base font-semibold mt-0.5">{editingCell.employee.full_name}</h3>
                <p className="text-xs opacity-65">{editingCell.employee.role}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCellEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2 opacity-80">
                  Selecione o Turno / Situação para este dia
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_SHIFT_OPTIONS.map((code) => {
                    const m = SHIFT_META[code];
                    const selected = editShiftCode === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setEditShiftCode(code)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          selected
                            ? 'border-[#1A73E9] bg-[#1A73E9]/10 ring-1 ring-[#1A73E9]'
                            : 'border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 hover:border-[#1A73E9]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{code}</span>
                          {editingCell.current.auto_shift_code === code && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0E1B2B]/8 dark:bg-[#E6EAED]/10 opacity-75">
                              Automático
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-medium mt-0.5 truncate">{m.fullLabel}</div>
                        <div className="text-[10px] opacity-60 truncate">{m.hoursLabel}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 opacity-80">
                  Justificativa / Observação (Opcional)
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Ex: Cobertura de férias, troca de plantão, atestado..."
                  className="w-full h-9 px-3 rounded-lg text-xs bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                {editingCell.current.is_manual_override ? (
                  <button
                    type="button"
                    onClick={handleRestoreCellAuto}
                    className="h-9 px-3 rounded-lg text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                  >
                    Restaurar Automático ({editingCell.current.auto_shift_code})
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCell(null)}
                    className="h-9 px-4 rounded-lg text-xs font-medium border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-4 rounded-lg text-xs font-semibold bg-[#1A73E9] hover:bg-[#1A73E9]/90 text-white"
                  >
                    Aplicar na Escala
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Validação Oficial e Exportação em PDF para Impressão e Entrega */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/15 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1A73E9]">
                  Documento Oficial para Impressão e Entrega Pessoal
                </span>
                <h3 className="text-base font-semibold mt-0.5">
                  Validar e Exportar Escala em PDF — {formatYearMonthFullPT(selectedYM)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {allGaps.length > 0 && (
              <div className="mb-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 p-3 flex items-start gap-2.5 text-xs text-[#EF4444]">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção — Existem {allGaps.length} período(s) com desfalque sinalizado!</strong>
                  <p className="opacity-90 mt-0.5">
                    Recomendamos utilizar o botão &ldquo;Auto-Cobrir Desfalques&rdquo; antes de imprimir, ou prosseguir ciente de que a ressalva constará no cabeçalho do PDF.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmValidateAndExportPdf} className="space-y-4">
              <div className="rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="opacity-65">Condomínio / CNPJ Empregador:</span>
                  <span className="font-semibold">
                    {session?.client?.condo_name} ({config.cnpj})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-65">Data de Validação Oficial:</span>
                  <span className="font-semibold text-[#2AC38B]">
                    {isValidated && validationRecord?.validated_at
                      ? formatIsoDateTimeBR(validationRecord.validated_at)
                      : `${formatIsoDateTimeBR(new Date().toISOString())} (Ao confirmar)`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-65">Data e Hora de Exportação (Emissão):</span>
                  <span className="font-semibold text-[#1A73E9]">
                    {formatIsoDateTimeBR(new Date().toISOString())}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 opacity-80">
                  Responsável pela Validação Oficial (Síndico / Gestor) *
                </label>
                <input
                  type="text"
                  required
                  value={validatorName}
                  onChange={(e) => setValidatorName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-sm bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 opacity-80">
                  Observações de Vigência (Opcional)
                </label>
                <input
                  type="text"
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  placeholder="Ex: Escala afixada no quadro de avisos da portaria e entregue mediante recibo"
                  className="w-full h-9 px-3 rounded-lg text-xs bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 cursor-pointer hover:border-[#1A73E9]/40">
                <input
                  type="checkbox"
                  checked={includeIndividualSlips}
                  onChange={(e) => setIncludeIndividualSlips(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-[#1A73E9] focus:ring-[#1A73E9]"
                />
                <div className="text-xs">
                  <span className="font-semibold block">
                    Incluir Página de Protocolo Individual de Entrega e Assinatura
                  </span>
                  <span className="opacity-65">
                    Gera a folha de ciência com os 10 colaboradores, resumo da jornada mensal, campo de data de recebimento e linha para colher assinatura presencial.
                  </span>
                </div>
              </label>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="h-9 px-4 rounded-lg text-xs font-medium border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg text-xs font-semibold bg-[#1A73E9] hover:bg-[#1A73E9]/90 text-white inline-flex items-center gap-2 shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Validar e Baixar PDF p/ Impressão</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
