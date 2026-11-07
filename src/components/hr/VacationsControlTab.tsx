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
    <div className="space-y-4 font-sans">
      {/* KPIs de Férias */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Em Gozo de Férias Hoje
            </span>
            <Palmtree className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold tabular-nums mt-1 text-slate-900 dark:text-white">
            {activeNowCount} Colaborador{activeNowCount !== 1 ? 'es' : ''}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Férias Programadas
            </span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold tabular-nums mt-1 text-slate-900 dark:text-white">
            {scheduledCount} Período{scheduledCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-3 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Agendamento
            </span>
            <p className="text-xs text-slate-500 mt-0.5">Cadastrar novo período de férias</p>
          </div>
          <button
            type="button"
            onClick={() => openScheduleModal()}
            className="h-8 px-3 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Programar Férias</span>
          </button>
        </div>
      </div>

      {/* Cronograma de Férias Registradas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between bg-slate-100 dark:bg-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Cronograma de Férias (Ativas, Programadas e Histórico)
          </h3>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
          {sortedVacations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
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
                  className="p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-850"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {emp?.full_name ?? 'Colaborador'}
                      </span>
                      <span className="text-slate-500">({emp?.role})</span>

                      {vac.status === 'em_andamento' ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 inline-flex items-center gap-1">
                          <Palmtree className="h-3 w-3" />
                          Em Andamento
                        </span>
                      ) : vac.status === 'programada' ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Programada
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Concluída
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Gozo: {formatDateBR(vac.start_date)} até {formatDateBR(vac.end_date)} ({vac.days} dias)
                      </span>
                      <span className="text-[11px]">
                        Período Aquisitivo: {formatDateBR(vac.acquisitive_start)} a{' '}
                        {formatDateBR(vac.acquisitive_end)}
                      </span>
                      <span
                        className={`text-[11px] ${
                          vac.status !== 'concluida' && concCheck.status !== 'valid'
                            ? 'text-amber-600 dark:text-amber-300 font-semibold'
                            : ''
                        }`}
                      >
                        Limite Concessivo: {formatDateBR(vac.concessive_limit)}
                      </span>
                    </div>

                    {(coverEmp || vac.notes) && (
                      <p className="text-[11px] text-slate-500">
                        {coverEmp && (
                          <strong className="text-emerald-600 dark:text-emerald-400 mr-2 font-medium">
                            Cobertura: {coverEmp.full_name}
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
                      className="h-7 px-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteVacation(vac.id)}
                      className="h-7 w-7 border border-slate-300 dark:border-slate-700 hover:bg-red-50 text-slate-500 hover:text-red-600 inline-flex items-center justify-center"
                      title="Excluir registro de férias"
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

      {/* Visão Geral dos Colaboradores para Planejamento */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-3.5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
          Painel de Planejamento de Férias • Colaboradores ({employees.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-400 dark:border-slate-700 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingVac ? 'Editar Férias' : 'Programar Férias'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {overlappingVacations.length > 0 && (
              <div className="mb-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-2.5 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção:</strong> já existe(m){' '}
                  {overlappingVacations
                    .map((v) => empMap.get(v.employee_id)?.full_name ?? 'outro colaborador')
                    .join(', ')}{' '}
                  em férias neste intervalo.
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Colaborador
                </label>
                <select
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  className="w-full h-8 px-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-8 px-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Duração (Dias)
                  </label>
                  <select
                    value={daysCount}
                    onChange={(e) => setDaysCount(Number(e.target.value))}
                    className="w-full h-8 px-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value={10}>10 dias</option>
                    <option value={14}>14 dias</option>
                    <option value={15}>15 dias</option>
                    <option value={20}>20 dias</option>
                    <option value={30}>30 dias</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 flex items-center justify-between">
                <span className="text-slate-500">Término calculado das férias:</span>
                <strong className="text-slate-900 dark:text-white tabular-nums font-mono">
                  {formatDateBR(computedEndDate)}
                </strong>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-slate-500">
                    Início Aquisitivo
                  </label>
                  <input
                    type="date"
                    value={acqStart}
                    onChange={(e) => setAcqStart(e.target.value)}
                    className="w-full h-7 px-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-slate-500">
                    Fim Aquisitivo
                  </label>
                  <input
                    type="date"
                    value={acqEnd}
                    onChange={(e) => setAcqEnd(e.target.value)}
                    className="w-full h-7 px-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-slate-500">
                    Limite Concessivo
                  </label>
                  <input
                    type="date"
                    value={concLimit}
                    onChange={(e) => setConcLimit(e.target.value)}
                    className="w-full h-7 px-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Colaborador Substituto
                </label>
                <select
                  value={coverEmpId}
                  onChange={(e) => setCoverEmpId(e.target.value)}
                  className="w-full h-8 px-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">Não atribuído</option>
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
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Observações
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações administrativas..."
                  className="w-full h-8 px-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 px-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 font-bold"
                >
                  Salvar Férias
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
