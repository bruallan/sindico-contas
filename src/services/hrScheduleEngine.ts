import {
  ComputedCellShift,
  CondoHrBundle,
  DayCoverageSummary,
  Employee,
  EmployeeDocumentType,
  EmployeeVacation,
  ExpiryStatus,
  ScheduleOverride,
  SchedulePattern,
  ShiftCode,
  StaffingGapAlert,
  UnifiedCalendarEvent,
} from '@/types/hr';
import { getLocalTodayISO } from '@/utils/formatters';

export interface ShiftVisualMeta {
  code: ShiftCode;
  shortLabel: string;
  fullLabel: string;
  hoursLabel: string;
  badgeClass: string;
  cellClass: string;
  printBgRgb: [number, number, number];
  printTextRgb: [number, number, number];
}

export const SHIFT_META: Record<ShiftCode, ShiftVisualMeta> = {
  D: {
    code: 'D',
    shortLabel: 'D',
    fullLabel: 'Plantão Diurno 12x36',
    hoursLabel: '06:00 às 18:00',
    badgeClass: 'bg-[#1A73E9]/15 text-[#1A73E9] border-[#1A73E9]/30',
    cellClass:
      'bg-[#1A73E9]/12 text-[#1A73E9] dark:bg-[#1A73E9]/22 dark:text-[#68A8FF] font-semibold',
    printBgRgb: [226, 238, 253],
    printTextRgb: [20, 86, 179],
  },
  N: {
    code: 'N',
    shortLabel: 'N',
    fullLabel: 'Plantão Noturno 12x36',
    hoursLabel: '18:00 às 06:00',
    badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
    cellClass:
      'bg-indigo-500/14 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-200 font-semibold',
    printBgRgb: [232, 231, 252],
    printTextRgb: [67, 56, 202],
  },
  C: {
    code: 'C',
    shortLabel: 'C',
    fullLabel: 'Turno Comercial',
    hoursLabel: '08:00 às 17:00 (Sáb 08h–12h)',
    badgeClass: 'bg-[#2AC38B]/15 text-[#178F64] dark:text-[#2AC38B] border-[#2AC38B]/30',
    cellClass:
      'bg-[#2AC38B]/14 text-[#137954] dark:bg-[#2AC38B]/22 dark:text-[#4CE0AA] font-semibold',
    printBgRgb: [220, 247, 236],
    printTextRgb: [19, 121, 84],
  },
  CD: {
    code: 'CD',
    shortLabel: 'CD',
    fullLabel: 'Cobertura / Extra Diurno',
    hoursLabel: '06:00 às 18:00 (Cobertura)',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    cellClass:
      'bg-cyan-500/20 text-cyan-800 dark:bg-cyan-500/28 dark:text-cyan-200 font-bold ring-1 ring-inset ring-cyan-500/40',
    printBgRgb: [207, 250, 254],
    printTextRgb: [14, 116, 144],
  },
  CN: {
    code: 'CN',
    shortLabel: 'CN',
    fullLabel: 'Cobertura / Extra Noturno',
    hoursLabel: '18:00 às 06:00 (Cobertura)',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    cellClass:
      'bg-purple-500/20 text-purple-800 dark:bg-purple-500/28 dark:text-purple-200 font-bold ring-1 ring-inset ring-purple-500/40',
    printBgRgb: [243, 232, 255],
    printTextRgb: [107, 33, 168],
  },
  FG: {
    code: 'FG',
    shortLabel: 'FG',
    fullLabel: 'Folga de Escala',
    hoursLabel: 'Descanso regulamentar',
    badgeClass:
      'bg-[#0E1B2B]/8 text-[#0E1B2B]/60 dark:bg-[#E6EAED]/10 dark:text-[#E6EAED]/60 border-transparent',
    cellClass: 'bg-transparent text-[#0E1B2B]/35 dark:text-[#E6EAED]/30 font-normal',
    printBgRgb: [248, 250, 252],
    printTextRgb: [148, 163, 184],
  },
  FE: {
    code: 'FE',
    shortLabel: 'FE',
    fullLabel: 'Férias Regulamentares',
    hoursLabel: 'Período em gozo de férias',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    cellClass:
      'bg-amber-500/18 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200 font-semibold',
    printBgRgb: [254, 243, 199],
    printTextRgb: [180, 83, 9],
  },
  AT: {
    code: 'AT',
    shortLabel: 'AT',
    fullLabel: 'Atestado / Ausência',
    hoursLabel: 'Afastamento ou falta',
    badgeClass: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
    cellClass: 'bg-[#EF4444]/18 text-[#EF4444] font-bold ring-1 ring-inset ring-[#EF4444]/35',
    printBgRgb: [254, 226, 226],
    printTextRgb: [185, 28, 28],
  },
};

