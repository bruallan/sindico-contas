import React, { useMemo, useState } from 'react';
import {
  FolderOpen,
  Plus,
  Search,
  FileText,
  X,
  Trash2,
} from 'lucide-react';
import { useHrData } from '@/contexts/HrDataContext';
import { WindowsFileExplorer } from '@/components/hr/WindowsFileExplorer';
import {
  Employee,
  EmployeeDocumentType,
  EmployeeRoleCategory,
} from '@/types/hr';
import { getDocumentExpiryInfo } from '@/services/hrScheduleEngine';
import { formatDateBR, getLocalTodayISO } from '@/utils/formatters';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'desligado'>('ativo');

  // Selected Employee Details Modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // File Explorer Modal for Employee
  const [explorerFolderId, setExplorerFolderId] = useState<string | null>(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);

  // Employee Create / Edit Modal
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empFullName, setEmpFullName] = useState('');
  const [empRegCode, setEmpRegCode] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [empRoleCategory, setEmpRoleCategory] = useState<EmployeeRoleCategory>('portaria');
  const [empCpf, setEmpCpf] = useState('');
  const [empAdmission, setEmpAdmission] = useState(todayISO);
  const [empBirth, setEmpBirth] = useState('1990-01-01');
  const [empPhone, setEmpPhone] = useState('');
  const [empSalary, setEmpSalary] = useState<number>(2650);
  const [empEmergency, setEmpEmergency] = useState('');

  // Document Create / Edit Modal
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<EmployeeDocumentType>('aso_periodico');
  const [docIssuer, setDocIssuer] = useState('');
  const [docIssueDate, setDocIssueDate] = useState(todayISO);
  const [docExpiryDate, setDocExpiryDate] = useState(() => addOneYearISO(todayISO));

  const employees = bundle?.employees ?? [];
  const documents = bundle?.employee_documents ?? [];

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (statusFilter === 'ativo' && emp.status === 'desligado') return false;
      if (statusFilter === 'desligado' && emp.status !== 'desligado') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          emp.full_name.toLowerCase().includes(q) ||
          emp.role.toLowerCase().includes(q) ||
          emp.registration_code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, statusFilter, searchQuery]);

  const openNewEmployeeModal = () => {
    setEditingEmp(null);
    setEmpFullName('');
    setEmpRegCode(`REG-${Math.floor(1000 + Math.random() * 9000)}`);
    setEmpRole('');
    setEmpRoleCategory('portaria');
    setEmpCpf('');
    setEmpAdmission(todayISO);
    setEmpBirth('1990-01-01');
    setEmpPhone('');
    setEmpSalary(2650);
    setEmpEmergency('');
    setIsEmpModalOpen(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpFullName(emp.full_name);
    setEmpRegCode(emp.registration_code);
    setEmpRole(emp.role);
    setEmpRoleCategory(emp.role_category);
    setEmpCpf(emp.cpf || emp.cpf_masked || '');
    setEmpAdmission(emp.admission_date);
    setEmpBirth(emp.birth_date);
    setEmpPhone(emp.phone);
    setEmpSalary(emp.salary_base || emp.base_salary || 2650);
    setEmpEmergency(emp.emergency_contact || '');
    setIsEmpModalOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFullName.trim() || !empRole.trim()) return;

    saveEmployee({
      ...(editingEmp ? { id: editingEmp.id } : {}),
      full_name: empFullName.trim(),
      registration_code: empRegCode.trim(),
      role: empRole.trim(),
      role_category: empRoleCategory,
      cpf_masked: empCpf.trim() || '000.***.***-00',
      cpf: empCpf.trim(),
      admission_date: empAdmission,
      birth_date: empBirth,
      phone: empPhone.trim(),
      schedule_pattern: editingEmp?.schedule_pattern ?? '12x36_day_even',
      schedule_rule: editingEmp?.schedule_rule ?? {
        employeeId: editingEmp?.id || 'new',
        ruleType: 'sequence_cycle',
        sequenceCycle: {
          workDays: 3,
          offDays: 1,
          shiftType: 'day',
          startDate: empAdmission,
        },
      },
      work_hours_label: editingEmp?.work_hours_label ?? '12x36 • 06:00 às 18:00',
      work_hours_description: editingEmp?.work_hours_description ?? '12x36 • 06:00 às 18:00',
      status: editingEmp?.status ?? 'ativo',
      base_salary: Number(empSalary) || 2650,
      salary_base: Number(empSalary) || 2650,
      emergency_contact: empEmergency.trim(),
    });

    setIsEmpModalOpen(false);
    if (selectedEmployee && editingEmp && selectedEmployee.id === editingEmp.id) {
      setSelectedEmployee((prev) =>
        prev
          ? {
              ...prev,
              full_name: empFullName.trim(),
              role: empRole.trim(),
              cpf: empCpf.trim(),
              phone: empPhone.trim(),
            }
          : null
      );
    }
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !docTitle.trim()) return;

    saveEmployeeDocument({
      employee_id: selectedEmployee.id,
      doc_type: docType,
      title: docTitle.trim(),
      issuer: docIssuer.trim() || 'Clínica Ocupacional',
      issue_date: docIssueDate,
      expiry_date: docExpiryDate || null,
      certificate_number: `CERT-${Date.now().toString().slice(-6)}`,
    });

    setIsDocModalOpen(false);
  };

  const openEmployeeFolder = (emp: Employee) => {
    const folderId = `folder-emp-${emp.id}`;
    setExplorerFolderId(folderId);
    setIsExplorerOpen(true);
  };

  const selectedEmpDocs = useMemo(() => {
    if (!selectedEmployee) return [];
    return documents.filter((d) => d.employee_id === selectedEmployee.id);
  }, [documents, selectedEmployee]);

  return (
    <div className="space-y-4 font-sans">
      {/* Search and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#15263B] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar colaborador por nome ou função..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#0E1B2B] text-xs text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-[#0E1B2B] border border-slate-200/80 dark:border-slate-800">
            <button
              onClick={() => setStatusFilter('ativo')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'ativo'
                  ? 'bg-white text-slate-900 dark:bg-[#15263B] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ativos ({employees.filter((e) => e.status !== 'desligado').length})
            </button>
            <button
              onClick={() => setStatusFilter('desligado')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'desligado'
                  ? 'bg-white text-slate-900 dark:bg-[#15263B] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Desligados ({employees.filter((e) => e.status === 'desligado').length})
            </button>
          </div>

          <button
            onClick={openNewEmployeeModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0E1B2B] hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-[#0E1B2B] font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Colaborador
          </button>
        </div>
      </div>

      {/* Cards Grid: Only Name and Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            onClick={() => setSelectedEmployee(emp)}
            className="p-4 bg-white dark:bg-[#15263B] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                {emp.full_name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                {emp.role}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
              <span>{emp.registration_code}</span>
              <span className="group-hover:text-slate-700 dark:group-hover:text-slate-200 font-sans font-medium">
                Abrir ficha →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Employee Details Modal (Opened on Card Click) */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#15263B] border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 rounded-2xl space-y-4 text-xs">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedEmployee.full_name}
                </h3>
                <p className="text-slate-500 mt-0.5">
                  {selectedEmployee.role} • Matrícula: {selectedEmployee.registration_code}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prominent Button: Ver Pasta do Colaborador */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#0E1B2B]/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  Pasta Eletrônica do Colaborador
                </div>
                <div className="text-[11px] text-slate-500">
                  Gerencie todos os arquivos, pastas, ASOs, atestados e certificados no Explorer.
                </div>
              </div>
              <button
                onClick={() => openEmployeeFolder(selectedEmployee)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shrink-0 rounded-xl shadow-xs transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                Ver pasta do colaborador
              </button>
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/50 dark:bg-[#0E1B2B]/40 border border-slate-200/70 dark:border-slate-800/70 rounded-xl">
              <div>
                <span className="text-slate-500 block text-[10px]">CPF:</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {selectedEmployee.cpf || selectedEmployee.cpf_masked || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Data de Admissão:</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {formatDateBR(selectedEmployee.admission_date)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Data de Nascimento:</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {formatDateBR(selectedEmployee.birth_date)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Telefone de Contato:</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {selectedEmployee.phone || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Salário Base:</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  R$ {(selectedEmployee.salary_base || selectedEmployee.base_salary || 2650).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Status Operacional:</span>
                <span className="font-semibold uppercase text-[10px] text-slate-900 dark:text-white">
                  {selectedEmployee.status}
                </span>
              </div>
            </div>

            {/* Documents & Expiry Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Documentos, ASOs e Certificados ({selectedEmpDocs.length})
                </span>
                <button
                  onClick={() => setIsDocModalOpen(true)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Documento
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#15263B] overflow-hidden">
                {selectedEmpDocs.length === 0 ? (
                  <div className="py-6 text-center text-slate-400">
                    Nenhum documento cadastrado diretamente na ficha. Utilize a pasta do colaborador para anexar arquivos.
                  </div>
                ) : (
                  selectedEmpDocs.map((doc) => {
                    const exp = getDocumentExpiryInfo(doc.expiry_date, todayISO);
                    return (
                      <div
                        key={doc.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#0E1B2B]/40 transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            {doc.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Emissor: {doc.issuer || 'Clínica Ocupacional'} • Emissão: {formatDateBR(doc.issue_date)}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {doc.expiry_date ? (
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                exp.status === 'expired'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                  : exp.status === 'expiring_soon'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}
                            >
                              Vence: {formatDateBR(doc.expiry_date)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Sem validade</span>
                          )}

                          <button
                            onClick={() => deleteEmployeeDocument(doc.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded"
                            title="Excluir Documento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  if (confirm(`Deseja desligar / remover o colaborador "${selectedEmployee.full_name}"?`)) {
                    deleteEmployee(selectedEmployee.id);
                    setSelectedEmployee(null);
                  }
                }}
                className="text-rose-600 hover:text-rose-700 font-semibold text-xs"
              >
                Excluir Colaborador
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditEmployeeModal(selectedEmployee)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl"
                >
                  Editar Dados
                </button>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="px-4 py-2 bg-[#0E1B2B] text-white dark:bg-slate-100 dark:text-[#0E1B2B] font-bold rounded-xl shadow-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Windows File Explorer Modal */}
      {isExplorerOpen && (
        <WindowsFileExplorer
          initialFolderId={explorerFolderId}
          isModal={true}
          onClose={() => setIsExplorerOpen(false)}
          title={`Pasta do Colaborador • ${selectedEmployee?.full_name || 'Documentos'}`}
        />
      )}

      {/* Create / Edit Employee Modal */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEmployee}
            className="bg-white dark:bg-[#15263B] border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 rounded-2xl space-y-3.5 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingEmp ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEmpModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={empFullName}
                onChange={(e) => setEmpFullName(e.target.value)}
                placeholder="Ex: Carlos Eduardo Mendes"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Função / Cargo</label>
                <input
                  type="text"
                  required
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  placeholder="Ex: Porteiro Líder"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Matrícula</label>
                <input
                  type="text"
                  required
                  value={empRegCode}
                  onChange={(e) => setEmpRegCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">CPF</label>
                <input
                  type="text"
                  value={empCpf}
                  onChange={(e) => setEmpCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Telefone</label>
                <input
                  type="text"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Admissão</label>
                <input
                  type="date"
                  value={empAdmission}
                  onChange={(e) => setEmpAdmission(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Nascimento</label>
                <input
                  type="date"
                  value={empBirth}
                  onChange={(e) => setEmpBirth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEmpModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0E1B2B] hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-[#0E1B2B] font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Salvar Colaborador
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Document Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDocument}
            className="bg-white dark:bg-[#15263B] border border-slate-200 dark:border-slate-800 w-full max-w-sm shadow-2xl p-6 rounded-2xl space-y-3.5 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Adicionar Documento / ASO
              </h3>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Título do Documento</label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Ex: ASO Periódico 2026"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Tipo</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-900 dark:text-white"
              >
                <option value="aso_admissional">ASO Admissional</option>
                <option value="aso_periodico">ASO Periódico</option>
                <option value="brigada_incendio">Certificado de Brigada de Incêndio</option>
                <option value="nr10_seguranca_eletrica">Certificado NR-10</option>
                <option value="nr35_trabalho_altura">Certificado NR-35</option>
                <option value="cnh">CNH</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Emissor / Clínica</label>
              <input
                type="text"
                value={docIssuer}
                onChange={(e) => setDocIssuer(e.target.value)}
                placeholder="Ex: Clínica Ocupacional Santa Maria"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Data de Emissão</label>
              <input
                type="date"
                value={docIssueDate}
                onChange={(e) => setDocIssueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">Data de Validade</label>
              <input
                type="date"
                value={docExpiryDate}
                onChange={(e) => setDocExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1B2B] text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0E1B2B] hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-[#0E1B2B] font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Salvar Documento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
