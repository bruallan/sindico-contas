import {
  CondoHrBundle,
  DayDoubleCoverage,
  DayShiftAssignment,
  Employee,
  EmployeeDocumentType,
  EmployeeVacation,
  ExpiryStatus,
  ScheduleOverrideCell,
  UnifiedCalendarEvent,
} from '@/types/hr';
import { getLocalTodayISO } from '@/utils/formatters';

export const WEEKDAYS_INITIALS_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const WEEKDAYS_FULL_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const EMPLOYEE_DOC_TYPE_LABELS: Record<EmployeeDocumentType, string> = {
  aso_admissional: 'ASO — Exame Admissional',
  aso_periodico: 'ASO — Exame Periódico (NR-07)',
  brigada_incendio: 'Brigada de Incêndio (NR-23)',
  nr10: 'Segurança em Eletricidade (NR-10)',
  nr35: 'Trabalho em Altura (NR-35)',
  portaria_cftv: 'Portaria & Monitoramento CFTV',
  epi_nr06: 'EPIs e Saneantes (NR-06)',
  outro: 'Certificado / Documento',
};

export function getDaysInYearMonth(yearMonth: string): {
  dateISO: string;
  day: number;
  weekdayIndex: number; // 0 = Dom .. 6 = Sáb
  weekdayShort: string;
  isSunday: boolean;
  isWeekend: boolean;
}[] {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return [];
  const totalDays = new Date(y, m, 0).getDate();
  const list = [];
  for (let d = 1; d <= totalDays; d++) {
    const dt = new Date(y, m - 1, d);
    const wd = dt.getDay();
    const dateISO = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    list.push({
      dateISO,
      day: d,
      weekdayIndex: wd,
      weekdayShort: WEEKDAYS_INITIALS_PT[wd],
      isSunday: wd === 0,
      isWeekend: wd === 0 || wd === 6,
    });
  }
  return list;
}

/**
 * Calcula a escala de um colaborador em uma data aplicando as regras estabelecidas:
 * 1. Fixo por dias da semana
 * 2. Sequência cíclica (ex: 3x1, 12x36, 5x2, 6x1)
 * 3. Personalizado dia a dia
 * Sobrepostos por Férias e Ajustes Manuais individuais.
 */
export function computeEmployeeDayAssignment(params: {
  employee: Employee;
  dateISO: string;
  vacations: EmployeeVacation[];
  overrides: ScheduleOverrideCell[];
}): DayShiftAssignment {
  const { employee, dateISO, vacations, overrides } = params;

  // 1. Checagem de Férias
  const onVacation = vacations.some(
    (v) =>
      v.employee_id === employee.id &&
      dateISO >= v.start_date &&
      dateISO <= v.end_date &&
      v.status !== 'concluida'
  ) || vacations.some(
    (v) =>
      v.employee_id === employee.id &&
      dateISO >= v.start_date &&
      dateISO <= v.end_date
  );

  if (onVacation) {
    return {
      day: false,
      night: false,
      isVacation: true,
      notes: 'Férias regulamentares',
    };
  }

  // 2. Checagem de Ajuste Manual Direto na Célula
  const manual = overrides.find(
    (o) => o.employee_id === employee.id && o.date_iso === dateISO
  );
  if (manual) {
    return {
      day: manual.day,
      night: manual.night,
      isOverride: true,
      notes: manual.reason,
    };
  }

  // 3. Aplicação da Regra Base do Funcionário
  const rule = employee.schedule_rule;
  const [y, m, d] = dateISO.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  const weekday = targetDate.getDay();

  if (rule.ruleType === 'weekly_fixed' && rule.weeklyFixed) {
    const fixedForDay = rule.weeklyFixed.days[weekday];
    return {
      day: Boolean(fixedForDay?.day),
      night: Boolean(fixedForDay?.night),
    };
  }

  if (rule.ruleType === 'sequence_cycle' && rule.sequenceCycle) {
    const { workDays, offDays, shiftType, startDate } = rule.sequenceCycle;
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const startDt = new Date(sy, sm - 1, sd);

    // Diferença em dias corridos
    const diffTime = targetDate.getTime() - startDt.getTime();
    const diffDays = Math.floor(diffTime / 86_400_000);
    const cycleLen = Math.max(1, workDays + offDays);
    const pos = ((diffDays % cycleLen) + cycleLen) % cycleLen;

    const isWorking = pos < workDays;
    if (!isWorking) {
      return { day: false, night: false };
    }

    if (shiftType === 'day') return { day: true, night: false };
    if (shiftType === 'night') return { day: false, night: true };
    return { day: true, night: true };
  }

  if (rule.ruleType === 'custom_days' && rule.customDays) {
    const custom = rule.customDays.days[dateISO];
    if (custom) {
      return { day: Boolean(custom.day), night: Boolean(custom.night) };
    }
  }

  return { day: false, night: false };
}