export const EMPLOYEE_DOC_TYPE_LABELS: Record<EmployeeDocumentType, string> = {
  aso_admissional: 'ASO — Exame Admissional',
  aso_periodico: 'ASO — Exame Periódico (NR-07)',
  brigada_incendio: 'Certificado Brigada de Incêndio (NR-23)',
  nr10: 'Certificado NR-10 (Instalações Elétricas)',
  nr35: 'Certificado NR-35 (Trabalho em Altura)',
  portaria_cftv: 'Capacitação Portaria, Acesso & CFTV',
  epi_nr06: 'Treinamento EPIs & Segurança (NR-06)',
  outro: 'Outro Certificado / Documento',
};

export const SCHEDULE_PATTERN_LABELS: Record<SchedulePattern, string> = {
  '12x36_day_even': '12x36 Diurno — Turma A (06h–18h)',
  '12x36_day_odd': '12x36 Diurno — Turma B (06h–18h)',
  '12x36_night_even': '12x36 Noturno — Turma A (18h–06h)',
  '12x36_night_odd': '12x36 Noturno — Turma B (18h–06h)',
  commercial_mon_sat: 'Comercial 44h — Seg a Sáb',
  relief_flex: 'Folguista / Cobertura Flexível',
};

const WEEKDAY_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function getDaysInYearMonth(yearMonth: string): {
  dateISO: string;
  day: number;
  weekdayIndex: number;
  weekdayShort: string;
  isWeekend: boolean;
}[] {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return [];
  const totalDays = new Date(y, m, 0).getDate();
  const result = [];
  for (let d = 1; d <= totalDays; d++) {
    const dt = new Date(y, m - 1, d);
    const wd = dt.getDay();
    const dateISO = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    result.push({
      dateISO,
      day: d,
      weekdayIndex: wd,
      weekdayShort: WEEKDAY_SHORT_PT[wd],
      isWeekend: wd === 0 || wd === 6,
    });
  }
  return result;
}

/**
 * Calcula o turno automático base para um colaborador em determinada data,
 * utilizando paridade contínua de dias corridos (epoch days) para que a escala 12x36
 * nunca quebre na virada de meses com 31 dias.
 */
export function getAutoShiftForEmployeeOnDate(
  employee: Employee,
  dateISO: string,
  vacations: EmployeeVacation[]
): { shiftCode: ShiftCode; isOnVacation: boolean } {
  const onVacation = vacations.some(
    (v) =>
      v.employee_id === employee.id &&
      v.status !== 'concluida' &&
      dateISO >= v.start_date &&
      dateISO <= v.end_date
  ) || vacations.some(
    (v) =>
      v.employee_id === employee.id &&
      dateISO >= v.start_date &&
      dateISO <= v.end_date
  );

  if (onVacation) {
    return { shiftCode: 'FE', isOnVacation: true };
  }

  const [y, m, d] = dateISO.split('-').map(Number);
  const epochDays = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  const isEvenEpoch = epochDays % 2 === 0;
  const weekday = new Date(y, m - 1, d).getDay(); // 0 = Dom

  switch (employee.schedule_pattern) {
    case '12x36_day_even':
      return { shiftCode: isEvenEpoch ? 'D' : 'FG', isOnVacation: false };
    case '12x36_day_odd':
      return { shiftCode: !isEvenEpoch ? 'D' : 'FG', isOnVacation: false };
    case '12x36_night_even':
      return { shiftCode: isEvenEpoch ? 'N' : 'FG', isOnVacation: false };
    case '12x36_night_odd':
      return { shiftCode: !isEvenEpoch ? 'N' : 'FG', isOnVacation: false };
    case 'commercial_mon_sat':
      return { shiftCode: weekday === 0 ? 'FG' : 'C', isOnVacation: false };
    case 'relief_flex':
      // Folguista atua em cobertura base Ter-Sáb comercial/apoio quando não escalado em plantão extra
      return {
        shiftCode: weekday === 0 || weekday === 1 ? 'FG' : 'C',
        isOnVacation: false,
      };
    default:
      return { shiftCode: 'FG', isOnVacation: false };
  }
}

/**
 * Monta a matriz completa da escala mensal combinando geração automática + férias + alterações manuais.
 */
