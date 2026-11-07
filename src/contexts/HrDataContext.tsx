import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  analyzeMonthlyCoverage24x7,
  computeMonthlyScheduleMatrix,
  getDocumentExpiryInfo,
} from '@/services/hrScheduleEngine';
import {
  applyBatchScheduleOverrides,
  clearMonthScheduleOverrides,
  loadCondoHrBundle,
  recordMonthlyScheduleExport,
  removeCondoDocument,
  removeEmployee,
  removeEmployeeDocument,
  removeEmployeeVacation,
  removePartyBooking,
  resetCondoHrBundleToDemo,
  setScheduleCellOverride,
  updateCondoHrConfig,
  upsertCondoDocument,
  upsertEmployee,
  upsertEmployeeDocument,
  upsertEmployeeVacation,
  upsertPartyBooking,
  validateMonthlySchedule,
} from '@/services/hrService';
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

interface HrDataContextValue {
  bundle: CondoHrBundle | null;
  loading: boolean;
  currentMonthGapsCount: number;
  expiredEmployeeDocsCount: number;
  expiringEmployeeDocsCount: number;
  urgentCondoDocsCount: number;
  updateConfig: (patch: Partial<Omit<CondoHrConfig, 'client_id'>>) => void;
  saveEmployee: (input: Omit<Employee, 'id' | 'client_id'> & { id?: string }) => void;
  deleteEmployee: (employeeId: string) => void;
  saveEmployeeDocument: (
    input: Omit<EmployeeDocument, 'id' | 'client_id'> & { id?: string }
  ) => void;
  deleteEmployeeDocument: (docId: string) => void;
  saveVacation: (input: Omit<EmployeeVacation, 'id' | 'client_id'> & { id?: string }) => void;
  deleteVacation: (vacationId: string) => void;
  overrideShiftCell: (params: {
    employeeId: string;
    dateISO: string;
    shiftCode: ShiftCode | null;
    reason?: string;
  }) => void;
  applyBatchOverrides: (yearMonth: string, overrides: ScheduleOverride[]) => void;
  resetMonthOverrides: (yearMonth: string) => void;
  validateSchedule: (
    yearMonth: string,
    validatedBy: string,
    notes?: string
  ) => ScheduleValidationRecord | null;
  markScheduleExported: (
    yearMonth: string,
    validatedBy: string
  ) => ScheduleValidationRecord | null;
  savePartyBooking: (input: Omit<PartyRoomBooking, 'id' | 'client_id'> & { id?: string }) => void;
  deletePartyBooking: (bookingId: string) => void;
  saveCondoDocument: (input: Omit<CondoDocument, 'id' | 'client_id'> & { id?: string }) => void;
  deleteCondoDocument: (docId: string) => void;
  resetDemoData: () => void;
}

const HrDataContext = createContext<HrDataContextValue | undefined>(undefined);

