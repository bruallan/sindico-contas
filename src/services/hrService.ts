import { buildInitialCondoHrBundle } from '@/services/hrSeed';
import {
  CondoDocument,
  CondoHrBundle,
  CondoHrConfig,
  Employee,
  EmployeeDocument,
  EmployeeVacation,
  PartyRoomBooking,
  ScheduleOverride,
  ScheduleValidationRecord,
  ShiftCode,
} from '@/types/hr';
import { getLocalTodayISO } from '@/utils/formatters';

const HR_STORAGE_PREFIX = 'sindico_contas_hr_v1_';

function getStorageKey(clientId: string): string {
  return `${HR_STORAGE_PREFIX}${clientId}`;
}

function syncEmployeeStatusesWithVacations(bundle: CondoHrBundle): CondoHrBundle {
  const today = getLocalTodayISO();
  const updatedVacations: EmployeeVacation[] = bundle.vacations.map((v) => {
    if (today > v.end_date) {
      return { ...v, status: 'concluida' };
    }
    if (today >= v.start_date && today <= v.end_date) {
      return { ...v, status: 'em_andamento' };
    }
    return { ...v, status: 'programada' };
  });

  const activeVacEmpIds = new Set(
    updatedVacations.filter((v) => v.status === 'em_andamento').map((v) => v.employee_id)
  );

  const updatedEmployees: Employee[] = bundle.employees.map((emp) => {
    if (emp.status === 'afastado') return emp;
    if (activeVacEmpIds.has(emp.id)) {
      return { ...emp, status: 'ferias' };
    }
    return { ...emp, status: 'ativo' };
  });

  return {
    ...bundle,
    employees: updatedEmployees,
    vacations: updatedVacations,
  };
}

export function loadCondoHrBundle(clientId: string, condoName?: string): CondoHrBundle {
  try {
    const raw = localStorage.getItem(getStorageKey(clientId));
    if (raw) {
      const parsed = JSON.parse(raw) as CondoHrBundle;
      if (parsed && parsed.config && Array.isArray(parsed.employees)) {
        return syncEmployeeStatusesWithVacations(parsed);
      }
    }
  } catch {
    // Recria pacote fictício caso armazenamento esteja corrompido
  }

  const seeded = syncEmployeeStatusesWithVacations(
    buildInitialCondoHrBundle(clientId, condoName || 'Condomínio Residencial')
  );
  saveCondoHrBundle(clientId, seeded);
  return seeded;
}

export function saveCondoHrBundle(clientId: string, bundle: CondoHrBundle): CondoHrBundle {
  const normalized = syncEmployeeStatusesWithVacations(bundle);
  localStorage.setItem(getStorageKey(clientId), JSON.stringify(normalized));
  return normalized;
}

export function resetCondoHrBundleToDemo(clientId: string, condoName?: string): CondoHrBundle {
  const seeded = buildInitialCondoHrBundle(clientId, condoName || 'Condomínio Residencial');
  return saveCondoHrBundle(clientId, seeded);
}

/**
 * Invalida (marca como 'modified_after_validation') a validação de um mês caso a escala daquele mês seja alterada.
 */
function markScheduleDirtyForMonth(
  validations: ScheduleValidationRecord[],
  clientId: string,
  yearMonth: string
): ScheduleValidationRecord[] {
  const existing = validations.find((v) => v.year_month === yearMonth);
  if (!existing) {
    return [
      ...validations,
      {
        client_id: clientId,
        year_month: yearMonth,
        status: 'draft',
        validated_at: null,
        validated_by: null,
        validation_code: null,
        last_exported_at: null,
        export_count: 0,
      },
    ];
  }
  if (existing.status === 'validated') {
    return validations.map((v) =>
      v.year_month === yearMonth
        ? { ...v, status: 'modified_after_validation' as const }
        : v
    );
  }
  return validations;
}

export function updateCondoHrConfig(
  clientId: string,
  condoName: string | undefined,
  patch: Partial<Omit<CondoHrConfig, 'client_id'>>
): CondoHrBundle {
  const current = loadCondoHrBundle(clientId, condoName);
  const next: CondoHrBundle = {
    ...current,
    config: {
      ...current.config,
      ...patch,
      client_id: clientId,
      updated_at: new Date().toISOString(),
    },
  };
  return saveCondoHrBundle(clientId, next);
}

export function upsertEmployee(
  clientId: string,
  employeeInput: Omit<Employee, 'id' | 'client_id'> & { id?: string }
): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const isEdit = Boolean(employeeInput.id);
  const empId = employeeInput.id || `${clientId}-emp-${crypto.randomUUID().slice(0, 8)}`;

  const nextEmp: Employee = {
    ...employeeInput,
    id: empId,
    client_id: clientId,
  };

  const employees = isEdit
    ? current.employees.map((e) => (e.id === empId ? nextEmp : e))
    : [...current.employees, nextEmp];

  // Se for novo colaborador, cria automaticamente o registro do ASO Admissional
  const nextDocs = [...current.employee_documents];
  if (!isEdit) {
    nextDocs.push({
      id: `${empId}-doc-adm`,
      client_id: clientId,
      employee_id: empId,
      doc_type: 'aso_admissional',
      title: 'ASO — Exame Médico Admissional',
      issuer: 'Clínica Ocupacional Credenciada',
      issue_date: nextEmp.admission_date,
      expiry_date: null,
      certificate_number: `ASO-${nextEmp.registration_code}`,
    });
  }

  return saveCondoHrBundle(clientId, {
    ...current,
    employees,
    employee_documents: nextDocs,
  });
}