export function computeMonthlyScheduleMatrix(params: {
  yearMonth: string;
  employees: Employee[];
  vacations: EmployeeVacation[];
  overrides: ScheduleOverride[];
}): Map<string, ComputedCellShift> {
  const { yearMonth, employees, vacations, overrides } = params;
  const days = getDaysInYearMonth(yearMonth);
  const overrideMap = new Map<string, ScheduleOverride>();

  for (const ov of overrides) {
    if (ov.date_iso.startsWith(yearMonth)) {
      overrideMap.set(`${ov.employee_id}::${ov.date_iso}`, ov);
    }
  }

  const matrix = new Map<string, ComputedCellShift>();

  for (const emp of employees) {
    for (const dayInfo of days) {
      const key = `${emp.id}::${dayInfo.dateISO}`;
      const auto = getAutoShiftForEmployeeOnDate(emp, dayInfo.dateISO, vacations);
      const manual = overrideMap.get(key);

      if (manual) {
        matrix.set(key, {
          employee_id: emp.id,
          date_iso: dayInfo.dateISO,
          shift_code: manual.shift_code,
          auto_shift_code: auto.shiftCode,
          is_manual_override: manual.shift_code !== auto.shiftCode,
          override_reason: manual.reason,
          is_on_vacation: auto.isOnVacation,
        });
      } else {
        matrix.set(key, {
          employee_id: emp.id,
          date_iso: dayInfo.dateISO,
          shift_code: auto.shiftCode,
          auto_shift_code: auto.shiftCode,
          is_manual_override: false,
          is_on_vacation: auto.isOnVacation,
        });
      }
    }
  }

  return matrix;
}

/**
 * Analisa a cobertura 24/7 em todos os dias do mês e identifica períodos com desfalque de equipe.
 */
