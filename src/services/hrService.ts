import { buildInitialCondoHrBundle } from '@/services/hrSeed';
import {
  CondoDocument,
  CondoHrBundle,
  CondoHrConfig,
  Employee,
  EmployeeDocument,
  EmployeeScheduleConfig,
  EmployeeVacation,
  ExplorerItem,
  PartyRoomBooking,
  ScheduleOverrideCell,
  ScheduleValidationRecord,
} from '@/types/hr';
import { getLocalTodayISO } from '@/utils/formatters';

const HR_STORAGE_PREFIX = 'sindico_contas_hr_v2_';

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
    if (emp.status === 'desligado' || emp.status === 'afastado') return emp;
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
      if (
        parsed &&
        parsed.config &&
        Array.isArray(parsed.employees) &&
        Array.isArray(parsed.file_explorer_items)
      ) {
        return syncEmployeeStatusesWithVacations(parsed);
      }
    }
  } catch {
    // Recria pacote caso inexistente ou desatualizado
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

  // Garante que exista pasta no Explorer para este colaborador
  const nextExplorerItems = [...current.file_explorer_items];
  const existingFolder = nextExplorerItems.find(
    (item) => item.employee_id === empId && item.type === 'folder'
  );

  if (!existingFolder) {
    nextExplorerItems.push({
      id: `folder-emp-${empId}`,
      client_id: clientId,
      parent_id: 'root-funcionarios',
      name: `${nextEmp.full_name} (${nextEmp.registration_code})`,
      type: 'folder',
      updated_at: nextEmp.admission_date,
      employee_id: empId,
      category: 'employee',
    });
  }

  return saveCondoHrBundle(clientId, {
    ...current,
    employees,
    file_explorer_items: nextExplorerItems,
  });
}

export function updateEmployeeScheduleRule(
  clientId: string,
  employeeId: string,
  rule: EmployeeScheduleConfig,
  yearMonth = getLocalTodayISO().slice(0, 7)
): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const employees = current.employees.map((e) =>
    e.id === employeeId ? { ...e, schedule_rule: rule } : e
  );

  const nextValidations = markScheduleDirtyForMonth(
    current.schedule_validations,
    clientId,
    yearMonth
  );

  return saveCondoHrBundle(clientId, {
    ...current,
    employees,
    schedule_validations: nextValidations,
  });
}

export function setDoubleCellAssignment(params: {
  clientId: string;
  employeeId: string;
  dateISO: string;
  day: boolean;
  night: boolean;
  reason?: string;
}): CondoHrBundle {
  const { clientId, employeeId, dateISO, day, night, reason } = params;
  const current = loadCondoHrBundle(clientId);

  const filtered = current.schedule_overrides_v2.filter(
    (o) => !(o.employee_id === employeeId && o.date_iso === dateISO)
  );

  const nextOverrides: ScheduleOverrideCell[] = [
    ...filtered,
    {
      employee_id: employeeId,
      date_iso: dateISO,
      day,
      night,
      reason: reason?.trim() || undefined,
    },
  ];

  const ym = dateISO.slice(0, 7);
  const nextValidations = markScheduleDirtyForMonth(
    current.schedule_validations,
    clientId,
    ym
  );

  return saveCondoHrBundle(clientId, {
    ...current,
    schedule_overrides_v2: nextOverrides,
    schedule_validations: nextValidations,
  });
}

export function resetDoubleCellAssignment(params: {
  clientId: string;
  employeeId: string;
  dateISO: string;
}): CondoHrBundle {
  const { clientId, employeeId, dateISO } = params;
  const current = loadCondoHrBundle(clientId);

  const filtered = current.schedule_overrides_v2.filter(
    (o) => !(o.employee_id === employeeId && o.date_iso === dateISO)
  );

  const ym = dateISO.slice(0, 7);
  const nextValidations = markScheduleDirtyForMonth(
    current.schedule_validations,
    clientId,
    ym
  );

  return saveCondoHrBundle(clientId, {
    ...current,
    schedule_overrides_v2: filtered,
    schedule_validations: nextValidations,
  });
}

