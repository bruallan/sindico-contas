import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Cake,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  FileWarning,
  Filter,
  Palmtree,
  PartyPopper,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useHrData } from '@/contexts/HrDataContext';
import { buildUnifiedCalendarEvents } from '@/services/hrScheduleEngine';
import { formatYearMonthFullPT } from '@/services/hrPdfExporter';
import { CalendarEventCategory, CondoDocCategory, UnifiedCalendarEvent } from '@/types/hr';
import { formatCurrencyBRL, formatDateBR, getLocalTodayISO } from '@/utils/formatters';

type CategoryFilter = 'all' | CalendarEventCategory;
type UrgencyFilter = 'all' | 'urgent_only';
type TimeScope = 'month' | 'year';

const WEEKDAYS_HEADER = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CATEGORY_VISUAL: Record<
  CalendarEventCategory,
  {
    label: string;
    pillClass: string;
    dotClass: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  birthday: {
    label: 'Aniversários',
    pillClass: 'bg-pink-500/15 text-pink-600 dark:text-pink-300 border-pink-500/30',
    dotClass: 'bg-pink-500',
    icon: Cake,
  },
  party_room: {
    label: 'Salão de Festas',
    pillClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    dotClass: 'bg-purple-500',
    icon: PartyPopper,
  },
  condo_doc: {
    label: 'Docs. Condomínio',
    pillClass: 'bg-[#1A73E9]/15 text-[#1A73E9] border-[#1A73E9]/30',
    dotClass: 'bg-[#1A73E9]',
    icon: Building2,
  },
  employee_doc: {
    label: 'Docs. Funcionários',
    pillClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-500',
    icon: Stethoscope,
  },
  contract: {
    label: 'Contratos',
    pillClass: 'bg-[#2AC38B]/15 text-[#15855C] dark:text-[#2AC38B] border-[#2AC38B]/30',
    dotClass: 'bg-[#2AC38B]',
    icon: FileSignature,
  },
  vacation: {
    label: 'Férias',
    pillClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    dotClass: 'bg-cyan-500',
    icon: Palmtree,
  },
};