export function analyzeMonthlyCoverage24x7(params: {
  yearMonth: string;
  employees: Employee[];
  matrix: Map<string, ComputedCellShift>;
  minDayStaff: number;
  minNightStaff: number;
}): {
  daysSummary: DayCoverageSummary[];
  allGaps: StaffingGapAlert[];
} {
  const { yearMonth, employees, matrix, minDayStaff, minNightStaff } = params;
  const days = getDaysInYearMonth(yearMonth);
  const daysSummary: DayCoverageSummary[] = [];
  const allGaps: StaffingGapAlert[] = [];

  for (const d of days) {
    const dayShiftStaff: Employee[] = [];
    const nightShiftStaff: Employee[] = [];
    const commercialStaff: Employee[] = [];
    const dayAbsences: { employee_name: string; role: string; reason: string }[] = [];
    const nightAbsences: { employee_name: string; role: string; reason: string }[] = [];

    for (const emp of employees) {
      const cell = matrix.get(`${emp.id}::${d.dateISO}`);
      if (!cell) continue;

      if (cell.shift_code === 'D' || cell.shift_code === 'CD') {
        dayShiftStaff.push(emp);
      } else if (cell.shift_code === 'N' || cell.shift_code === 'CN') {
        nightShiftStaff.push(emp);
      } else if (cell.shift_code === 'C') {
        commercialStaff.push(emp);
      }

      // Detecta quem originalmente cobriria o turno diurno ou noturno mas está ausente (Férias, Atestado ou Folga manual)
      const isNormallyDay24 =
        emp.schedule_pattern === '12x36_day_even' || emp.schedule_pattern === '12x36_day_odd';
      const isNormallyNight24 =
        emp.schedule_pattern === '12x36_night_even' || emp.schedule_pattern === '12x36_night_odd';

      const [yr, mo, dy] = d.dateISO.split('-').map(Number);
      const isEvenEpoch = Math.floor(Date.UTC(yr, mo - 1, dy) / 86_400_000) % 2 === 0;

      const expectedOnDayDuty =
        (emp.schedule_pattern === '12x36_day_even' && isEvenEpoch) ||
        (emp.schedule_pattern === '12x36_day_odd' && !isEvenEpoch);

      const expectedOnNightDuty =
        (emp.schedule_pattern === '12x36_night_even' && isEvenEpoch) ||
        (emp.schedule_pattern === '12x36_night_odd' && !isEvenEpoch);

      if (isNormallyDay24 && expectedOnDayDuty && cell.shift_code !== 'D' && cell.shift_code !== 'CD') {
        const reason =
          cell.shift_code === 'FE'
            ? 'Em Férias'
            : cell.shift_code === 'AT'
            ? cell.override_reason || 'Atestado / Falta'
            : 'Realocado / Folga Manual';
        dayAbsences.push({ employee_name: emp.full_name, role: emp.role, reason });
      }

      if (isNormallyNight24 && expectedOnNightDuty && cell.shift_code !== 'N' && cell.shift_code !== 'CN') {
        const reason =
          cell.shift_code === 'FE'
            ? 'Em Férias'
            : cell.shift_code === 'AT'
            ? cell.override_reason || 'Atestado / Falta'
            : 'Realocado / Folga Manual';
        nightAbsences.push({ employee_name: emp.full_name, role: emp.role, reason });
      }
    }

    const hasDayPortaria = dayShiftStaff.some(
      (e) => e.role_category === 'portaria' || e.role_category === 'cobertura'
    );
    const hasNightPortaria = nightShiftStaff.some(
      (e) => e.role_category === 'portaria' || e.role_category === 'cobertura'
    );

    const dayGaps: StaffingGapAlert[] = [];

    if (dayShiftStaff.length < minDayStaff || !hasDayPortaria) {
      const severity = dayShiftStaff.length === 0 || !hasDayPortaria ? 'critical' : 'warning';
      const detailReason =
        dayAbsences.length > 0
          ? ` (${dayAbsences.map((a) => `${a.employee_name.split(' ')[0]}: ${a.reason}`).join('; ')})`
          : '';
      const msg = !hasDayPortaria
        ? `Posto de Portaria Diurna (06h–18h) descoberto${detailReason}`
        : `Equipe Diurna reduzida: ${dayShiftStaff.length}/${minDayStaff} no posto 06h–18h${detailReason}`;

      dayGaps.push({
        date_iso: d.dateISO,
        period: 'diurno',
        period_label: 'Diurno (06h–18h)',
        severity,
        assigned_count: dayShiftStaff.length,
        required_count: minDayStaff,
        missing_portaria: !hasDayPortaria,
        message: msg,
        absent_employees: dayAbsences,
      });
    }

    if (nightShiftStaff.length < minNightStaff || !hasNightPortaria) {
      const severity = nightShiftStaff.length === 0 || !hasNightPortaria ? 'critical' : 'warning';
      const detailReason =
        nightAbsences.length > 0
          ? ` (${nightAbsences.map((a) => `${a.employee_name.split(' ')[0]}: ${a.reason}`).join('; ')})`
          : '';
      const msg = !hasNightPortaria
        ? `Posto de Portaria Noturna (18h–06h) descoberto${detailReason}`
        : `Equipe Noturna reduzida: ${nightShiftStaff.length}/${minNightStaff} no posto 18h–06h${detailReason}`;

      dayGaps.push({
        date_iso: d.dateISO,
        period: 'noturno',
        period_label: 'Noturno (18h–06h)',
        severity,
        assigned_count: nightShiftStaff.length,
        required_count: minNightStaff,
        missing_portaria: !hasNightPortaria,
        message: msg,
        absent_employees: nightAbsences,
      });
    }

    allGaps.push(...dayGaps);

    daysSummary.push({
      date_iso: d.dateISO,
      day_number: d.day,
      weekday_short: d.weekdayShort,
      is_weekend: d.isWeekend,
      day_shift_staff: dayShiftStaff,
      night_shift_staff: nightShiftStaff,
      commercial_staff: commercialStaff,
      day_ok: !dayGaps.some((g) => g.period === 'diurno'),
      night_ok: !dayGaps.some((g) => g.period === 'noturno'),
      gaps: dayGaps,
    });
  }

  return { daysSummary, allGaps };
}

/**
 * Sugere coberturas automáticas (CD / CN) utilizando o Folguista ou colaboradores de folga
 * do setor de Portaria/Ronda para cobrir desfalques detectados no mês.
 */
