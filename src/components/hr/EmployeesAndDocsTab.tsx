import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  FilePlus,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  UserPlus,
  X,
  Cake,
} from 'lucide-react';
import { useHrData } from '@/contexts/HrDataContext';
import {
  EMPLOYEE_DOC_TYPE_LABELS,
  getDocumentExpiryInfo,
  SCHEDULE_PATTERN_LABELS,
} from '@/services/hrScheduleEngine';
import {
  Employee,
  EmployeeDocument,
  EmployeeDocumentType,
  EmployeeRoleCategory,
  SchedulePattern,
} from '@/types/hr';
import { formatDateBR, getLocalTodayISO } from '@/utils/formatters';

type QuickFilter = 'all' | 'expired' | 'soon' | 'fire_brigade' | 'vacation';

function addOneYearISO(baseDateISO: string): string {
  const [y, m, d] = baseDateISO.split('-').map(Number);
  return `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const EmployeesAndDocsTab: React.FC = () => {
  const {
    bundle,
    saveEmployee,
    deleteEmployee,
    saveEmployeeDocument,
    deleteEmployeeDocument,
  } = useHrData();

  const todayISO = getLocalTodayISO();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('all');
  const [expandedEmpIds, setExpandedEmpIds] = useState<Set<string>>(() => new Set());

  // Modal Novo / Editar Colaborador
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empFullName, setEmpFullName] = useState('');
  const [empRegCode, setEmpRegCode] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [empRoleCategory, setEmpRoleCategory] = useState<EmployeeRoleCategory>('portaria');
  const [empCpf, setEmpCpf] = useState('');
  const [empAdmission, setEmpAdmission] = useState(todayISO);
  const [empBirth, setEmpBirth] = useState('1988-05-15');
  const [empPhone, setEmpPhone] = useState('');
  const [empPattern, setEmpPattern] = useState<SchedulePattern>('12x36_day_even');
  const [empHoursLabel, setEmpHoursLabel] = useState('12x36 • 06:00 às 18:00');
  const [empSalary, setEmpSalary] = useState<number>(2650);
  const [empEmergency, setEmpEmergency] = useState('');

  // Modal Novo / Editar Documento / Exame / Certificado
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<EmployeeDocument | null>(null);
  const [docEmpId, setDocEmpId] = useState('');
  const [docType, setDocType] = useState<EmployeeDocumentType>('aso_periodico');
  const [docTitle, setDocTitle] = useState('');
  const [docIssuer, setDocIssuer] = useState('');
  const [docIssueDate, setDocIssueDate] = useState(todayISO);
  const [docHasExpiry, setDocHasExpiry] = useState(true);
  const [docExpiryDate, setDocExpiryDate] = useState(() => addOneYearISO(todayISO));
  const [docCertNumber, setDocCertNumber] = useState('');
  const [docNotes, setDocNotes] = useState('');

  const employees = bundle?.employees ?? [];
  const documents = bundle?.employee_documents ?? [];

  const docsByEmployee = useMemo(() => {
    const map = new Map<string, EmployeeDocument[]>();
    for (const d of documents) {
      const list = map.get(d.employee_id) ?? [];
      list.push(d);
      map.set(d.employee_id, list);
    }
    return map;
  }, [documents]);

  const stats = useMemo(() => {
    let expiredDocs = 0;
    let soonDocs = 0;
    let validBrigadeCount = 0;
    let alertBrigadeCount = 0;

    for (const doc of documents) {
      const exp = getDocumentExpiryInfo(doc.expiry_date, todayISO, 30);
      if (exp.status === 'expired') expiredDocs++;
      else if (exp.status === 'expiring_soon') soonDocs++;

      if (doc.doc_type === 'brigada_incendio') {
        if (exp.status === 'valid') validBrigadeCount++;
        else alertBrigadeCount++;
      }
    }

    return { expiredDocs, soonDocs, validBrigadeCount, alertBrigadeCount };
  }, [documents, todayISO]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return employees.filter((emp) => {
      const empDocs = docsByEmployee.get(emp.id) ?? [];

      if (activeFilter === 'expired') {
        const hasExpired = empDocs.some(
          (d) => getDocumentExpiryInfo(d.expiry_date, todayISO, 30).status === 'expired'
        );
        if (!hasExpired) return false;
      } else if (activeFilter === 'soon') {
        const hasSoon = empDocs.some(
          (d) => getDocumentExpiryInfo(d.expiry_date, todayISO, 30).status === 'expiring_soon'
        );
        if (!hasSoon) return false;
      } else if (activeFilter === 'fire_brigade') {
        const hasFire = empDocs.some((d) => d.doc_type === 'brigada_incendio');
        if (!hasFire) return false;
      } else if (activeFilter === 'vacation') {
        if (emp.status !== 'ferias') return false;
      }

      if (!q) return true;

      const docText = empDocs
        .map((d) => `${d.title} ${d.issuer} ${d.certificate_number}`)
        .join(' ')
        .toLowerCase();

      return (
        emp.full_name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.registration_code.toLowerCase().includes(q) ||
        docText.includes(q)
      );
    });
  }, [employees, docsByEmployee, activeFilter, searchQuery, todayISO]);

  const toggleExpand = (empId: string) => {
    setExpandedEmpIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const openCreateEmployeeModal = () => {
    setEditingEmp(null);
    const nextIdx = employees.length + 1;
    setEmpRegCode(`CLT-${String(nextIdx).padStart(3, '0')}`);
    setEmpFullName('');
    setEmpRole('Porteiro / Controlador de Acesso');
    setEmpRoleCategory('portaria');
    setEmpCpf('***.000.000-00');
    setEmpAdmission(todayISO);
    setEmpBirth('1990-06-15');
    setEmpPhone('(11) 99000-0000');
    setEmpPattern('12x36_day_even');
    setEmpHoursLabel('12x36 • 06:00 às 18:00');
    setEmpSalary(2650);
    setEmpEmergency('');
    setIsEmpModalOpen(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpRegCode(emp.registration_code);
    setEmpFullName(emp.full_name);
    setEmpRole(emp.role);
    setEmpRoleCategory(emp.role_category);
    setEmpCpf(emp.cpf_masked);
    setEmpAdmission(emp.admission_date);
    setEmpBirth(emp.birth_date);
    setEmpPhone(emp.phone);
    setEmpPattern(emp.schedule_pattern);
    setEmpHoursLabel(emp.work_hours_label);
    setEmpSalary(emp.base_salary);
    setEmpEmergency(emp.emergency_contact);
    setIsEmpModalOpen(true);
  };

  const handleSaveEmployeeForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFullName.trim()) return;
    saveEmployee({
      id: editingEmp?.id,
      registration_code: empRegCode.trim() || 'CLT-NOVO',
      full_name: empFullName.trim(),
      role: empRole.trim(),
      role_category: empRoleCategory,
      cpf_masked: empCpf.trim() || '***.000.000-00',
      admission_date: empAdmission,
      birth_date: empBirth,
      phone: empPhone.trim(),
      schedule_pattern: empPattern,
      work_hours_label: empHoursLabel.trim(),
      base_salary: Number(empSalary) || 0,
      status: editingEmp?.status ?? 'ativo',
      emergency_contact: empEmergency.trim(),
    });
    setIsEmpModalOpen(false);
  };

  const openAddDocModal = (employeeId: string, presetType: EmployeeDocumentType = 'aso_periodico') => {
    setEditingDoc(null);
    setDocEmpId(employeeId);
    setDocType(presetType);
    setDocTitle(EMPLOYEE_DOC_TYPE_LABELS[presetType]);
    setDocIssuer(
      presetType === 'brigada_incendio'
        ? 'PrevFire Treinamentos Credenciados CBM'
        : 'VidaMed Saúde Ocupacional'
    );
    setDocIssueDate(todayISO);
    const permanent = presetType === 'aso_admissional';
    setDocHasExpiry(!permanent);
    setDocExpiryDate(addOneYearISO(todayISO));
    setDocCertNumber(`CERT-${Math.floor(1000 + Math.random() * 9000)}`);
    setDocNotes('');
    setIsDocModalOpen(true);
  };

  const openEditDocModal = (doc: EmployeeDocument) => {
    setEditingDoc(doc);
    setDocEmpId(doc.employee_id);
    setDocType(doc.doc_type);
    setDocTitle(doc.title);
    setDocIssuer(doc.issuer);
    setDocIssueDate(doc.issue_date);
    setDocHasExpiry(Boolean(doc.expiry_date));
    setDocExpiryDate(doc.expiry_date || addOneYearISO(todayISO));
    setDocCertNumber(doc.certificate_number);
    setDocNotes(doc.notes ?? '');
    setIsDocModalOpen(true);
  };

  const handleQuickRenewDoc = (doc: EmployeeDocument) => {
    const nextIssue = todayISO;
    const nextExp = addOneYearISO(todayISO);
    saveEmployeeDocument({
      id: doc.id,
      employee_id: doc.employee_id,
      doc_type: doc.doc_type,
      title: doc.title,
      issuer: doc.issuer,
      issue_date: nextIssue,
      expiry_date: nextExp,
      certificate_number: `${doc.certificate_number.split('-REN')[0]}-REN`,
      notes: 'Renovado por mais 12 meses.',
    });
  };

  const handleSaveDocForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docEmpId || !docTitle.trim()) return;
    saveEmployeeDocument({
      id: editingDoc?.id,
      employee_id: docEmpId,
      doc_type: docType,
      title: docTitle.trim(),
      issuer: docIssuer.trim() || 'Emissor Credenciado',
      issue_date: docIssueDate,
      expiry_date: docHasExpiry ? docExpiryDate : null,
      certificate_number: docCertNumber.trim() || 'S/N',
      notes: docNotes.trim() || undefined,
    });
    setIsDocModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Indicadores de Conformidade Documental e Quadro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4">
          <span className="text-[11px] uppercase tracking-wider opacity-60 font-semibold">
            Quadro Próprio (CNPJ)
          </span>
          <p className="text-xl font-bold tabular-nums mt-1 text-[#1A73E9]">
            {employees.length} Colaboradores
          </p>
          <p className="text-[11px] opacity-60 mt-0.5">
            Contratados diretamente via CLT no condomínio
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider opacity-60 font-semibold">
              Brigada de Incêndio (NR-23)
            </span>
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-xl font-bold tabular-nums mt-1 text-[#2AC38B]">
            {stats.validBrigadeCount} Aptos em Dia
          </p>
          <p className="text-[11px] opacity-65 mt-0.5">
            {stats.alertBrigadeCount > 0
              ? `${stats.alertBrigadeCount} certificado(s) exigindo reciclagem`
              : 'Todos os certificados de incêndio em dia'}
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4">
          <span className="text-[11px] uppercase tracking-wider opacity-60 font-semibold">
            Vencendo em até 30 Dias
          </span>
          <p className="text-xl font-bold tabular-nums mt-1 text-amber-500">
            {stats.soonDocs} Documento{stats.soonDocs !== 1 ? 's' : ''}
          </p>
          <p className="text-[11px] opacity-65 mt-0.5">
            Exames periódicos (ASO) e reciclagens próximas
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4">
          <span className="text-[11px] uppercase tracking-wider opacity-60 font-semibold">
            Documentos Vencidos
          </span>
          <p
            className={`text-xl font-bold tabular-nums mt-1 ${
              stats.expiredDocs > 0 ? 'text-[#EF4444]' : 'text-[#2AC38B]'
            }`}
          >
            {stats.expiredDocs} Pendência{stats.expiredDocs !== 1 ? 's' : ''}
          </p>
          <p className="text-[11px] opacity-65 mt-0.5">
            {stats.expiredDocs > 0
              ? 'Regularizar imediatamente junto à clínica / CBM'
              : 'Nenhuma pendência vencida'}
          </p>
        </div>
      </div>

      {/* Barra de Pesquisa, Filtros e Ações */}
      <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-45 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar colaborador, cargo, exame periódico, incêndio, NR..."
              className="w-full h-9 pl-9 pr-4 rounded-lg text-xs bg-[#E6EAED]/45 dark:bg-[#0E1B2B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/12 focus:outline-none focus:border-[#1A73E9]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {employees.length > 0 && (
              <button
                type="button"
                onClick={() => openAddDocModal(employees[0].id, 'brigada_incendio')}
                className="h-9 px-3.5 rounded-lg text-xs font-medium border border-[#1A73E9]/35 bg-[#1A73E9]/10 text-[#1A73E9] hover:bg-[#1A73E9]/15 inline-flex items-center gap-1.5 transition-colors"
              >
                <FilePlus className="h-3.5 w-3.5" />
                <span>+ Lançar Exame / Certificado</span>
              </button>
            )}
            <button
              type="button"
              onClick={openCreateEmployeeModal}
              className="h-9 px-3.5 rounded-lg text-xs font-semibold bg-[#1A73E9] hover:bg-[#1A73E9]/90 text-white inline-flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ Cadastrar Colaborador</span>
            </button>
          </div>
        </div>

        {/* Pills de Filtro */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {(
            [
              { id: 'all', label: `Todos (${employees.length})` },
              { id: 'expired', label: `Com Doc. Vencido (${stats.expiredDocs})` },
              { id: 'soon', label: `Vencendo em 30d (${stats.soonDocs})` },
              { id: 'fire_brigade', label: 'Brigada de Incêndio (NR-23)' },
              { id: 'vacation', label: 'Em Férias Agora' },
            ] as { id: QuickFilter; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`h-7 px-3 rounded-full text-[11px] font-medium transition-colors ${
                activeFilter === f.id
                  ? 'bg-[#1A73E9] text-white'
                  : 'bg-[#E6EAED]/65 dark:bg-[#0E1B2B] text-[#0E1B2B]/75 dark:text-[#E6EAED]/75 hover:bg-[#1A73E9]/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Colaboradores e Dossiê de Documentos */}
      <div className="space-y-3">
        {filteredEmployees.length === 0 ? (
          <div className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-8 text-center text-xs opacity-65">
            Nenhum colaborador encontrado para o filtro selecionado.
          </div>
        ) : (
          filteredEmployees.map((emp) => {
            const empDocs = docsByEmployee.get(emp.id) ?? [];
            const isExpanded = expandedEmpIds.has(emp.id);
            const initials = emp.full_name
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')
              .toUpperCase();

            const birthParts = emp.birth_date.split('-');
            const birthDayMonth =
              birthParts.length === 3 ? `${birthParts[2]}/${birthParts[1]}` : emp.birth_date;

            const hasExpiredDoc = empDocs.some(
              (d) => getDocumentExpiryInfo(d.expiry_date, todayISO, 30).status === 'expired'
            );
            const hasSoonDoc = empDocs.some(
              (d) => getDocumentExpiryInfo(d.expiry_date, todayISO, 30).status === 'expiring_soon'
            );

            return (
              <div
                key={emp.id}
                className={`rounded-xl bg-white dark:bg-[#15263B] border transition-colors ${
                  hasExpiredDoc
                    ? 'border-[#EF4444]/40'
                    : hasSoonDoc
                    ? 'border-amber-500/40'
                    : 'border-[#0E1B2B]/10 dark:border-[#E6EAED]/10'
                }`}
              >
                {/* Cabeçalho do Colaborador */}
                <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-[#1A73E9]/12 text-[#1A73E9] font-bold text-xs flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0E1B2B]/8 dark:bg-[#E6EAED]/10 font-semibold">
                          {emp.registration_code}
                        </span>
                        <h3 className="text-sm font-semibold">{emp.full_name}</h3>
                        {emp.status === 'ferias' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-300">
                            Em Férias
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2AC38B]/15 text-[#178F64] dark:text-[#2AC38B]">
                            Ativo no CNPJ
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#0E1B2B]/70 dark:text-[#E6EAED]/70">
                        <strong>{emp.role}</strong> • {emp.work_hours_label}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] opacity-65">
                        <span>Admissão: {formatDateBR(emp.admission_date)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Cake className="h-3 w-3 text-[#1A73E9]" />
                          Aniversário: {birthDayMonth}
                        </span>
                        {emp.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {emp.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resumo Rápido dos Documentos + Botão Expandir */}
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {empDocs.map((doc) => {
                        const exp = getDocumentExpiryInfo(doc.expiry_date, todayISO, 30);
                        const isFire = doc.doc_type === 'brigada_incendio';
                        const isAso =
                          doc.doc_type === 'aso_admissional' || doc.doc_type === 'aso_periodico';

                        const pillStyle =
                          exp.status === 'expired'
                            ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/35'
                            : exp.status === 'expiring_soon'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35'
                            : 'bg-[#2AC38B]/12 text-[#16885E] dark:text-[#2AC38B] border-[#2AC38B]/25';

                        const shortName =
                          doc.doc_type === 'aso_admissional'
                            ? 'ASO Admissional'
                            : doc.doc_type === 'aso_periodico'
                            ? 'ASO Periódico'
                            : doc.doc_type === 'brigada_incendio'
                            ? 'Brigada Incêndio'
                            : doc.doc_type.toUpperCase();

                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => toggleExpand(emp.id)}
                            title={`${doc.title} — ${exp.label}`}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-semibold ${pillStyle}`}
                          >
                            {isFire ? (
                              <Flame className="h-3 w-3 shrink-0" />
                            ) : isAso ? (
                              <Stethoscope className="h-3 w-3 shrink-0" />
                            ) : (
                              <Award className="h-3 w-3 shrink-0" />
                            )}
                            <span>{shortName}</span>
                            {doc.expiry_date && (
                              <span className="opacity-80 tabular-nums">
                                ({formatDateBR(doc.expiry_date).slice(0, 5)}/
                                {doc.expiry_date.slice(2, 4)})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(emp.id)}
                      className="h-8 px-3 rounded-lg border border-[#0E1B2B]/12 dark:border-[#E6EAED]/15 hover:border-[#1A73E9] text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>Documentos ({empDocs.length})</span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Painel Expandido: Tabela de Exames, Certificados e Validades */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#0E1B2B]/8 dark:border-[#E6EAED]/8 bg-[#E6EAED]/25 dark:bg-[#0E1B2B]/35 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold">
                        Prontuário de Exames Ocupacionais (ASO) e Certificados Obrigatórios
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditEmployeeModal(emp)}
                          className="h-7 px-2.5 rounded-md text-[11px] font-medium border border-[#0E1B2B]/12 dark:border-[#E6EAED]/15 hover:border-[#1A73E9] inline-flex items-center gap-1"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Editar Cadastro</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openAddDocModal(emp.id, 'aso_periodico')}
                          className="h-7 px-2.5 rounded-md text-[11px] font-semibold bg-[#1A73E9] text-white inline-flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Novo Exame / Certificado</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {empDocs.map((doc) => {
                        const exp = getDocumentExpiryInfo(doc.expiry_date, todayISO, 30);
                        return (
                          <div
                            key={doc.id}
                            className="rounded-lg bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-3 flex flex-col justify-between gap-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {doc.doc_type === 'brigada_incendio' && (
                                    <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                                  )}
                                  <h4 className="text-xs font-semibold truncate">{doc.title}</h4>
                                </div>
                                <p className="text-[11px] opacity-65 mt-0.5">
                                  {doc.issuer} • Nº {doc.certificate_number}
                                </p>
                              </div>

                              {exp.status === 'expired' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444] shrink-0">
                                  <AlertCircle className="h-3 w-3" />
                                  {exp.label}
                                </span>
                              ) : exp.status === 'expiring_soon' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 shrink-0">
                                  <AlertTriangle className="h-3 w-3" />
                                  {exp.label}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#2AC38B]/15 text-[#178F64] dark:text-[#2AC38B] shrink-0">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {exp.label}
                                </span>
                              )}
                            </div>

                            {doc.notes && (
                              <p className="text-[11px] text-[#1A73E9] bg-[#1A73E9]/8 rounded px-2 py-1">
                                {doc.notes}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-[#0E1B2B]/6 dark:border-[#E6EAED]/6 text-[11px]">
                              <div className="opacity-70 tabular-nums">
                                Emissão: <strong>{formatDateBR(doc.issue_date)}</strong> • Validade:{' '}
                                <strong>
                                  {doc.expiry_date ? formatDateBR(doc.expiry_date) : 'Permanente'}
                                </strong>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {doc.expiry_date && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickRenewDoc(doc)}
                                    title="Registrar renovação por mais 12 meses a partir de hoje"
                                    className="px-2 py-0.5 rounded bg-[#2AC38B]/15 hover:bg-[#2AC38B]/25 text-[#15855C] dark:text-[#2AC38B] font-semibold inline-flex items-center gap-1"
                                  >
                                    <RefreshCw className="h-2.5 w-2.5" />
                                    <span>Renovar</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditDocModal(doc)}
                                  className="p-1 rounded hover:bg-[#0E1B2B]/8 dark:hover:bg-[#E6EAED]/10"
                                  title="Editar documento"
                                >
                                  <Pencil className="h-3 w-3 opacity-70" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteEmployeeDocument(doc.id)}
                                  className="p-1 rounded hover:bg-[#EF4444]/15 text-[#EF4444]"
                                  title="Remover documento"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {employees.length > 1 && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => deleteEmployee(emp.id)}
                          className="text-[11px] text-[#EF4444]/80 hover:text-[#EF4444] inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Desligar / Remover Colaborador</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Cadastrar / Editar Colaborador */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/15 p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">
                {editingEmp ? 'Editar Colaborador (CNPJ)' : 'Cadastrar Novo Colaborador no CNPJ'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEmpModalOpen(false)}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployeeForm} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Matrícula *</label>
                  <input
                    type="text"
                    required
                    value={empRegCode}
                    onChange={(e) => setEmpRegCode(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-medium mb-1 opacity-80">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={empFullName}
                    onChange={(e) => setEmpFullName(e.target.value)}
                    placeholder="Nome completo do colaborador"
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Cargo / Função *</label>
                  <input
                    type="text"
                    required
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Setor Operacional *</label>
                  <select
                    value={empRoleCategory}
                    onChange={(e) => setEmpRoleCategory(e.target.value as EmployeeRoleCategory)}
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  >
                    <option value="portaria">Portaria / Controle de Acesso</option>
                    <option value="ronda">Ronda / Vigilância</option>
                    <option value="cobertura">Zeladoria & Cobertura Polivalente</option>
                    <option value="zeladoria">Zeladoria</option>
                    <option value="limpeza">Conservação e Limpeza</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">
                    Escala Automática Base *
                  </label>
                  <select
                    value={empPattern}
                    onChange={(e) => {
                      const nextPat = e.target.value as SchedulePattern;
                      setEmpPattern(nextPat);
                      setEmpHoursLabel(SCHEDULE_PATTERN_LABELS[nextPat]);
                    }}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  >
                    {(Object.keys(SCHEDULE_PATTERN_LABELS) as SchedulePattern[]).map((pat) => (
                      <option key={pat} value={pat}>
                        {SCHEDULE_PATTERN_LABELS[pat]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Descrição de Horário</label>
                  <input
                    type="text"
                    value={empHoursLabel}
                    onChange={(e) => setEmpHoursLabel(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Data de Admissão *</label>
                  <input
                    type="date"
                    required
                    value={empAdmission}
                    onChange={(e) => setEmpAdmission(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">
                    Data de Nascimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={empBirth}
                    onChange={(e) => setEmpBirth(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">CPF</label>
                  <input
                    type="text"
                    value={empCpf}
                    onChange={(e) => setEmpCpf(e.target.value)}
                    placeholder="***.000.000-00"
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Salário Base (R$)</label>
                  <input
                    type="number"
                    min={0}
                    value={empSalary}
                    onChange={(e) => setEmpSalary(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Contato de Emergência</label>
                  <input
                    type="text"
                    value={empEmergency}
                    onChange={(e) => setEmpEmergency(e.target.value)}
                    placeholder="Nome — Telefone"
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-[#1A73E9] text-white font-semibold"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar / Editar Exame ou Certificado */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/15 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">
                {editingDoc ? 'Editar Exame / Certificado' : 'Registrar Exame ou Certificado'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="h-8 w-8 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDocForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium mb-1 opacity-80">Colaborador *</label>
                <select
                  value={docEmpId}
                  onChange={(e) => setDocEmpId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Categoria do Documento *</label>
                <select
                  value={docType}
                  onChange={(e) => {
                    const nextType = e.target.value as EmployeeDocumentType;
                    setDocType(nextType);
                    setDocTitle(EMPLOYEE_DOC_TYPE_LABELS[nextType]);
                    if (nextType === 'aso_admissional') setDocHasExpiry(false);
                    else setDocHasExpiry(true);
                  }}
                  className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                >
                  {(Object.keys(EMPLOYEE_DOC_TYPE_LABELS) as EmployeeDocumentType[]).map((t) => (
                    <option key={t} value={t}>
                      {EMPLOYEE_DOC_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Título do Documento *</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 opacity-80">Clínica / Emissor *</label>
                  <input
                    type="text"
                    required
                    value={docIssuer}
                    onChange={(e) => setDocIssuer(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 opacity-80">Nº Certificado / ASO</label>
                  <input
                    type="text"
                    value={docCertNumber}
                    onChange={(e) => setDocCertNumber(e.target.value)}
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
                    value={docIssueDate}
                    onChange={(e) => setDocIssueDate(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium opacity-80">Data de Validade</label>
                    <label className="inline-flex items-center gap-1 text-[10px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={docHasExpiry}
                        onChange={(e) => setDocHasExpiry(e.target.checked)}
                      />
                      <span>Possui validade</span>
                    </label>
                  </div>
                  <input
                    type="date"
                    disabled={!docHasExpiry}
                    value={docExpiryDate}
                    onChange={(e) => setDocExpiryDate(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 disabled:opacity-40"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 opacity-80">Observações</label>
                <input
                  type="text"
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="Ex: Brigadista titular do Bloco A / apto para altura..."
                  className="w-full h-9 px-3 rounded-lg bg-[#E6EAED]/50 dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-[#1A73E9] text-white font-semibold"
                >
                  Salvar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
