export type EmployeeRoleCategory =
  | 'portaria'
  | 'ronda'
  | 'cobertura'
  | 'zeladoria'
  | 'limpeza';

export type SchedulePattern =
  | '12x36_day_even'
  | '12x36_day_odd'
  | '12x36_night_even'
  | '12x36_night_odd'
  | 'commercial_mon_sat'
  | 'relief_flex';

/**
 * Códigos de turno na escala mensal:
 * D  = Plantão Diurno 12x36 (06h às 18h)
 * N  = Plantão Noturno 12x36 (18h às 06h)
 * C  = Horário Comercial (08h às 17h / Sáb 08h às 12h)
 * CD = Cobertura / Hora Extra Diurna (06h às 18h)
 * CN = Cobertura / Hora Extra Noturna (18h às 06h)
 * FG = Folga de Escala
 * FE = Férias Regulamentares
 * AT = Atestado / Falta Justificada
 */
export type ShiftCode = 'D' | 'N' | 'C' | 'CD' | 'CN' | 'FG' | 'FE' | 'AT';

export type EmployeeStatus = 'ativo' | 'ferias' | 'afastado';

export type EmployeeDocumentType =
  | 'aso_admissional'
  | 'aso_periodico'
  | 'brigada_incendio'
  | 'nr10'
  | 'nr35'
  | 'portaria_cftv'
  | 'epi_nr06'
  | 'outro';

export type VacationStatus = 'programada' | 'em_andamento' | 'concluida';

export type PartyBookingStatus = 'confirmada' | 'pendente_taxa' | 'cancelada';

export type CondoDocCategory = 'condo_doc' | 'contract';

export type CalendarEventCategory =
  | 'birthday'
  | 'party_room'
  | 'employee_doc'
  | 'condo_doc'
  | 'contract'
  | 'vacation';

export type ExpiryStatus = 'expired' | 'expiring_soon' | 'valid' | 'permanent';

export interface CondoHrConfig {
  client_id: string;
  enabled: boolean; // true = contratados direto pelo CNPJ do condomínio
  cnpj: string;
  corporate_name: string;
  min_day_staff: number; // equipe mínima 06h–18h para operação 24/7
  min_night_staff: number; // equipe mínima 18h–06h para operação 24/7
  updated_at: string;
}

export interface Employee {
  id: string;
  client_id: string;
  registration_code: string; // ex: CLT-001
  full_name: string;
  role: string;
  role_category: EmployeeRoleCategory;
  cpf_masked: string;
  admission_date: string; // YYYY-MM-DD
  birth_date: string; // YYYY-MM-DD
  phone: string;
  schedule_pattern: SchedulePattern;
  work_hours_label: string;
  base_salary: number;
  status: EmployeeStatus;
  emergency_contact: string;
}

export interface EmployeeDocument {
  id: string;
  client_id: string;
  employee_id: string;
  doc_type: EmployeeDocumentType;
  title: string;
  issuer: string;
  issue_date: string; // YYYY-MM-DD
  expiry_date: string | null; // null = permanente (ex: Exame Admissional arquivado)
  certificate_number: string;
  notes?: string;
}

export interface EmployeeVacation {
  id: string;
  client_id: string;
  employee_id: string;
  acquisitive_start: string; // YYYY-MM-DD
  acquisitive_end: string; // YYYY-MM-DD
  concessive_limit: string; // YYYY-MM-DD
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  days: number;
  status: VacationStatus;
  cover_employee_id?: string | null;
  notes?: string;
}

export interface ScheduleOverride {
  id: string;
  client_id: string;
  employee_id: string;
  date_iso: string; // YYYY-MM-DD
  shift_code: ShiftCode;
  reason?: string;
  updated_at: string;
}

export interface ScheduleValidationRecord {
  client_id: string;
  year_month: string; // YYYY-MM
  status: 'draft' | 'validated' | 'modified_after_validation';
  validated_at: string | null; // ISO timestamp
  validated_by: string | null;
  validation_code: string | null;
  last_exported_at: string | null; // ISO timestamp
  export_count: number;
  notes?: string;
}

export interface PartyRoomBooking {
  id: string;
  client_id: string;
  space_name: string;
  resident_name: string;
  unit_label: string; // ex: Bloco A - Apto 402
  event_title: string;
  date_iso: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  status: PartyBookingStatus;
  guest_count: number;
  fee_amount: number;
  notes?: string;
}

export interface CondoDocument {
  id: string;
  client_id: string;
  category: CondoDocCategory; // 'condo_doc' | 'contract'
  title: string;
  provider_or_issuer: string;
  document_number: string;
  issue_date: string; // YYYY-MM-DD
  expiry_date: string; // YYYY-MM-DD
  alert_days_before: number;
  annual_or_monthly_value?: number | null;
  notes?: string;
}

export interface CondoHrBundle {
  config: CondoHrConfig;
  employees: Employee[];
  employee_documents: EmployeeDocument[];
  vacations: EmployeeVacation[];
  schedule_overrides: ScheduleOverride[];
  schedule_validations: ScheduleValidationRecord[];
  party_bookings: PartyRoomBooking[];
  condo_documents: CondoDocument[];
}

export interface ComputedCellShift {
  employee_id: string;
  date_iso: string;
  shift_code: ShiftCode;
  auto_shift_code: ShiftCode;
  is_manual_override: boolean;
  override_reason?: string;
  is_on_vacation: boolean;
}

export interface StaffingGapAlert {
  date_iso: string;
  period: 'diurno' | 'noturno';
  period_label: string;
  severity: 'critical' | 'warning';
  assigned_count: number;
  required_count: number;
  missing_portaria: boolean;
  message: string;
  absent_employees: { employee_name: string; role: string; reason: string }[];
}

export interface DayCoverageSummary {
  date_iso: string;
  day_number: number;
  weekday_short: string;
  is_weekend: boolean;
  day_shift_staff: Employee[];
  night_shift_staff: Employee[];
  commercial_staff: Employee[];
  day_ok: boolean;
  night_ok: boolean;
  gaps: StaffingGapAlert[];
}

export interface UnifiedCalendarEvent {
  id: string;
  date_iso: string; // YYYY-MM-DD (no ano consultado para aniversários)
  category: CalendarEventCategory;
  title: string;
  subtitle: string;
  badge_label: string;
  urgency: 'expired' | 'soon' | 'normal' | 'celebration';
  search_blob: string;
  source_id: string;
  meta?: Record<string, string | number | undefined>;
}