export function buildSuggestedGapCoverOverrides(params: {
  clientId: string;
  employees: Employee[];
  matrix: Map<string, ComputedCellShift>;
  gaps: StaffingGapAlert[];
}): ScheduleOverride[] {
  const { clientId, employees, matrix, gaps } = params;
  const suggestions: ScheduleOverride[] = [];
  const usedToday = new Set<string>();

  // Prioriza folguista/cobertura primeiro, depois portaria e ronda que estejam de FG ou C
  const prioritizedCandidates = [...employees].sort((a, b) => {
    const score = (e: Employee) =>
      e.role_category === 'cobertura'
        ? 0
        : e.role_category === 'portaria'
        ? 1
        : e.role_category === 'ronda'
        ? 2
        : 3;
    return score(a) - score(b);
  });

  for (const gap of gaps) {
    const needed = Math.max(1, gap.required_count - gap.assigned_count);
    let covered = 0;

    for (const candidate of prioritizedCandidates) {
      if (covered >= needed) break;
      if (candidate.role_category === 'limpeza') continue;
      const cellKey = `${candidate.id}::${gap.date_iso}`;
      if (usedToday.has(cellKey)) continue;

      const currentCell = matrix.get(cellKey);
      if (!currentCell) continue;

      // Só aloca quem está de Folga (FG) ou Folguista em turno flexível (C)
      const canCover =
        currentCell.shift_code === 'FG' ||
        (candidate.role_category === 'cobertura' && currentCell.shift_code === 'C');

      if (!canCover) continue;

      const targetShift: ShiftCode = gap.period === 'diurno' ? 'CD' : 'CN';
      suggestions.push({
        id: crypto.randomUUID(),
        client_id: clientId,
        employee_id: candidate.id,
        date_iso: gap.date_iso,
        shift_code: targetShift,
        reason: `Cobertura automática (${gap.period_label})`,
        updated_at: new Date().toISOString(),
      });
      usedToday.add(cellKey);
      covered++;
    }
  }

  return suggestions;
}

/**
 * Calcula status de validade de documentos e contratos (Vencido, Vencendo em até 30 dias, Vigente, Permanente).
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
    return { status: 'permanent', daysDiff: null, label: 'Permanente / Arquivado' };
  }

  const [ty, tm, td] = todayISO.split('-').map(Number);
  const [ey, em, ed] = expiryDateISO.slice(0, 10).split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const expUtc = Date.UTC(ey, em - 1, ed);
  const daysDiff = Math.round((expUtc - todayUtc) / 86_400_000);

  if (daysDiff < 0) {
    const abs = Math.abs(daysDiff);
    return {
      status: 'expired',
      daysDiff,
      label: abs === 1 ? 'Vencido há 1 dia' : `Vencido há ${abs} dias`,
    };
  }

  if (daysDiff === 0) {
    return { status: 'expired', daysDiff: 0, label: 'Vence hoje!' };
  }

  if (daysDiff <= warningDays) {
    return {
      status: 'expiring_soon',
      daysDiff,
      label: `Vence em ${daysDiff} dia${daysDiff > 1 ? 's' : ''}`,
    };
  }

  return {
    status: 'valid',
    daysDiff,
    label: `Válido (${daysDiff} dias)`,
  };
}

/**
 * Constrói a lista unificada de eventos do Calendário do Condomínio para um determinado ano
 * (permitindo filtrar tanto pelo mês visível quanto buscar no ano inteiro).
 */
