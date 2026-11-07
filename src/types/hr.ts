export type EmployeeRoleCategory =
  | 'portaria'
  | 'ronda'
  | 'cobertura'
  | 'zeladoria'
  | 'limpeza';

export type EmployeeStatus = 'ativo' | 'ferias' | 'afastado' | 'desligado';

export type ScheduleRuleType = 'weekly_fixed' | 'sequence_cycle' | 'custom_days';

export interface WeeklyFixedRule {
  // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
  days: {
    [dayOfWeek: number]: { day: boolean; night: boolean };
  };
}

export interface SequenceCycleRule {
  workDays: number; // ex: 3 (na escala 3x1), 1 (no 12x36), 5 (no 5x2)
  offDays: number; // ex: 1 (na escala 3x1), 1 (no 12x36), 2 (no 5x2)
  shiftType: 'day' | 'night' | 'both';
  startDate: string; // YYYY-MM-DD em que a sequência se inicia
}

export interface CustomDaysRule {
  // YYYY-MM-DD -> { day: boolean; night: boolean }
  days: {
    [dateISO: string]: { day: boolean; night: boolean };
  };
}

export interface EmployeeScheduleConfig {
  employeeId?: string;
  ruleType: ScheduleRuleType;
  weeklyFixed?: WeeklyFixedRule;
  sequenceCycle?: SequenceCycleRule;
  customDays?: CustomDaysRule;
}

export type ShiftCode = 'D' | 'N' | 'C' | 'CD' | 'CN' | 'FG' | 'FE' | 'AT';

export interface ComputedCellShift {
  shift_code: ShiftCode;
  reason?: string;
  is_override?: boolean;
}

export interface DayShiftAssignment {
  day: boolean; // Ativo no turno do dia (06h às 18h)
  night: boolean; // Ativo no turno da noite (18h às 06h)
  isVacation?: boolean;
  isOverride?: boolean;
  notes?: string;
}

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
  enabled: boolean;
  cnpj: string;
  corporate_name: string;
  min_day_staff: number;
  min_night_staff: number;
  updated_at: string;
}

export interface Employee {
  id: string;
  client_id: string;
  registration_code: string;
  full_name: string;
  role: string;
  role_category: EmployeeRoleCategory;
  cpf_masked: string;
  cpf?: string;
  admission_date: string;
  dismissal_date?: string | null;
  birth_date: string;
  phone: string;
  schedule_rule: EmployeeScheduleConfig;
  work_hours_label: string;
  work_hours_description?: string;
  schedule_pattern?: string;
  base_salary: number;
  salary_base?: number;
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
  issue_date: string;
  expiry_date: string | null;
  certificate_number: string;
  notes?: string;
  file_size_kb?: number;
}

export interface EmployeeVacation {
  id: string;
  client_id: string;
  employee_id: string;
  acquisitive_start: string;
  acquisitive_end: string;
  concessive_limit: string;
  start_date: string;
  end_date: string;
  days: number;
  status: VacationStatus;
  cover_employee_id?: string | null;
  notes?: string;
}

export interface ScheduleOverrideCell {
  employee_id: string;
  date_iso: string;
  day: boolean;
  night: boolean;
  reason?: string;
}

export type ScheduleOverride = ScheduleOverrideCell;

export interface DayCoverageSummary {
  date_iso: string;
  day_shift_staff: Employee[];
  night_shift_staff: Employee[];
  day_ok: boolean;
  night_ok: boolean;
  gaps: { shift: 'day' | 'night'; deficit: number }[];
}

export interface ScheduleValidationRecord {
  client_id: string;
  year_month: string;
  status: 'draft' | 'validated' | 'modified_after_validation' | 'validada';
  validated_at: string | null;
  validated_by: string | null;
  validation_code: string | null;
  last_exported_at: string | null;
  export_count: number;
  notes?: string;
}

export interface PartyRoomBooking {
  id: string;
  client_id: string;
  space_name: string;
  resident_name: string;
  unit_label: string;
  event_title: string;
  date_iso: string;
  start_time: string;
  end_time: string;
  status: PartyBookingStatus;
  guest_count: number;
  fee_amount: number;
  notes?: string;
}

export interface CondoDocument {
  id: string;
  client_id: string;
  category: CondoDocCategory;
  title: string;
  provider_or_issuer: string;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  alert_days_before: number;
  annual_or_monthly_value?: number | null;
  notes?: string;
}

// =============================================================================
// Sistema de Arquivos / Ficheiro Digital (Windows Explorer / WinRAR Style)
// =============================================================================

export type ExplorerItemType = 'folder' | 'file';

export interface ExplorerItem {
  id: string;
  client_id: string;
  parent_id: string | null; // null = raiz
  name: string;
  type: ExplorerItemType;
  extension?: string; // pdf, docx, xlsx, png, zip
  size_bytes?: number;
  updated_at: string;
  employee_id?: string | null; // vinculado a funcionário específico
  category?: 'employee' | 'condo' | 'contract' | 'general';
  content_description?: string;
  expiry_date?: string | null;
}

export interface CondoHrBundle {
  config: CondoHrConfig;
  employees: Employee[];
  employee_documents: EmployeeDocument[];
  vacations: EmployeeVacation[];
  schedule_overrides_v2: ScheduleOverrideCell[];
  schedule_validations: ScheduleValidationRecord[];
  party_bookings: PartyRoomBooking[];
  condo_documents: CondoDocument[];
  file_explorer_items: ExplorerItem[];
}

export interface DayDoubleCoverage {
  date_iso: string;
  day_number: number;
  weekday_index: number;
  weekday_short: string;
  is_sunday: boolean;
  is_weekend: boolean;
  day_active_count: number;
  night_active_count: number;
  total_active_count: number;
  day_under_staffed: boolean;
  night_under_staffed: boolean;
  total_under_staffed: boolean;
}

export interface UnifiedCalendarEvent {
  id: string;
  date_iso: string;
  category: CalendarEventCategory;
  title: string;
  subtitle: string;
  badge_label: string;
  urgency: 'expired' | 'soon' | 'normal' | 'celebration';
  search_blob: string;
  source_id: string;
  meta?: Record<string, string | number | undefined>;
}