export function removeEmployee(clientId: string, employeeId: string): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  return saveCondoHrBundle(clientId, {
    ...current,
    employees: current.employees.filter((e) => e.id !== employeeId),
    employee_documents: current.employee_documents.filter((d) => d.employee_id !== employeeId),
    vacations: current.vacations.filter((v) => v.employee_id !== employeeId),
    schedule_overrides: current.schedule_overrides.filter((o) => o.employee_id !== employeeId),
  });
}

export function upsertEmployeeDocument(
  clientId: string,
  docInput: Omit<EmployeeDocument, 'id' | 'client_id'> & { id?: string }
): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const isEdit = Boolean(docInput.id);
  const docId = docInput.id || `${clientId}-edoc-${crypto.randomUUID().slice(0, 8)}`;

  const record: EmployeeDocument = {
    ...docInput,
    id: docId,
    client_id: clientId,
  };

  const employee_documents = isEdit
    ? current.employee_documents.map((d) => (d.id === docId ? record : d))
    : [...current.employee_documents, record];

  return saveCondoHrBundle(clientId, {
    ...current,
    employee_documents,
  });
}

export function removeEmployeeDocument(clientId: string, docId: string): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  return saveCondoHrBundle(clientId, {
    ...current,
    employee_documents: current.employee_documents.filter((d) => d.id !== docId),
  });
}

export function upsertEmployeeVacation(
  clientId: string,
  vacInput: Omit<EmployeeVacation, 'id' | 'client_id'> & { id?: string }
): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const isEdit = Boolean(vacInput.id);
  const vacId = vacInput.id || `${clientId}-vac-${crypto.randomUUID().slice(0, 8)}`;

  const record: EmployeeVacation = {
    ...vacInput,
    id: vacId,
    client_id: clientId,
  };

  const vacations = isEdit
    ? current.vacations.map((v) => (v.id === vacId ? record : v))
    : [...current.vacations, record];

  const startYM = record.start_date.slice(0, 7);
  const endYM = record.end_date.slice(0, 7);
  let nextValidations = markScheduleDirtyForMonth(current.schedule_validations, clientId, startYM);
  if (endYM !== startYM) {
    nextValidations = markScheduleDirtyForMonth(nextValidations, clientId, endYM);
  }

  return saveCondoHrBundle(clientId, {
    ...current,
    vacations,
    schedule_validations: nextValidations,
  });
}

export function removeEmployeeVacation(clientId: string, vacId: string): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const target = current.vacations.find((v) => v.id === vacId);
  let nextValidations = current.schedule_validations;
  if (target) {
    nextValidations = markScheduleDirtyForMonth(
      nextValidations,
      clientId,
      target.start_date.slice(0, 7)
    );
  }
  return saveCondoHrBundle(clientId, {
    ...current,
    vacations: current.vacations.filter((v) => v.id !== vacId),
    schedule_validations: nextValidations,
  });
}

export function setScheduleCellOverride(params: {
  clientId: string;
  employeeId: string;
  dateISO: string;
  shiftCode: ShiftCode | null; // null remove override e restaura automático
  reason?: string;
}): CondoHrBundle {
  const { clientId, employeeId, dateISO, shiftCode, reason } = params;
  const current = loadCondoHrBundle(clientId);
  const filtered = current.schedule_overrides.filter(
    (o) => !(o.employee_id === employeeId && o.date_iso === dateISO)
  );

  const nextOverrides =
    shiftCode === null
      ? filtered
      : [
          ...filtered,
          {
            id: `${clientId}-ov-${employeeId.slice(-6)}-${dateISO}`,
            client_id: clientId,
            employee_id: employeeId,
            date_iso: dateISO,
            shift_code: shiftCode,
            reason: reason?.trim() || undefined,
            updated_at: new Date().toISOString(),
          },
        ];

  const ym = dateISO.slice(0, 7);
  const nextValidations = markScheduleDirtyForMonth(current.schedule_validations, clientId, ym);

  return saveCondoHrBundle(clientId, {
    ...current,
    schedule_overrides: nextOverrides,
    schedule_validations: nextValidations,
  });
}

export function applyBatchScheduleOverrides(
  clientId: string,
  yearMonth: string,
  newOverrides: ScheduleOverride[]
): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const incomingKeys = new Set(newOverrides.map((o) => `${o.employee_id}::${o.date_iso}`));
  const kept = current.schedule_overrides.filter(
    (o) => !incomingKeys.has(`${o.employee_id}::${o.date_iso}`)
  );

  const nextValidations = markScheduleDirtyForMonth(
    current.schedule_validations,
    clientId,
    yearMonth
  );

  return saveCondoHrBundle(clientId, {
    ...current,
    schedule_overrides: [...kept, ...newOverrides],
    schedule_validations: nextValidations,
  });
}