export function buildUnifiedCalendarEvents(
  bundle: CondoHrBundle,
  targetYear: number,
  todayISO = getLocalTodayISO()
): UnifiedCalendarEvent[] {
  const events: UnifiedCalendarEvent[] = [];
  const hrEnabled = bundle.config.enabled;
  const empMap = new Map(bundle.employees.map((e) => [e.id, e]));

  // 1. Aniversários dos Colaboradores (projetados no ano consultado)
  if (hrEnabled) {
    for (const emp of bundle.employees) {
      const parts = emp.birth_date.split('-');
      if (parts.length === 3) {
        const birthYear = Number(parts[0]);
        const monthStr = parts[1];
        const dayStr = parts[2];
        // Trata 29/02 em anos não bissextos
        const isLeapDay = monthStr === '02' && dayStr === '29';
        const isLeapYear =
          (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
        const safeDay = isLeapDay && !isLeapYear ? '28' : dayStr;
        const dateInYear = `${targetYear}-${monthStr}-${safeDay}`;
        const age = targetYear - birthYear;

        events.push({
          id: `bday-${emp.id}-${targetYear}`,
          date_iso: dateInYear,
          category: 'birthday',
          title: `Aniversário: ${emp.full_name}`,
          subtitle: `${emp.role} • Completa ${age} anos (${emp.registration_code})`,
          badge_label: 'Aniversário Colaborador',
          urgency: 'celebration',
          search_blob: `aniversario aniversario colaborador funcionario ${emp.full_name} ${emp.role} ${emp.registration_code}`.toLowerCase(),
          source_id: emp.id,
        });
      }
    }

    // 2. Vencimento de Documentos dos Funcionários (Exames Periódicos, Brigada de Incêndio, NRs)
    for (const doc of bundle.employee_documents) {
      if (!doc.expiry_date) continue;
      if (!doc.expiry_date.startsWith(String(targetYear))) continue;
      const emp = empMap.get(doc.employee_id);
      const exp = getDocumentExpiryInfo(doc.expiry_date, todayISO, 30);

      events.push({
        id: `empdoc-${doc.id}`,
        date_iso: doc.expiry_date,
        category: 'employee_doc',
        title: `${doc.title} — ${emp?.full_name ?? 'Colaborador'}`,
        subtitle: `${emp?.role ?? ''} • Emissor: ${doc.issuer} • ${exp.label}`,
        badge_label: 'Doc. Funcionário',
        urgency:
          exp.status === 'expired'
            ? 'expired'
            : exp.status === 'expiring_soon'
            ? 'soon'
            : 'normal',
        search_blob: `documento exame certificado vencimento funcionario colaborador ${doc.title} ${doc.issuer} ${doc.certificate_number} ${emp?.full_name ?? ''} ${emp?.role ?? ''}`.toLowerCase(),
        source_id: doc.id,
      });
    }

    // 3. Início / Retorno de Férias dos Colaboradores
    for (const vac of bundle.vacations) {
      const emp = empMap.get(vac.employee_id);
      if (vac.start_date.startsWith(String(targetYear))) {
        events.push({
          id: `vac-start-${vac.id}`,
          date_iso: vac.start_date,
          category: 'vacation',
          title: `Início de Férias: ${emp?.full_name ?? 'Colaborador'}`,
          subtitle: `${vac.days} dias (${vac.start_date.split('-').reverse().join('/')} a ${vac.end_date.split('-').reverse().join('/')}) • ${emp?.role ?? ''}`,
          badge_label: 'Férias Colaborador',
          urgency: 'normal',
          search_blob: `ferias colaborador funcionario ${emp?.full_name ?? ''} ${emp?.role ?? ''} ${vac.notes ?? ''}`.toLowerCase(),
          source_id: vac.id,
        });
      }
    }
  }

  // 4. Reservas do Salão de Festas e Espaços Gourmet
  for (const booking of bundle.party_bookings) {
    if (booking.status === 'cancelada') continue;
    if (!booking.date_iso.startsWith(String(targetYear))) continue;

    events.push({
      id: `party-${booking.id}`,
      date_iso: booking.date_iso,
      category: 'party_room',
      title: `${booking.space_name}: ${booking.event_title}`,
      subtitle: `${booking.unit_label} (${booking.resident_name}) • ${booking.start_time} às ${booking.end_time} • ${booking.guest_count} convidados`,
      badge_label:
        booking.status === 'pendente_taxa' ? 'Reserva (Taxa Pendente)' : 'Reserva Salão de Festas',
      urgency: booking.status === 'pendente_taxa' ? 'soon' : 'normal',
      search_blob: `reserva salao de festas churrasqueira gourmet ${booking.space_name} ${booking.resident_name} ${booking.unit_label} ${booking.event_title}`.toLowerCase(),
      source_id: booking.id,
    });
  }

  // 5. Vencimento de Documentos do Condomínio & Contratos
  for (const cdoc of bundle.condo_documents) {
    if (!cdoc.expiry_date.startsWith(String(targetYear))) continue;
    const exp = getDocumentExpiryInfo(cdoc.expiry_date, todayISO, cdoc.alert_days_before || 30);
    const isContract = cdoc.category === 'contract';

    events.push({
      id: `condodoc-${cdoc.id}`,
      date_iso: cdoc.expiry_date,
      category: isContract ? 'contract' : 'condo_doc',
      title: cdoc.title,
      subtitle: `${isContract ? 'Fornecedor' : 'Órgão/Emissor'}: ${cdoc.provider_or_issuer} • Doc ${cdoc.document_number} • ${exp.label}`,
      badge_label: isContract ? 'Vencimento de Contrato' : 'Doc. do Condomínio',
      urgency:
        exp.status === 'expired'
          ? 'expired'
          : exp.status === 'expiring_soon'
          ? 'soon'
          : 'normal',
      search_blob: `${isContract ? 'contrato fornecedor renovacao' : 'documento condominio alvara laudo avcb seguro'} ${cdoc.title} ${cdoc.provider_or_issuer} ${cdoc.document_number} ${cdoc.notes ?? ''}`.toLowerCase(),
      source_id: cdoc.id,
    });
  }

  return events.sort((a, b) => a.date_iso.localeCompare(b.date_iso));
}