/**
 * Monta o mapa de atribuição para toda a matriz do mês:
 * Chave: `${employeeId}::${dateISO}` -> { day: boolean, night: boolean }
 */
export function computeMonthlyDoubleMatrix(params: {
  yearMonth: string;
  employees: Employee[];
  vacations: EmployeeVacation[];
  overrides: ScheduleOverrideCell[];
}): Map<string, DayShiftAssignment> {
  const { yearMonth, employees, vacations, overrides } = params;
  const days = getDaysInYearMonth(yearMonth);
  const matrix = new Map<string, DayShiftAssignment>();

  for (const emp of employees) {
    for (const d of days) {
      const assignment = computeEmployeeDayAssignment({
        employee: emp,
        dateISO: d.dateISO,
        vacations,
        overrides,
      });
      matrix.set(`${emp.id}::${d.dateISO}`, assignment);
    }
  }

  return matrix;
}

/**
 * Totaliza o número de funcionários ativos por dia no turno do dia e no turno da noite.
 * Avalia se o dia ou turno está abaixo do mínimo exigido.
 */
export function computeDaysDoubleCoverage(params: {
  yearMonth: string;
  employees: Employee[];
  matrix: Map<string, DayShiftAssignment>;
  minDayStaff: number;
  minNightStaff: number;
}): DayDoubleCoverage[] {
  const { yearMonth, employees, matrix, minDayStaff, minNightStaff } = params;
  const days = getDaysInYearMonth(yearMonth);

  return days.map((d) => {
    let dayCount = 0;
    let nightCount = 0;

    for (const emp of employees) {
      const cell = matrix.get(`${emp.id}::${d.dateISO}`);
      if (cell?.day) dayCount++;
      if (cell?.night) nightCount++;
    }

    const dayUnder = dayCount < minDayStaff;
    const nightUnder = nightCount < minNightStaff;
    const totalCount = dayCount + nightCount;

    return {
      date_iso: d.dateISO,
      day_number: d.day,
      weekday_index: d.weekdayIndex,
      weekday_short: d.weekdayShort,
      is_sunday: d.isSunday,
      is_weekend: d.isWeekend,
      day_active_count: dayCount,
      night_active_count: nightCount,
      total_active_count: totalCount,
      day_under_staffed: dayUnder,
      night_under_staffed: nightUnder,
      total_under_staffed: dayUnder || nightUnder,
    };
  });
}

/**
 * Calcula validade de documentos
 */
export function getDocumentExpiryInfo(
  expiryDateISO: string | null | undefined,
  todayISO = getLocalTodayISO(),
  warningDays = 30
): {
  status: ExpiryStatus;
  daysDiff: number | null;
  label: string;
} {
  if (!expiryDateISO) {
    return { status: 'permanent', daysDiff: null, label: 'Permanente' };
  }

  const [ty, tm, td] = todayISO.split('-').map(Number);
  const [ey, em, ed] = expiryDateISO.slice(0, 10).split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const expUtc = Date.UTC(ey, em - 1, ed);
  const daysDiff = Math.round((expUtc - todayUtc) / 86_400_000);

  if (daysDiff < 0) {
    return {
      status: 'expired',
      daysDiff,
      label: `Vencido (${Math.abs(daysDiff)}d)`,
    };
  }

  if (daysDiff === 0) {
    return { status: 'expired', daysDiff: 0, label: 'Vence hoje' };
  }

  if (daysDiff <= warningDays) {
    return {
      status: 'expiring_soon',
      daysDiff,
      label: `Vence em ${daysDiff}d`,
    };
  }

  return {
    status: 'valid',
    daysDiff,
    label: `Válido (${daysDiff}d)`,
  };
}

/**
 * Lista unificada de eventos do Calendário do Condomínio
 */
