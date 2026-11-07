import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Palmtree,
  Pencil,
  Plus,
  Trash2,
  X,
  Clock,
} from 'lucide-react';
import { useHrData } from '@/contexts/HrDataContext';
import { getDocumentExpiryInfo } from '@/services/hrScheduleEngine';
import { EmployeeVacation } from '@/types/hr';
import { formatDateBR, getLocalTodayISO } from '@/utils/formatters';

function addDaysISO(startISO: string, daysToAdd: number): string {
  const [y, m, d] = startISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d + daysToAdd);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}

export const VacationsControlTab: React.FC = () => {
  const { bundle, saveVacation, deleteVacation } = useHrData();
  const todayISO = getLocalTodayISO();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVac, setEditingVac] = useState<EmployeeVacation | null>(null);
  const [empId, setEmpId] = useState('');
  const [acqStart, setAcqStart] = useState('');
  const [acqEnd, setAcqEnd] = useState('');
  const [concLimit, setConcLimit] = useState('');
  const [startDate, setStartDate] = useState(todayISO);
  const [daysCount, setDaysCount] = useState<number>(15);
  const [coverEmpId, setCoverEmpId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const employees = bundle?.employees ?? [];
  const vacations = bundle?.vacations ?? [];

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const sortedVacations = useMemo(
    () => [...vacations].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [vacations]
  );

  const computedEndDate = useMemo(
    () => (startDate && daysCount > 0 ? addDaysISO(startDate, daysCount - 1) : startDate),
    [startDate, daysCount]
  );

  // Verifica sobreposição com outras férias do mesmo setor 24/7
  const overlappingVacations = useMemo(() => {
    if (!startDate || !computedEndDate || !empId) return [];
    return vacations.filter((v) => {
      if (editingVac && v.id === editingVac.id) return false;
      if (v.employee_id === empId) return false;
      return v.start_date <= computedEndDate && v.end_date >= startDate;
    });
  }, [vacations, startDate, computedEndDate, empId, editingVac]);

  const activeNowCount = vacations.filter((v) => v.status === 'em_andamento').length;
  const scheduledCount = vacations.filter((v) => v.status === 'programada').length;

  const openScheduleModal = (presetEmployeeId?: string) => {
    setEditingVac(null);
    const targetEmp =
      employees.find((e) => e.id === presetEmployeeId) ?? employees[0] ?? null;
    const chosenId = targetEmp?.id ?? '';
    setEmpId(chosenId);

    const curYear = Number(todayISO.slice(0, 4));
    const admMonthDay = targetEmp ? targetEmp.admission_date.slice(5) : '03-01';
    const aStart = `${curYear - 2}-${admMonthDay}`;
    const aEnd = addDaysISO(`${curYear - 1}-${admMonthDay}`, -1);
    const cLim = addDaysISO(`${curYear}-${admMonthDay}`, -1);

    setAcqStart(aStart);
    setAcqEnd(aEnd);
    setConcLimit(cLim);
    setStartDate(addDaysISO(todayISO, 15));
    setDaysCount(20);
    setCoverEmpId('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (vac: EmployeeVacation) => {
    setEditingVac(vac);
    setEmpId(vac.employee_id);
    setAcqStart(vac.acquisitive_start);
    setAcqEnd(vac.acquisitive_end);
    setConcLimit(vac.concessive_limit);
    setStartDate(vac.start_date);
    setDaysCount(vac.days);
    setCoverEmpId(vac.cover_employee_id ?? '');
    setNotes(vac.notes ?? '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || !startDate) return;
    const status =
      todayISO > computedEndDate
        ? 'concluida'
        : todayISO >= startDate && todayISO <= computedEndDate
        ? 'em_andamento'
        : 'programada';

    saveVacation({
      id: editingVac?.id,
      employee_id: empId,
      acquisitive_start: acqStart || startDate,
      acquisitive_end: acqEnd || startDate,
      concessive_limit: concLimit || addDaysISO(startDate, 180),
      start_date: startDate,
      end_date: computedEndDate,
      days: daysCount,
      status,
      cover_employee_id: coverEmpId || null,
      notes: notes.trim() || undefined,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* KPIs de Férias */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider opacity-60 font-semibold">
              Em Gozo de Férias Hoje
            </span>
            <Palmtree className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold tabular-nums mt-1 text-amber-500">
            {activeNowCount} Colaborador{activeNowCount !== 1 ? 'es' : ''}
          </p>
          <p className="text-[11px] opacity-65 mt-0.5">
            Refletido automaticamente como &ldquo;FE&rdquo; na escala 24/7
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4">
          <span className="text-[11px] uppercase tracking-wider opacity-60 font-semibold">
            Férias Programadas
          </span>
          <p className="text-xl font-bold tabular-nums mt-1 text-[#1A73E9]">
            {scheduledCount} Período{scheduledCount !== 1 ? 's' : ''}
          </p>
          <p className="text-[11px] opacity-65 mt-0.5">
            Planejamento preventivo sem dobrar período concessivo
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider opacity-60 font-semibold">
              Integração Automática Escala
            </span>
            <p className="text-xs opacity-75 mt-1">
              Ao agendar férias, a escala mensal bloqueia os plantões do titular e sinaliza eventual desfalque.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openScheduleModal()}
            className="mt-3 h-8 px-3 rounded-lg bg-[#1A73E9] hover:bg-[#1A73E9]/90 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Programar Férias</span>
          </button>
        </div>
      </div>

      {/* Cronograma de Férias Registradas */}
      <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Cronograma de Férias (Ativas, Programadas e Histórico)</h3>
            <p className="text-[11px] opacity-60">
              Acompanhamento de períodos aquisitivos, limite concessivo CLT e cobertura operacional
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#0E1B2B]/8 dark:divide-[#E6EAED]/8">
          {sortedVacations.length === 0 ? (
            <div className="p-8 text-center text-xs opacity-60">
              Nenhum período de férias cadastrado até o momento.
            </div>
          ) : (
            sortedVacations.map((vac) => {
              const emp = empMap.get(vac.employee_id);
              const coverEmp = vac.cover_employee_id ? empMap.get(vac.cover_employee_id) : null;
              const concCheck = getDocumentExpiryInfo(vac.concessive_limit, todayISO, 60);

              return (
                <div
                  key={vac.id}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#0E1B2B]/[0.015] dark:hover:bg-[#E6EAED]/[0.015]"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {emp?.full_name ?? 'Colaborador'}
                      </span>
                      <span className="text-xs opacity-60">({emp?.role})</span>

                      {vac.status === 'em_andamento' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 inline-flex items-center gap-1">
                          <Palmtree className="h-3 w-3" />
                          Em Andamento
                        </span>
                      ) : vac.status === 'programada' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1A73E9]/15 text-[#1A73E9] inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Programada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2AC38B]/15 text-[#16885E] dark:text-[#2AC38B] inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Concluída
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="inline-flex items-center gap-1 font-medium text-[#1A73E9]">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Gozo: {formatDateBR(vac.start_date)} até {formatDateBR(vac.end_date)} ({vac.days} dias)
                      </span>
                      <span className="text-[11px] opacity-65">
                        Período Aquisitivo: {formatDateBR(vac.acquisitive_start)} a{' '}
                        {formatDateBR(vac.acquisitive_end)}
                      </span>
                      <span
                        className={`text-[11px] ${
                          vac.status !== 'concluida' && concCheck.status !== 'valid'
                            ? 'text-amber-600 dark:text-amber-300 font-semibold'
                            : 'opacity-65'
                        }`}
                      >
                        Limite Concessivo: {formatDateBR(vac.concessive_limit)}
                      </span>
                    </div>

                    {(coverEmp || vac.notes) && (
                      <p className="text-[11px] opacity-75">
                        {coverEmp && (
                          <strong className="text-[#2AC38B] mr-2">
                            Cobertura sugerida: {coverEmp.full_name}
                          </strong>
                        )}
                        {vac.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(vac)}
                      className="h-8 px-3 rounded-lg border border-[#0E1B2B]/12 dark:border-[#E6EAED]/15 hover:border-[#1A73E9] text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteVacation(vac.id)}
                      className="h-8 w-8 rounded-lg border border-[#0E1B2B]/12 dark:border-[#E6EAED]/15 hover:border-[#EF4444] hover:text-[#EF4444] inline-flex items-center justify-center"
                      title="Cancelar / Excluir registro de férias"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Visão Geral de Todos os 10 Colaboradores para Planejamento */}
      <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4">
        <h3 className="text-sm font-semibold mb-3">
          Painel Rápido de Planejamento — Todos os Colaboradores ({employees.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {employees.map((emp) => {
            const empVacs = vacations.filter((v) => v.employee_id === emp.id);
            const nextOrCurrent = empVacs.find(
              (v) => v.status === 'em_andamento' || v.status === 'programada'
            );

            return (
              <div
                key={emp.id}
                className="rounded-lg border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{emp.full_name}</p>
                  <p className="text-[11px] opacity-60 truncate">
                    Admissão: {formatDateBR(emp.admission_date)} •{' '}
                    {nextOrCurrent
                      ? `Férias: ${formatDateBR(nextOrCurrent.start_date)} (${nextOrCurrent.days}d)`
                      : 'Sem férias programadas no ciclo atual'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openScheduleModal(emp.id)}
                  className="h-7 px-2.5 rounded-md text-[11px] font-medium bg-[#1A73E9]/10 text-[#1A73E9] hover:bg-[#1A73E9]/20 shrink-0"
                >
                  Agendar
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Programar / Editar Férias */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/15 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">
                {editingVac ? 'Editar Período de Férias' : 'Programar Férias de Colaborador'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {overlappingVacations.length > 0 && (
              <div className="mb-3.5 rounded-lg bg-amber-500/12 border border-amber-500/35 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Conflito de Datas Detectado:</strong> já existe(m){' '}
                  {overlappingVacations
                    .map((v) => empMap.get(v.employee_id)?.full_name ?? 'outro colaborador')
                    .join(', ')}{' '}
                  em férias neste intervalo. Verifique a cobertura 24/7 na aba de Escalas!
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium mb-1 opacity-80">Colaborador *</label>
                <select
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} — {e.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Data de Início *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Duração (Dias CLT) *</label>
                  <select
                    value={daysCount}
                    onChange={(e) => setDaysCount(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  >
                    <option value={10}>10 dias (Fracionado)</option>
                    <option value={14}>14 dias (Mínimo 1º período CLT)</option>
                    <option value={15}>15 dias (Quinzena)</option>
                    <option value={20}>20 dias (+ 10 dias abono)</option>
                    <option value={30}>30 dias (Integral)</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg bg-[#1A73E9]/8 border border-[#1A73E9]/20 px-3 py-2 flex items-center justify-between">
                <span className="opacity-75">Término calculado das férias:</span>
                <strong className="text-[#1A73E9] tabular-nums">
                  {formatDateBR(computedEndDate)}
                </strong>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium mb-1 opacity-75">
                    Início Aquisitivo
                  </label>
                  <input
                    type="date"
                    value={acqStart}
                    onChange={(e) => setAcqStart(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1 opacity-75">
                    Fim Aquisitivo
                  </label>
                  <input
                    type="date"
                    value={acqEnd}
                    onChange={(e) => setAcqEnd(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1 opacity-75">
                    Limite Concessivo
                  </label>
                  <input
                    type="date"
                    value={concLimit}
                    onChange={(e) => setConcLimit(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">
                  Colaborador Substituto / Folguista Preferencial
                </label>
                <select
                  value={coverEmpId}
                  onChange={(e) => setCoverEmpId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                >
                  <option value="">Definir diretamente na Escala 24/7</option>
                  {employees
                    .filter((e) => e.id !== empId)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} ({e.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Observações</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Abono pecuniário de 10 dias solicitado..."
                  className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-[#1A73E9] text-white font-semibold"
                >
                  Salvar Férias e Atualizar Escala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