function shiftYearMonth(ym: string, deltaMonths: number): string {
  const [y, m] = ym.split('-').map(Number);
  const dt = new Date(y, m - 1 + deltaMonths, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function addOneYearISO(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  return `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const CondoCalendarSection: React.FC = () => {
  const {
    bundle,
    savePartyBooking,
    deletePartyBooking,
    saveCondoDocument,
    deleteCondoDocument,
  } = useHrData();

  const todayISO = getLocalTodayISO();
  const [viewYM, setViewYM] = useState<string>(() => todayISO.slice(0, 7));
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);

  // Pesquisa e Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');
  const [timeScope, setTimeScope] = useState<TimeScope>('month');

  // Modal Nova Reserva do Salão de Festas
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [spaceName, setSpaceName] = useState('Salão de Festas Principal');
  const [residentName, setResidentName] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [partyDate, setPartyDate] = useState(todayISO);
  const [partyStart, setPartyStart] = useState('13:00');
  const [partyEnd, setPartyEnd] = useState('22:00');
  const [guestCount, setGuestCount] = useState<number>(35);
  const [feeAmount, setFeeAmount] = useState<number>(350);

  // Modal Novo Documento do Condomínio / Contrato
  const [isCondoDocModalOpen, setIsCondoDocModalOpen] = useState(false);
  const [cdocCategory, setCdocCategory] = useState<CondoDocCategory>('condo_doc');
  const [cdocTitle, setCdocTitle] = useState('');
  const [cdocProvider, setCdocProvider] = useState('');
  const [cdocNumber, setCdocNumber] = useState('');
  const [cdocIssue, setCdocIssue] = useState(todayISO);
  const [cdocExpiry, setCdocExpiry] = useState(() => addOneYearISO(todayISO));
  const [cdocValue, setCdocValue] = useState<string>('');
  const [cdocNotes, setCdocNotes] = useState('');

  const viewYear = Number(viewYM.slice(0, 4));

  // Gera eventos unificados para o ano corrente da visualização + anos adjacentes para busca ampla
  const allYearEvents = useMemo(() => {
    if (!bundle) return [];
    const yrs = [viewYear - 1, viewYear, viewYear + 1];
    const seen = new Set<string>();
    const combined: UnifiedCalendarEvent[] = [];
    for (const yr of yrs) {
      for (const ev of buildUnifiedCalendarEvents(bundle, yr, todayISO)) {
        if (!seen.has(ev.id)) {
          seen.add(ev.id);
          combined.push(ev);
        }
      }
    }
    return combined.sort((a, b) => a.date_iso.localeCompare(b.date_iso));
  }, [bundle, viewYear, todayISO]);

  // Eventos apenas do ano da visualização (para contadores anuais como os 10 aniversários)
  const currentViewYearEvents = useMemo(
    () => allYearEvents.filter((e) => e.date_iso.startsWith(String(viewYear))),
    [allYearEvents, viewYear]
  );

  // Eventos filtrados pela categoria e urgência (antes do recorte de dia/mês para alimentar a grade mensal)
  const categoryFilteredEvents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allYearEvents.filter((ev) => {
      if (categoryFilter !== 'all' && ev.category !== categoryFilter) return false;
      if (urgencyFilter === 'urgent_only' && ev.urgency !== 'expired' && ev.urgency !== 'soon') {
        return false;
      }
      if (q && !ev.search_blob.includes(q) && !formatDateBR(ev.date_iso).includes(q)) {
        return false;
      }
      return true;
    });
  }, [allYearEvents, categoryFilter, urgencyFilter, searchTerm]);

  // Eventos exibidos na lista lateral:
  // - Se houver texto na pesquisa ou timeScope === 'year', busca no ano todo para achar tudo imediatamente!
  // - Se selectedDayISO estiver ativo, mostra aquele dia específico.
  // - Caso contrário, mostra os eventos do mês visível (`viewYM`).
  const agendaListEvents = useMemo(() => {
    if (selectedDayISO) {
      return categoryFilteredEvents.filter((e) => e.date_iso === selectedDayISO);
    }
    if (searchTerm.trim().length > 0 || timeScope === 'year') {
      return categoryFilteredEvents.filter((e) => e.date_iso.startsWith(String(viewYear)));
    }
    return categoryFilteredEvents.filter((e) => e.date_iso.startsWith(viewYM));
  }, [categoryFilteredEvents, selectedDayISO, searchTerm, timeScope, viewYear, viewYM]);

  // Células da grade mensal
  const calendarCells = useMemo(() => {
    const [y, m] = viewYM.split('-').map(Number);
    const firstWeekday = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();

    const byDate = new Map<string, UnifiedCalendarEvent[]>();
    for (const ev of categoryFilteredEvents) {
      if (!ev.date_iso.startsWith(viewYM)) continue;
      const list = byDate.get(ev.date_iso) ?? [];
      list.push(ev);
      byDate.set(ev.date_iso, list);
    }

    const cells: {
      dateISO: string | null;
      dayNumber: number | null;
      events: UnifiedCalendarEvent[];
    }[] = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ dateISO: null, dayNumber: null, events: [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateISO: iso,
        dayNumber: d,
        events: byDate.get(iso) ?? [],
      });
    }
    return cells;
  }, [viewYM, categoryFilteredEvents]);

  const countsByCategoryInYear = useMemo(() => {
    const counts: Record<string, number> = { all: currentViewYearEvents.length };
    for (const ev of currentViewYearEvents) {
      counts[ev.category] = (counts[ev.category] ?? 0) + 1;
    }
    return counts;
  }, [currentViewYearEvents]);

  const handleQuickRenewCondoDoc = (docId: string) => {
    const target = bundle?.condo_documents.find((d) => d.id === docId);
    if (!target) return;
    saveCondoDocument({
      ...target,
      issue_date: todayISO,
      expiry_date: addOneYearISO(todayISO),
    });
  };

  const handleCreatePartyBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentName.trim() || !unitLabel.trim() || !eventTitle.trim()) return;
    savePartyBooking({
      space_name: spaceName,
      resident_name: residentName.trim(),
      unit_label: unitLabel.trim(),
      event_title: eventTitle.trim(),
      date_iso: partyDate,
      start_time: partyStart,
      end_time: partyEnd,
      status: 'confirmada',
      guest_count: Number(guestCount) || 20,
      fee_amount: Number(feeAmount) || 0,
    });
    setIsPartyModalOpen(false);
    setViewYM(partyDate.slice(0, 7));
  };

  const handleCreateCondoDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cdocTitle.trim() || !cdocProvider.trim()) return;
    saveCondoDocument({
      category: cdocCategory,
      title: cdocTitle.trim(),
      provider_or_issuer: cdocProvider.trim(),
      document_number: cdocNumber.trim() || 'S/N',
      issue_date: cdocIssue,
      expiry_date: cdocExpiry,
      alert_days_before: 30,
      annual_or_monthly_value: cdocValue ? Number(cdocValue) : null,
      notes: cdocNotes.trim() || undefined,
    });
    setIsCondoDocModalOpen(false);
    setViewYM(cdocExpiry.slice(0, 7));
  };

  if (!bundle) return null;

  return (
    <div className="space-y-5">
      {/* Barra de Pesquisa, Filtros e Ações de Novo Evento */}
      <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Barra de Pesquisa */}
          <div className="relative flex-1 max-w-xl">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-45 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedDayISO(null);
              }}
              placeholder="Pesquisar aniversários, reservas do salão, AVCB, exames, contratos, apto..."
              className="w-full h-10 pl-10 pr-8 rounded-lg text-xs bg-[#E6EAED]/45 dark:bg-[#0E1B2B] border border-[#0E1B2B]/12 dark:border-[#E6EAED]/15 focus:outline-none focus:border-[#1A73E9]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Botões Rápidos de Cadastro */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setResidentName('');
                setUnitLabel('');
                setEventTitle('');
                setPartyDate(selectedDayISO ?? todayISO);
                setIsPartyModalOpen(true);
              }}
              className="h-9 px-3.5 rounded-lg text-xs font-medium border border-purple-500/35 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/18 inline-flex items-center gap-1.5 transition-colors"
            >
              <PartyPopper className="h-3.5 w-3.5" />
              <span>+ Reserva Salão de Festas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCdocTitle('');
                setCdocProvider('');
                setCdocNumber('');
                setCdocNotes('');
                setCdocValue('');
                setIsCondoDocModalOpen(true);
              }}
              className="h-9 px-3.5 rounded-lg text-xs font-semibold bg-[#1A73E9] hover:bg-[#1A73E9]/90 text-white inline-flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Doc. Condomínio / Contrato</span>
            </button>
          </div>
        </div>

        {/* Filtros de Categoria + Urgência + Escopo */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-1 border-t border-[#0E1B2B]/8 dark:border-[#E6EAED]/8">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] opacity-60 mr-1">
              <Filter className="h-3 w-3" />
              Filtrar:
            </span>

            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`h-7 px-3 rounded-full text-[11px] font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-[#1A73E9] text-white'
                  : 'bg-[#E6EAED]/65 dark:bg-[#0E1B2B] hover:bg-[#1A73E9]/10'
              }`}
            >
              Todos ({countsByCategoryInYear.all ?? 0})
            </button>

            {(
              [
                'birthday',
                'party_room',
                'condo_doc',
                'employee_doc',
                'contract',
                'vacation',
              ] as CalendarEventCategory[]
            ).map((cat) => {
              if (!bundle.config.enabled && (cat === 'birthday' || cat === 'employee_doc' || cat === 'vacation')) {
                return null;
              }
              const vis = CATEGORY_VISUAL[cat];
              const Icon = vis.icon;
              const active = categoryFilter === cat;
              const count = countsByCategoryInYear[cat] ?? 0;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`h-7 px-2.5 rounded-full text-[11px] font-medium inline-flex items-center gap-1.5 border transition-colors ${
                    active
                      ? 'bg-[#1A73E9] text-white border-[#1A73E9]'
                      : `${vis.pillClass} hover:opacity-90`
                  }`}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span>
                    {vis.label} ({count})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setUrgencyFilter((prev) => (prev === 'all' ? 'urgent_only' : 'all'))
              }
              className={`h-7 px-2.5 rounded-lg text-[11px] font-medium border inline-flex items-center gap-1 transition-colors ${
                urgencyFilter === 'urgent_only'
                  ? 'bg-[#EF4444] text-white border-[#EF4444]'
                  : 'border-[#0E1B2B]/12 dark:border-[#E6EAED]/15 hover:border-[#EF4444]/50'
              }`}
            >
              <FileWarning className="h-3 w-3" />
              <span>Apenas Vencidos / Próximos</span>
            </button>

            <div className="inline-flex rounded-lg p-0.5 bg-[#E6EAED]/70 dark:bg-[#0E1B2B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setTimeScope('month');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  timeScope === 'month' && !searchTerm
                    ? 'bg-white dark:bg-[#15263B] text-[#1A73E9] shadow-sm'
                    : 'opacity-65'
                }`}
              >
                Mês Atual
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDayISO(null);
                  setTimeScope('year');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  timeScope === 'year' || Boolean(searchTerm)
                    ? 'bg-white dark:bg-[#15263B] text-[#1A73E9] shadow-sm'
                    : 'opacity-65'
                }`}
              >
                Ano {viewYear} Inteiro
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Área Principal: Grade Mensal (Esquerda) + Agenda Detalhada (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Grade Mensal Interativa */}
        <div className="lg:col-span-7 rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#1A73E9]" />
              <h3 className="text-sm font-semibold">{formatYearMonthFullPT(viewYM)}</h3>
            </div>

            <div className="flex items-center gap-1.5">
              {viewYM !== todayISO.slice(0, 7) && (
                <button
                  type="button"
                  onClick={() => {
                    setViewYM(todayISO.slice(0, 7));
                    setSelectedDayISO(null);
                  }}
                  className="h-8 px-2.5 rounded-lg text-[11px] font-medium text-[#1A73E9] hover:bg-[#1A73E9]/10"
                >
                  Hoje
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setViewYM((ym) => shiftYearMonth(ym, -1));
                  setSelectedDayISO(null);
                }}
                className="h-8 w-8 rounded-lg border border-[#0E1B2B]/10 dark:border-[#E6EAED]/12 inline-flex items-center justify-center hover:border-[#1A73E9]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewYM((ym) => shiftYearMonth(ym, 1));
                  setSelectedDayISO(null);
                }}
                className="h-8 w-8 rounded-lg border border-[#0E1B2B]/10 dark:border-[#E6EAED]/12 inline-flex items-center justify-center hover:border-[#1A73E9]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Cabeçalho Dias da Semana */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {WEEKDAYS_HEADER.map((wd) => (
              <div
                key={wd}
                className="text-center text-[10px] uppercase tracking-wider font-semibold opacity-55 py-1"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Dias */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell, idx) => {
              if (!cell.dateISO || !cell.dayNumber) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-24 rounded-lg bg-[#0E1B2B]/[0.02] dark:bg-[#E6EAED]/[0.02]"
                  />
                );
              }

              const isToday = cell.dateISO === todayISO;
              const isSelected = cell.dateISO === selectedDayISO;
              const hasExpired = cell.events.some((e) => e.urgency === 'expired');

              return (
                <button
                  key={cell.dateISO}
                  type="button"
                  onClick={() =>
                    setSelectedDayISO((prev) => (prev === cell.dateISO ? null : cell.dateISO))
                  }
                  className={`h-24 rounded-lg p-1.5 text-left flex flex-col justify-between border transition-all overflow-hidden ${
                    isSelected
                      ? 'border-[#1A73E9] ring-2 ring-[#1A73E9]/30 bg-[#1A73E9]/[0.06]'
                      : hasExpired
                      ? 'border-[#EF4444]/45 bg-[#EF4444]/[0.04] hover:border-[#EF4444]'
                      : isToday
                      ? 'border-[#1A73E9]/50 bg-[#1A73E9]/[0.04]'
                      : 'border-[#0E1B2B]/8 dark:border-[#E6EAED]/8 hover:border-[#1A73E9]/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        isToday
                          ? 'h-5 w-5 rounded-full bg-[#1A73E9] text-white inline-flex items-center justify-center text-[11px]'
                          : ''
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.events.length > 0 && (
                      <span className="text-[9px] font-bold px-1 rounded bg-[#0E1B2B]/8 dark:bg-[#E6EAED]/12 tabular-nums">
                        {cell.events.length}
                      </span>
                    )}
                  </div>

                  {/* Mini pílulas dos eventos do dia */}
                  <div className="space-y-0.5 w-full overflow-hidden">
                    {cell.events.slice(0, 2).map((ev) => {
                      const vis = CATEGORY_VISUAL[ev.category];
                      return (
                        <div
                          key={ev.id}
                          className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate font-medium border ${
                            ev.urgency === 'expired'
                              ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                              : vis.pillClass
                          }`}
                        >
                          {ev.title
                            .replace('Aniversário: ', '🎂 ')
                            .replace('Salão de Festas Principal: ', '🎉 ')
                            .replace('Espaço Gourmet & Churrasqueira: ', '🎉 ')}
                        </div>
                      );
                    })}
                    {cell.events.length > 2 && (
                      <div className="text-[9px] opacity-60 font-medium pl-0.5">
                        +{cell.events.length - 2} mais
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita: Lista de Eventos / Resultados de Busca */}
        <div className="lg:col-span-5 rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 flex flex-col max-h-[640px]">
          <div className="p-4 border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">
                {selectedDayISO
                  ? `Eventos em ${formatDateBR(selectedDayISO)}`
                  : searchTerm.trim()
                  ? `Resultados da Pesquisa (${agendaListEvents.length})`
                  : timeScope === 'year'
                  ? `Agenda Anual Completa — ${viewYear} (${agendaListEvents.length})`
                  : `Agenda de ${formatYearMonthFullPT(viewYM)} (${agendaListEvents.length})`}
              </h3>
              <p className="text-[11px] opacity-60">
                Aniversários, salão de festas, documentos e contratos
              </p>
            </div>

            {selectedDayISO && (
              <button
                type="button"
                onClick={() => setSelectedDayISO(null)}
                className="text-xs text-[#1A73E9] hover:underline font-medium shrink-0"
              >
                Ver mês todo
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {agendaListEvents.length === 0 ? (
              <div className="py-12 text-center text-xs opacity-60 space-y-2">
                <p>Nenhum evento encontrado para este recorte.</p>
                {timeScope === 'month' && !searchTerm && (
                  <button
                    type="button"
                    onClick={() => setTimeScope('year')}
                    className="text-[#1A73E9] font-semibold hover:underline"
                  >
                    Visualizar todos os eventos de {viewYear}
                  </button>
                )}
              </div>
            ) : (
              agendaListEvents.map((ev) => {
                const vis = CATEGORY_VISUAL[ev.category];
                const Icon = vis.icon;
                const isOtherMonth = !ev.date_iso.startsWith(viewYM);

                return (
                  <div
                    key={ev.id}
                    className={`rounded-xl border p-3 space-y-2 transition-colors ${
                      ev.urgency === 'expired'
                        ? 'border-[#EF4444]/40 bg-[#EF4444]/[0.04]'
                        : ev.urgency === 'soon'
                        ? 'border-amber-500/35 bg-amber-500/[0.04]'
                        : 'border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 bg-[#E6EAED]/20 dark:bg-[#0E1B2B]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${vis.pillClass}`}
                        >
                          <Icon className="h-3 w-3" />
                          {ev.badge_label}
                        </span>

                        {ev.urgency === 'expired' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444]">
                            <AlertCircle className="h-3 w-3" />
                            Vencido!
                          </span>
                        )}
                        {ev.urgency === 'soon' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3" />
                            Atenção
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setViewYM(ev.date_iso.slice(0, 7));
                          setSelectedDayISO(ev.date_iso);
                        }}
                        title={isOtherMonth ? 'Ir para este mês no calendário' : 'Destacar dia'}
                        className="text-[11px] font-bold tabular-nums text-[#1A73E9] hover:underline shrink-0"
                      >
                        {formatDateBR(ev.date_iso)}
                      </button>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold leading-snug">{ev.title}</h4>
                      <p className="text-[11px] opacity-70 mt-0.5 leading-relaxed">{ev.subtitle}</p>
                    </div>

                    {/* Ações Rápidas para Reservas / Docs do Condomínio / Contratos */}
                    {(ev.category === 'condo_doc' ||
                      ev.category === 'contract' ||
                      ev.category === 'party_room') && (
                      <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-[#0E1B2B]/6 dark:border-[#E6EAED]/6 text-[11px]">
                        {(ev.category === 'condo_doc' || ev.category === 'contract') && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickRenewCondoDoc(ev.source_id)}
                              className="px-2 py-0.5 rounded bg-[#2AC38B]/15 hover:bg-[#2AC38B]/25 text-[#15855C] dark:text-[#2AC38B] font-semibold inline-flex items-center gap-1"
                            >
                              <RefreshCw className="h-2.5 w-2.5" />
                              <span>Renovar (+1 ano)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCondoDocument(ev.source_id)}
                              className="p-1 rounded hover:bg-[#EF4444]/15 text-[#EF4444]"
                              title="Excluir registro"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}

                        {ev.category === 'party_room' && (
                          <>
                            {ev.badge_label.includes('Pendente') && (
                              <button
                                type="button"
                                onClick={() => {
                                  const b = bundle.party_bookings.find(
                                    (item) => item.id === ev.source_id
                                  );
                                  if (b) {
                                    savePartyBooking({ ...b, status: 'confirmada' });
                                  }
                                }}
                                className="px-2 py-0.5 rounded bg-[#2AC38B]/15 text-[#15855C] dark:text-[#2AC38B] font-semibold inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                <span>Confirmar Taxa</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deletePartyBooking(ev.source_id)}
                              className="p-1 rounded hover:bg-[#EF4444]/15 text-[#EF4444]"
                              title="Cancelar reserva"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal: Nova Reserva do Salão de Festas */}
      {isPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/15 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Agendar Salão de Festas / Espaço</h3>
              <button
                type="button"
                onClick={() => setIsPartyModalOpen(false)}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePartyBooking} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium mb-1 opacity-80">Espaço Comum *</label>
                <select
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                >
                  <option value="Salão de Festas Principal">Salão de Festas Principal</option>
                  <option value="Espaço Gourmet & Churrasqueira">
                    Espaço Gourmet & Churrasqueira
                  </option>
                  <option value="Salão Infantil / Brinquedoteca">
                    Salão Infantil / Brinquedoteca
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Unidade / Apto *</label>
                  <input
                    type="text"
                    required
                    value={unitLabel}
                    onChange={(e) => setUnitLabel(e.target.value)}
                    placeholder="Ex: Torre A • Apto 502"
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Morador Responsável *</label>
                  <input
                    type="text"
                    required
                    value={residentName}
                    onChange={(e) => setResidentName(e.target.value)}
                    placeholder="Nome do condômino"
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Evento / Finalidade *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Ex: Aniversário / Confraternização"
                  className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Data *</label>
                  <input
                    type="date"
                    required
                    value={partyDate}
                    onChange={(e) => setPartyDate(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Início</label>
                  <input
                    type="time"
                    value={partyStart}
                    onChange={(e) => setPartyStart(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Término</label>
                  <input
                    type="time"
                    value={partyEnd}
                    onChange={(e) => setPartyEnd(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Nº Convidados</label>
                  <input
                    type="number"
                    min={1}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">
                    Taxa de Uso ({formatCurrencyBRL(feeAmount)})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPartyModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-[#1A73E9] text-white font-semibold"
                >
                  Confirmar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Documento do Condomínio ou Contrato */}
      {isCondoDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/15 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">
                Cadastrar Documento ou Contrato do Condomínio
              </h3>
              <button
                type="button"
                onClick={() => setIsCondoDocModalOpen(false)}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCondoDoc} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#E6EAED]/70 dark:bg-[#0E1B2B]">
                <button
                  type="button"
                  onClick={() => setCdocCategory('condo_doc')}
                  className={`h-8 rounded-md font-semibold transition-colors ${
                    cdocCategory === 'condo_doc'
                      ? 'bg-white dark:bg-[#15263B] text-[#1A73E9] shadow-sm'
                      : 'opacity-65'
                  }`}
                >
                  Doc. do Condomínio
                </button>
                <button
                  type="button"
                  onClick={() => setCdocCategory('contract')}
                  className={`h-8 rounded-md font-semibold transition-colors ${
                    cdocCategory === 'contract'
                      ? 'bg-white dark:bg-[#15263B] text-[#2AC38B] shadow-sm'
                      : 'opacity-65'
                  }`}
                >
                  Contrato Fornecedor
                </button>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Título / Objeto *</label>
                <input
                  type="text"
                  required
                  value={cdocTitle}
                  onChange={(e) => setCdocTitle(e.target.value)}
                  placeholder={
                    cdocCategory === 'contract'
                      ? 'Ex: Contrato Manutenção de Gerador'
                      : 'Ex: Certificado de Dedetização Semestral'
                  }
                  className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">
                    {cdocCategory === 'contract' ? 'Empresa Fornecedora *' : 'Órgão / Emissor *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={cdocProvider}
                    onChange={(e) => setCdocProvider(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Nº Apólice / Contrato</label>
                  <input
                    type="text"
                    value={cdocNumber}
                    onChange={(e) => setCdocNumber(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Data de Emissão *</label>
                  <input
                    type="date"
                    required
                    value={cdocIssue}
                    onChange={(e) => setCdocIssue(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={cdocExpiry}
                    onChange={(e) => setCdocExpiry(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Valor Ref. (R$)</label>
                  <input
                    type="number"
                    min={0}
                    value={cdocValue}
                    onChange={(e) => setCdocValue(e.target.value)}
                    placeholder="Opcional"
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-medium mb-1 opacity-80">Observações</label>
                  <input
                    type="text"
                    value={cdocNotes}
                    onChange={(e) => setCdocNotes(e.target.value)}
                    placeholder="Ex: Reajuste anual IPCA / aviso 30 dias"
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCondoDocModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-[#1A73E9] text-white font-semibold"
                >
                  Salvar no Calendário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