export function clearMonthOverridesV2(clientId: string, yearMonth: string): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const filtered = current.schedule_overrides_v2.filter(
    (o) => !o.date_iso.startsWith(yearMonth)
  );
  const nextValidations = markScheduleDirtyForMonth(
    current.schedule_validations,
    clientId,
    yearMonth
  );

  return saveCondoHrBundle(clientId, {
    ...current,
    schedule_overrides_v2: filtered,
    schedule_validations: nextValidations,
  });
}

export function deleteEmployee(clientId: string, employeeId: string): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  return saveCondoHrBundle(clientId, {
    ...current,
    employees: current.employees.filter((e) => e.id !== employeeId),
    employee_documents: current.employee_documents.filter((d) => d.employee_id !== employeeId),
    vacations: current.vacations.filter((v) => v.employee_id !== employeeId),
    schedule_overrides_v2: current.schedule_overrides_v2.filter((o) => o.employee_id !== employeeId),
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

  // Adiciona também espelho do arquivo no Explorer
  const emp = current.employees.find((e) => e.id === record.employee_id);
  const parentFolder = current.file_explorer_items.find(
    (it) => it.employee_id === record.employee_id && it.type === 'folder'
  );
  const parentId = parentFolder ? parentFolder.id : 'root-funcionarios';

  const nextExplorer = [...current.file_explorer_items];
  const fileExtId = `file-doc-${docId}`;
  const existingFile = nextExplorer.find((f) => f.id === fileExtId);
  const fileName = `${record.title.replace(/[\/\\]/g, '_')}.pdf`;

  if (existingFile) {
    nextExplorer.map((f) =>
      f.id === fileExtId ? { ...f, name: fileName, expiry_date: record.expiry_date } : f
    );
  } else {
    nextExplorer.push({
      id: fileExtId,
      client_id: clientId,
      parent_id: parentId,
      name: fileName,
      type: 'file',
      extension: 'pdf',
      size_bytes: (record.file_size_kb || 250) * 1024,
      updated_at: record.issue_date,
      employee_id: record.employee_id,
      category: 'employee',
      content_description: `${record.title} • ${record.issuer} • ${emp?.full_name ?? ''}`,
      expiry_date: record.expiry_date,
    });
  }

  return saveCondoHrBundle(clientId, {
    ...current,
    employee_documents,
    file_explorer_items: nextExplorer,
  });
}

export function deleteEmployeeDocument(clientId: string, docId: string): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  return saveCondoHrBundle(clientId, {
    ...current,
    employee_documents: current.employee_documents.filter((d) => d.id !== docId),
    file_explorer_items: current.file_explorer_items.filter(
      (f) => f.id !== `file-doc-${docId}`
    ),
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

  const ym = record.start_date.slice(0, 7);
  const nextValidations = markScheduleDirtyForMonth(
    current.schedule_validations,
    clientId,
    ym
  );

  return saveCondoHrBundle(clientId, {
    ...current,
    vacations,
    schedule_validations: nextValidations,
  });
}

export function deleteEmployeeVacation(clientId: string, vacId: string): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  return saveCondoHrBundle(clientId, {
    ...current,
    vacations: current.vacations.filter((v) => v.id !== vacId),
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
  const ymClean = yearMonth.replace('-', '');
  const shortHash = Math.random().toString(36).substring(2, 6).toUpperCase();

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

export function deletePartyBooking(clientId: string, bookingId: string): CondoHrBundle {
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

export function deleteCondoDocument(clientId: string, docId: string): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  return saveCondoHrBundle(clientId, {
    ...current,
    condo_documents: current.condo_documents.filter((d) => d.id !== docId),
  });
}

// =============================================================================
// Operações no Sistema de Arquivos / Ficheiro (Explorer / WinRAR Style)
// =============================================================================

export function createExplorerFolder(
  clientId: string,
  parentId: string | null,
  folderName: string,
  employeeId?: string | null
): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const newFolder: ExplorerItem = {
    id: `folder-${crypto.randomUUID().slice(0, 8)}`,
    client_id: clientId,
    parent_id: parentId,
    name: folderName.trim() || 'Nova Pasta',
    type: 'folder',
    updated_at: new Date().toISOString(),
    employee_id: employeeId || null,
  };

  return saveCondoHrBundle(clientId, {
    ...current,
    file_explorer_items: [...current.file_explorer_items, newFolder],
  });
}

export function createExplorerFile(
  clientId: string,
  parentId: string | null,
  fileInput: {
    name: string;
    extension?: string;
    size_bytes?: number;
    content_description?: string;
    expiry_date?: string | null;
    employee_id?: string | null;
  }
): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const newFile: ExplorerItem = {
    id: `file-${crypto.randomUUID().slice(0, 8)}`,
    client_id: clientId,
    parent_id: parentId,
    name: fileInput.name.trim(),
    type: 'file',
    extension: fileInput.extension || 'pdf',
    size_bytes: fileInput.size_bytes || 240000,
    updated_at: new Date().toISOString(),
    content_description: fileInput.content_description,
    expiry_date: fileInput.expiry_date,
    employee_id: fileInput.employee_id || null,
  };

  return saveCondoHrBundle(clientId, {
    ...current,
    file_explorer_items: [...current.file_explorer_items, newFile],
  });
}

export function renameExplorerItem(
  clientId: string,
  itemId: string,
  newName: string
): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const updated = current.file_explorer_items.map((it) =>
    it.id === itemId
      ? { ...it, name: newName.trim(), updated_at: new Date().toISOString() }
      : it
  );

  return saveCondoHrBundle(clientId, {
    ...current,
    file_explorer_items: updated,
  });
}

export function deleteExplorerItem(clientId: string, itemId: string): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);

  // Recursivamente localiza todos os filhos se for pasta
  const idsToDelete = new Set<string>([itemId]);
  let added = true;
  while (added) {
    added = false;
    for (const item of current.file_explorer_items) {
      if (item.parent_id && idsToDelete.has(item.parent_id) && !idsToDelete.has(item.id)) {
        idsToDelete.add(item.id);
        added = true;
      }
    }
  }

  const remaining = current.file_explorer_items.filter((it) => !idsToDelete.has(it.id));
  return saveCondoHrBundle(clientId, {
    ...current,
    file_explorer_items: remaining,
  });
}