export const HrDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const clientId = session?.client?.id ?? null;
  const condoName = session?.client?.condo_name;

  const [bundle, setBundle] = useState<CondoHrBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!clientId) {
      setBundle(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const loaded = loadCondoHrBundle(clientId, condoName);
    setBundle(loaded);
    setLoading(false);
  }, [clientId, condoName]);

  const todayISO = getLocalTodayISO();
  const currentYM = todayISO.slice(0, 7);

  const {
    currentMonthGapsCount,
    expiredEmployeeDocsCount,
    expiringEmployeeDocsCount,
    urgentCondoDocsCount,
  } = useMemo(() => {
    if (!bundle) {
      return {
        currentMonthGapsCount: 0,
        expiredEmployeeDocsCount: 0,
        expiringEmployeeDocsCount: 0,
        urgentCondoDocsCount: 0,
      };
    }

    let gaps = 0;
    let expiredEmp = 0;
    let soonEmp = 0;

    if (bundle.config.enabled) {
      const matrix = computeMonthlyScheduleMatrix({
        yearMonth: currentYM,
        employees: bundle.employees,
        vacations: bundle.vacations,
        overrides: bundle.schedule_overrides,
      });
      const coverage = analyzeMonthlyCoverage24x7({
        yearMonth: currentYM,
        employees: bundle.employees,
        matrix,
        minDayStaff: bundle.config.min_day_staff,
        minNightStaff: bundle.config.min_night_staff,
      });
      gaps = coverage.allGaps.length;

      for (const doc of bundle.employee_documents) {
        const exp = getDocumentExpiryInfo(doc.expiry_date, todayISO, 30);
        if (exp.status === 'expired') expiredEmp++;
        else if (exp.status === 'expiring_soon') soonEmp++;
      }
    }

    let urgentCondo = 0;
    for (const cdoc of bundle.condo_documents) {
      const exp = getDocumentExpiryInfo(
        cdoc.expiry_date,
        todayISO,
        cdoc.alert_days_before || 30
      );
      if (exp.status === 'expired' || exp.status === 'expiring_soon') {
        urgentCondo++;
      }
    }

    return {
      currentMonthGapsCount: gaps,
      expiredEmployeeDocsCount: expiredEmp,
      expiringEmployeeDocsCount: soonEmp,
      urgentCondoDocsCount: urgentCondo,
    };
  }, [bundle, currentYM, todayISO]);

  const updateConfig = useCallback(
    (patch: Partial<Omit<CondoHrConfig, 'client_id'>>) => {
      if (!clientId) return;
      setBundle(updateCondoHrConfig(clientId, condoName, patch));
    },
    [clientId, condoName]
  );

  const saveEmployee = useCallback(
    (input: Omit<Employee, 'id' | 'client_id'> & { id?: string }) => {
      if (!clientId) return;
      setBundle(upsertEmployee(clientId, input));
    },
    [clientId]
  );

  const deleteEmployee = useCallback(
    (employeeId: string) => {
      if (!clientId) return;
      setBundle(removeEmployee(clientId, employeeId));
    },
    [clientId]
  );

  const saveEmployeeDocument = useCallback(
    (input: Omit<EmployeeDocument, 'id' | 'client_id'> & { id?: string }) => {
      if (!clientId) return;
      setBundle(upsertEmployeeDocument(clientId, input));
    },
    [clientId]
  );

  const deleteEmployeeDocument = useCallback(
    (docId: string) => {
      if (!clientId) return;
      setBundle(removeEmployeeDocument(clientId, docId));
    },
    [clientId]
  );

  const saveVacation = useCallback(
    (input: Omit<EmployeeVacation, 'id' | 'client_id'> & { id?: string }) => {
      if (!clientId) return;
      setBundle(upsertEmployeeVacation(clientId, input));
    },
    [clientId]
  );

  const deleteVacation = useCallback(
    (vacationId: string) => {
      if (!clientId) return;
      setBundle(removeEmployeeVacation(clientId, vacationId));
    },
    [clientId]
  );

  const overrideShiftCell = useCallback(
    (params: {
      employeeId: string;
      dateISO: string;
      shiftCode: ShiftCode | null;
      reason?: string;
    }) => {
      if (!clientId) return;
      setBundle(setScheduleCellOverride({ clientId, ...params }));
    },
    [clientId]
  );

  const applyBatchOverrides = useCallback(
    (yearMonth: string, overrides: ScheduleOverride[]) => {
      if (!clientId) return;
      setBundle(applyBatchScheduleOverrides(clientId, yearMonth, overrides));
    },
    [clientId]
  );

  const resetMonthOverrides = useCallback(
    (yearMonth: string) => {
      if (!clientId) return;
      setBundle(clearMonthScheduleOverrides(clientId, yearMonth));
    },
    [clientId]
  );

  const validateSchedule = useCallback(
    (yearMonth: string, validatedBy: string, notes?: string) => {
      if (!clientId) return null;
      const res = validateMonthlySchedule({ clientId, yearMonth, validatedBy, notes });
      setBundle(res.bundle);
      return res.record;
    },
    [clientId]
  );

  const markScheduleExported = useCallback(
    (yearMonth: string, validatedBy: string) => {
      if (!clientId) return null;
      const res = recordMonthlyScheduleExport({ clientId, yearMonth, validatedBy });
      setBundle(res.bundle);
      return res.record;
    },
    [clientId]
  );

  const savePartyBooking = useCallback(
    (input: Omit<PartyRoomBooking, 'id' | 'client_id'> & { id?: string }) => {
      if (!clientId) return;
      setBundle(upsertPartyBooking(clientId, input));
    },
    [clientId]
  );

  const deletePartyBooking = useCallback(
    (bookingId: string) => {
      if (!clientId) return;
      setBundle(removePartyBooking(clientId, bookingId));
    },
    [clientId]
  );

  const saveCondoDocument = useCallback(
    (input: Omit<CondoDocument, 'id' | 'client_id'> & { id?: string }) => {
      if (!clientId) return;
      setBundle(upsertCondoDocument(clientId, input));
    },
    [clientId]
  );

  const deleteCondoDocument = useCallback(
    (docId: string) => {
      if (!clientId) return;
      setBundle(removeCondoDocument(clientId, docId));
    },
    [clientId]
  );

  const resetDemoData = useCallback(() => {
    if (!clientId) return;
    setBundle(resetCondoHrBundleToDemo(clientId, condoName));
  }, [clientId, condoName]);

  return (
    <HrDataContext.Provider
      value={{
        bundle,
        loading,
        currentMonthGapsCount,
        expiredEmployeeDocsCount,
        expiringEmployeeDocsCount,
        urgentCondoDocsCount,
        updateConfig,
        saveEmployee,
        deleteEmployee,
        saveEmployeeDocument,
        deleteEmployeeDocument,
        saveVacation,
        deleteVacation,
        overrideShiftCell,
        applyBatchOverrides,
        resetMonthOverrides,
        validateSchedule,
        markScheduleExported,
        savePartyBooking,
        deletePartyBooking,
        saveCondoDocument,
        deleteCondoDocument,
        resetDemoData,
      }}
    >
      {children}
    </HrDataContext.Provider>
  );
};

export function useHrData(): HrDataContextValue {
  const ctx = useContext(HrDataContext);
  if (!ctx) {
    throw new Error('useHrData deve ser utilizado dentro de um HrDataProvider.');
  }
  return ctx;
}