export function clearMonthScheduleOverrides(clientId: string, yearMonth: string): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const nextValidations = markScheduleDirtyForMonth(
    current.schedule_validations,
    clientId,
    yearMonth
  );
  return saveCondoHrBundle(clientId, {
    ...current,
    schedule_overrides: current.schedule_overrides.filter(
      (o) => !o.date_iso.startsWith(yearMonth)
    ),
    schedule_validations: nextValidations,
  });
}

export function validateMonthlySchedule(params: {
  clientId: string;
  yearMonth: string;
  validatedBy: string;
  notes?: string;
}): { bundle: CondoHrBundle; record: ScheduleValidationRecord } {
  const { clientId, yearMonth, validatedBy, notes } = params;
  const current = loadCondoHrBundle(clientId);
  const existing = current.schedule_validations.find((v) => v.year_month === yearMonth);

  const nowIso = new Date().toISOString();
  const shortHash = Math.random().toString(36).substring(2, 6).toUpperCase();
  const ymClean = yearMonth.replace('-', '');

  const record: ScheduleValidationRecord = {
    client_id: clientId,
    year_month: yearMonth,
    status: 'validated',
    validated_at: nowIso,
    validated_by: validatedBy.trim() || 'Administração Condominial',
    validation_code: `ESC-${ymClean}-${shortHash}`,
    last_exported_at: existing?.last_exported_at ?? null,
    export_count: existing?.export_count ?? 0,
    notes: notes?.trim() || undefined,
  };

  const others = current.schedule_validations.filter((v) => v.year_month !== yearMonth);
  const bundle = saveCondoHrBundle(clientId, {
    ...current,
    schedule_validations: [...others, record],
  });

  return { bundle, record };
}

export function recordMonthlyScheduleExport(params: {
  clientId: string;
  yearMonth: string;
  validatedBy: string;
}): { bundle: CondoHrBundle; record: ScheduleValidationRecord } {
  const { clientId, yearMonth, validatedBy } = params;
  const current = loadCondoHrBundle(clientId);
  const existing = current.schedule_validations.find((v) => v.year_month === yearMonth);
  const nowIso = new Date().toISOString();
  const ymClean = yearMonth.replace('-', '');
  const shortHash = Math.random().toString(36).substring(2, 6).toUpperCase();

  // Garante que toda exportação oficial possua Data de Validação + Data de Exportação válidas!
  const isAlreadyValid = existing?.status === 'validated' && Boolean(existing.validated_at);

  const record: ScheduleValidationRecord = {
    client_id: clientId,
    year_month: yearMonth,
    status: 'validated',
    validated_at: isAlreadyValid ? existing!.validated_at : nowIso,
    validated_by: isAlreadyValid
      ? existing!.validated_by
      : validatedBy.trim() || 'Administração Condominial',
    validation_code:
      isAlreadyValid && existing!.validation_code
        ? existing!.validation_code
        : `ESC-${ymClean}-${shortHash}`,
    last_exported_at: nowIso,
    export_count: (existing?.export_count ?? 0) + 1,
    notes: existing?.notes,
  };

  const others = current.schedule_validations.filter((v) => v.year_month !== yearMonth);
  const bundle = saveCondoHrBundle(clientId, {
    ...current,
    schedule_validations: [...others, record],
  });

  return { bundle, record };
}

export function upsertPartyBooking(
  clientId: string,
  bookingInput: Omit<PartyRoomBooking, 'id' | 'client_id'> & { id?: string }
): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const isEdit = Boolean(bookingInput.id);
  const id = bookingInput.id || `${clientId}-party-${crypto.randomUUID().slice(0, 8)}`;

  const record: PartyRoomBooking = {
    ...bookingInput,
    id,
    client_id: clientId,
  };

  const party_bookings = isEdit
    ? current.party_bookings.map((b) => (b.id === id ? record : b))
    : [...current.party_bookings, record];

  return saveCondoHrBundle(clientId, {
    ...current,
    party_bookings,
  });
}

export function removePartyBooking(clientId: string, bookingId: string): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  return saveCondoHrBundle(clientId, {
    ...current,
    party_bookings: current.party_bookings.filter((b) => b.id !== bookingId),
  });
}

export function upsertCondoDocument(
  clientId: string,
  docInput: Omit<CondoDocument, 'id' | 'client_id'> & { id?: string }
): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const isEdit = Boolean(docInput.id);
  const id = docInput.id || `${clientId}-cdoc-${crypto.randomUUID().slice(0, 8)}`;

  const record: CondoDocument = {
    ...docInput,
    id,
    client_id: clientId,
  };

  const condo_documents = isEdit
    ? current.condo_documents.map((d) => (d.id === id ? record : d))
    : [...current.condo_documents, record];

  return saveCondoHrBundle(clientId, {
    ...current,
    condo_documents,
  });
}

export function removeCondoDocument(clientId: string, docId: string): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  return saveCondoHrBundle(clientId, {
    ...current,
    condo_documents: current.condo_documents.filter((d) => d.id !== docId),
  });
}