export function copyExplorerItem(
  clientId: string,
  itemId: string,
  targetParentId: string | null
): CondoHrBundle {
  const current = loadCondoHrBundle(clientId);
  const target = current.file_explorer_items.find((it) => it.id === itemId);
  if (!target) return current;

  const copied: ExplorerItem = {
    ...target,
    id: `${target.type}-${crypto.randomUUID().slice(0, 8)}`,
    parent_id: targetParentId,
    name: target.name.includes('.')
      ? target.name.replace(/\.([^.]+)$/, '_copia.$1')
      : `${target.name} (Cópia)`,
    updated_at: new Date().toISOString(),
  };

  return saveCondoHrBundle(clientId, {
    ...current,
    file_explorer_items: [...current.file_explorer_items, copied],
  });
}

// Aliases de compatibilidade
export const removeEmployee = deleteEmployee;
export const removeEmployeeDocument = deleteEmployeeDocument;
export const removeEmployeeVacation = deleteEmployeeVacation;
export const removePartyBooking = deletePartyBooking;
export const removeCondoDocument = deleteCondoDocument;
export const clearMonthScheduleOverrides = clearMonthOverridesV2;

export function applyBatchScheduleOverrides(
  clientId: string,
  yearMonth: string,
  _overrides: ScheduleOverrideCell[]
): CondoHrBundle {
  return clearMonthOverridesV2(clientId, yearMonth);
}

export function setScheduleCellOverride(params: {
  clientId: string;
  employeeId: string;
  dateISO: string;
  shiftCode: string | null;
  reason?: string;
}): CondoHrBundle {
  const isDay =
    params.shiftCode === 'D' || params.shiftCode === 'C' || params.shiftCode === 'CD';
  const isNight = params.shiftCode === 'N' || params.shiftCode === 'CN';
  return setDoubleCellAssignment({
    clientId: params.clientId,
    employeeId: params.employeeId,
    dateISO: params.dateISO,
    day: isDay,
    night: isNight,
    reason: params.reason,
  });
}