export function buildUnifiedCalendarEvents(
  bundle: CondoHrBundle,
  targetYear: number,
  todayISO = getLocalTodayISO()
): UnifiedCalendarEvent[] {
  const events: UnifiedCalendarEvent[] = [];
  const hrEnabled = bundle.config.enabled;
  const empMap = new Map(bundle.employees.map((e) => [e.id, e]));

  if (hrEnabled) {
    // 1. Aniversários dos colaboradores
    for (const emp of bundle.employees) {
      if (emp.status === 'desligado') continue;
      const parts = emp.birth_date.split('-');
      if (parts.length === 3) {
        const monthStr = parts[1];
        const dayStr = parts[2];
        const isLeapDay = monthStr === '02' && dayStr === '29';
        const isLeapYear =
          (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
        const safeDay = isLeapDay && !isLeapYear ? '28' : dayStr;
        const dateInYear = `${targetYear}-${monthStr}-${safeDay}`;

        events.push({
          id: `bday-${emp.id}-${targetYear}`,
          date_iso: dateInYear,
          category: 'birthday',
          title: `Aniversário: ${emp.full_name}`,
          subtitle: `${emp.role} (${emp.registration_code})`,
          badge_label: 'Aniversário',
          urgency: 'celebration',
          search_blob: `aniversario colaborador funcionario ${emp.full_name} ${emp.role} ${emp.registration_code}`.toLowerCase(),
          source_id: emp.id,
        });
      }
    }

    // 2. Vencimento de documentos de colaboradores
    for (const doc of bundle.employee_documents) {
      if (!doc.expiry_date || !doc.expiry_date.startsWith(String(targetYear))) continue;
      const emp = empMap.get(doc.employee_id);
      const exp = getDocumentExpiryInfo(doc.expiry_date, todayISO, 30);

      events.push({
        id: `empdoc-${doc.id}`,
        date_iso: doc.expiry_date,
        category: 'employee_doc',
        title: `${doc.title} — ${emp?.full_name ?? 'Colaborador'}`,
        subtitle: `${emp?.role ?? ''} • ${doc.issuer} • ${exp.label}`,
        badge_label: 'Doc. Funcionário',
        urgency:
          exp.status === 'expired'
            ? 'expired'
            : exp.status === 'expiring_soon'
            ? 'soon'
            : 'normal',
        search_blob: `documento exame certificado vencimento ${doc.title} ${doc.issuer} ${emp?.full_name ?? ''}`.toLowerCase(),
        source_id: doc.id,
      });
    }

    // 3. Férias
    for (const vac of bundle.vacations) {
      const emp = empMap.get(vac.employee_id);
      if (vac.start_date.startsWith(String(targetYear))) {
        events.push({
          id: `vac-${vac.id}`,
          date_iso: vac.start_date,
          category: 'vacation',
          title: `Férias: ${emp?.full_name ?? 'Colaborador'}`,
          subtitle: `${vac.days} dias (${vac.start_date} a ${vac.end_date})`,
          badge_label: 'Férias',
          urgency: 'normal',
          search_blob: `ferias ${emp?.full_name ?? ''} ${emp?.role ?? ''}`.toLowerCase(),
          source_id: vac.id,
        });
      }
    }
  }

  // 4. Reservas do Salão de Festas
  for (const booking of bundle.party_bookings) {
    if (booking.status === 'cancelada') continue;
    if (!booking.date_iso.startsWith(String(targetYear))) continue;

    events.push({
      id: `party-${booking.id}`,
      date_iso: booking.date_iso,
      category: 'party_room',
      title: `${booking.space_name}: ${booking.event_title}`,
      subtitle: `${booking.unit_label} (${booking.resident_name}) • ${booking.start_time}–${booking.end_time}`,
      badge_label: 'Salão de Festas',
      urgency: booking.status === 'pendente_taxa' ? 'soon' : 'normal',
      search_blob: `reserva salao festas ${booking.space_name} ${booking.resident_name} ${booking.unit_label}`.toLowerCase(),
      source_id: booking.id,
    });
  }

  // 5. Documentos e Contratos do Condomínio
  for (const cdoc of bundle.condo_documents) {
    if (!cdoc.expiry_date.startsWith(String(targetYear))) continue;
    const exp = getDocumentExpiryInfo(cdoc.expiry_date, todayISO, cdoc.alert_days_before || 30);
    const isContract = cdoc.category === 'contract';

    events.push({
      id: `condodoc-${cdoc.id}`,
      date_iso: cdoc.expiry_date,
      category: isContract ? 'contract' : 'condo_doc',
      title: cdoc.title,
      subtitle: `${cdoc.provider_or_issuer} • Nº ${cdoc.document_number} • ${exp.label}`,
      badge_label: isContract ? 'Contrato' : 'Doc. Condomínio',
      urgency:
        exp.status === 'expired'
          ? 'expired'
          : exp.status === 'expiring_soon'
          ? 'soon'
          : 'normal',
      search_blob: `${isContract ? 'contrato fornecedor' : 'documento condominio laudo avcb'} ${cdoc.title} ${cdoc.provider_or_issuer}`.toLowerCase(),
      source_id: cdoc.id,
    });
  }

  return events.sort((a, b) => a.date_iso.localeCompare(b.date_iso));
}
