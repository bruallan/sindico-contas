import {
  CondoDocument,
  CondoHrBundle,
  CondoHrConfig,
  Employee,
  EmployeeDocument,
  EmployeeVacation,
  ExplorerItem,
  PartyRoomBooking,
  ScheduleOverrideCell,
} from '@/types/hr';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function buildInitialCondoHrBundle(
  clientId: string,
  condoName = 'Condomínio Residencial'
): CondoHrBundle {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const p = (suffix: string) => `${clientId}-hr-${suffix}`;

  const config: CondoHrConfig = {
    client_id: clientId,
    enabled: true,
    cnpj: '18.492.310/0001-54',
    corporate_name: `${condoName} — Administração Direta`,
    min_day_staff: 3,
    min_night_staff: 2,
    updated_at: now.toISOString(),
  };

  // 10 Colaboradores Ativos com Regras de Escala configuradas
  // Distribuídos em sequências cíclicas (3x1, 12x36, 5x2) e fixas
  const employees: Employee[] = [
    {
      id: p('emp-01'),
      client_id: clientId,
      registration_code: 'CLT-001',
      full_name: 'Carlos Eduardo Mendes',
      role: 'Porteiro Diurno (Líder)',
      role_category: 'portaria',
      cpf_masked: '***.418.920-14',
      admission_date: `${curY - 5}-03-12`,
      birth_date: `${curY - 41}-${pad2(curM)}-14`,
      phone: '(11) 98741-2210',
      schedule_rule: {
        employeeId: p('emp-01'),
        ruleType: 'sequence_cycle',
        sequenceCycle: {
          workDays: 3,
          offDays: 1,
          shiftType: 'day',
          startDate: `${curY}-01-01`,
        },
      },
      work_hours_label: 'Escala 3x1 • 06:00 às 18:00',
      base_salary: 2680,
      status: 'ativo',
      emergency_contact: 'Márcia Mendes (Esposa) — (11) 98741-9901',
    },
    {
      id: p('emp-02'),
      client_id: clientId,
      registration_code: 'CLT-002',
      full_name: 'Juliana Ferreira Costa',
      role: 'Controladora de Acesso Diurna',
      role_category: 'portaria',
      cpf_masked: '***.732.104-58',
      admission_date: `${curY - 3}-07-05`,
      birth_date: `${curY - 32}-12-09`,
      phone: '(11) 99125-4830',
      schedule_rule: {
        employeeId: p('emp-02'),
        ruleType: 'sequence_cycle',
        sequenceCycle: {
          workDays: 3,
          offDays: 1,
          shiftType: 'day',
          startDate: `${curY}-01-02`, // Inicia com defasagem de 1 dia para revezamento
        },
      },
      work_hours_label: 'Escala 3x1 • 06:00 às 18:00',
      base_salary: 2590,
      status: 'ativo',
      emergency_contact: 'Helena Costa (Mãe) — (11) 99122-1104',
    },
    {
      id: p('emp-03'),
      client_id: clientId,
      registration_code: 'CLT-003',
      full_name: 'Marcos Vinícius Rocha',
      role: 'Porteiro Noturno (Turma A)',
      role_category: 'portaria',
      cpf_masked: '***.209.654-31',
      admission_date: `${curY - 6}-01-18`,
      birth_date: `${curY - 45}-${pad2(curM)}-26`,
      phone: '(11) 98410-7732',
      schedule_rule: {
        employeeId: p('emp-03'),
        ruleType: 'sequence_cycle',
        sequenceCycle: {
          workDays: 1,
          offDays: 1,
          shiftType: 'night',
          startDate: `${curY}-01-01`, // 12x36 Par
        },
      },
      work_hours_label: 'Escala 12x36 • 18:00 às 06:00',
      base_salary: 2940,
      status: 'ativo',
      emergency_contact: 'Patrícia Rocha (Esposa) — (11) 98410-3300',
    },
    {
      id: p('emp-04'),
      client_id: clientId,
      registration_code: 'CLT-004',
      full_name: 'Paulo Henrique Santana',
      role: 'Porteiro Noturno (Turma B)',
      role_category: 'portaria',
      cpf_masked: '***.885.312-09',
      admission_date: `${curY - 3}-09-20`,
      birth_date: `${curY - 36}-10-19`,
      phone: '(11) 97654-8821',
      schedule_rule: {
        employeeId: p('emp-04'),
        ruleType: 'sequence_cycle',
        sequenceCycle: {
          workDays: 1,
          offDays: 1,
          shiftType: 'night',
          startDate: `${curY}-01-02`, // 12x36 Ímpar
        },
      },
      work_hours_label: 'Escala 12x36 • 18:00 às 06:00',
      base_salary: 2940,
      status: 'ativo',
      emergency_contact: 'Renata Santana (Irmã) — (11) 97650-0044',
    },
    {
      id: p('emp-05'),
      client_id: clientId,
      registration_code: 'CLT-005',
      full_name: 'Fernando Gomes Ribeiro',
      role: 'Ronda & Segurança Diurna',
      role_category: 'ronda',
      cpf_masked: '***.540.781-22',
      admission_date: `${curY - 4}-05-10`,
      birth_date: `${curY - 39}-08-11`,
      phone: '(11) 98233-6019',
      schedule_rule: {
        employeeId: p('emp-05'),
        ruleType: 'sequence_cycle',
        sequenceCycle: {
          workDays: 3,
          offDays: 1,
          shiftType: 'day',
          startDate: `${curY}-01-03`,
        },
      },
      work_hours_label: 'Escala 3x1 • 06:00 às 18:00',
      base_salary: 2520,
      status: 'ativo',
      emergency_contact: 'Simone Ribeiro (Esposa) — (11) 98230-1988',
    },
    {
      id: p('emp-06'),
      client_id: clientId,
      registration_code: 'CLT-006',
      full_name: 'José Augusto Almeida',
      role: 'Ronda & Segurança Diurna',
      role_category: 'ronda',
      cpf_masked: '***.119.467-80',
      admission_date: `${curY - 5}-08-14`,
      birth_date: `${curY - 48}-09-22`,
      phone: '(11) 99402-1570',
      schedule_rule: {
        employeeId: p('emp-06'),
        ruleType: 'sequence_cycle',
        sequenceCycle: {
          workDays: 3,
          offDays: 1,
          shiftType: 'day',
          startDate: `${curY}-01-04`,
        },
      },
      work_hours_label: 'Escala 3x1 • 06:00 às 18:00',
      base_salary: 2520,
      status: 'ativo',
      emergency_contact: 'Lucas Almeida (Filho) — (11) 99408-5511',
    },
    {
      id: p('emp-07'),
      client_id: clientId,
      registration_code: 'CLT-007',
      full_name: 'Ricardo Barbosa Lima',
      role: 'Vigia Noturno (Turma A)',
      role_category: 'ronda',
      cpf_masked: '***.663.290-45',
      admission_date: `${curY - 3}-02-02`,
      birth_date: `${curY - 34}-03-12`,
      phone: '(11) 98871-3409',
      schedule_rule: {
        employeeId: p('emp-07'),
        ruleType: 'sequence_cycle',
        sequenceCycle: {
          workDays: 1,
          offDays: 1,
          shiftType: 'night',
          startDate: `${curY}-01-01`,
        },
      },
      work_hours_label: 'Escala 12x36 • 18:00 às 06:00',
      base_salary: 2790,
      status: 'ativo',
      emergency_contact: 'Camila Lima (Esposa) — (11) 98870-9012',
    },
    {
      id: p('emp-08'),
      client_id: clientId,
      registration_code: 'CLT-008',
      full_name: 'Roberto Alves Nascimento',
      role: 'Vigia Noturno (Turma B)',
      role_category: 'ronda',
      cpf_masked: '***.304.872-67',
      admission_date: `${curY - 2}-11-11`,
      birth_date: `${curY - 43}-${pad2(curM)}-21`,
      phone: '(11) 97190-4428',
      schedule_rule: {
        employeeId: p('emp-08'),
        ruleType: 'sequence_cycle',
        sequenceCycle: {
          workDays: 1,
          offDays: 1,
          shiftType: 'night',
          startDate: `${curY}-01-02`,
        },
      },
      work_hours_label: 'Escala 12x36 • 18:00 às 06:00',
      base_salary: 2790,
      status: 'ativo',
      emergency_contact: 'Beatriz Nascimento (Esposa) — (11) 97195-2210',
    },
    {
      id: p('emp-09'),
      client_id: clientId,
      registration_code: 'CLT-009',
      full_name: 'Antônio Marcos Silva',
      role: 'Zelador Geral',
      role_category: 'cobertura',
      cpf_masked: '***.951.603-11',
      admission_date: `${curY - 7}-02-04`,
      birth_date: `${curY - 50}-${pad2(curM)}-05`,
      phone: '(11) 99611-8045',
      schedule_rule: {
        employeeId: p('emp-09'),
        ruleType: 'weekly_fixed',
        weeklyFixed: {
          days: {
            0: { day: false, night: false }, // Dom
            1: { day: true, night: false }, // Seg
            2: { day: true, night: false }, // Ter
            3: { day: true, night: false }, // Qua
            4: { day: true, night: false }, // Qui
            5: { day: true, night: false }, // Sex
            6: { day: true, night: false }, // Sáb
          },
        },
      },
      work_hours_label: 'Comercial Fixo • Seg a Sáb (08:00 às 17:00)',
      base_salary: 3850,
      status: 'ativo',
      emergency_contact: 'Sônia Silva (Esposa) — (11) 99610-3321',
    },
    {
      id: p('emp-10'),
      client_id: clientId,
      registration_code: 'CLT-010',
      full_name: 'Cláudia Regina Oliveira',
      role: 'Auxiliar de Limpeza',
      role_category: 'limpeza',
      cpf_masked: '***.472.519-93',
      admission_date: `${curY - 4}-06-15`,
      birth_date: `${curY - 37}-04-17`,
      phone: '(11) 98520-6193',
      schedule_rule: {
        employeeId: p('emp-10'),
        ruleType: 'weekly_fixed',
        weeklyFixed: {
          days: {
            0: { day: false, night: false }, // Dom
            1: { day: true, night: false }, // Seg
            2: { day: true, night: false }, // Ter
            3: { day: true, night: false }, // Qua
            4: { day: true, night: false }, // Qui
            5: { day: true, night: false }, // Sex
            6: { day: true, night: false }, // Sáb
          },
        },
      },
      work_hours_label: 'Comercial Fixo • Seg a Sáb (07:00 às 16:00)',
      base_salary: 2180,
      status: 'ativo',
      emergency_contact: 'Pedro Oliveira (Marido) — (11) 98522-7740',
    },
  ];

  // Documentos cadastrais dos funcionários
  const employee_documents: EmployeeDocument[] = [
    {
      id: p('doc-01-adm'),
      client_id: clientId,
      employee_id: p('emp-01'),
      doc_type: 'aso_admissional',
      title: 'ASO — Exame Admissional',
      issuer: 'VidaMed Ocupacional',
      issue_date: `${curY - 5}-03-10`,
      expiry_date: null,
      certificate_number: 'ASO-ADM-2021',
      file_size_kb: 184,
    },
    {
      id: p('doc-01-per'),
      client_id: clientId,
      employee_id: p('emp-01'),
      doc_type: 'aso_periodico',
      title: 'ASO — Exame Periódico (NR-07)',
      issuer: 'VidaMed Ocupacional',
      issue_date: `${curY}-02-15`,
      expiry_date: `${curY + 1}-02-15`,
      certificate_number: 'ASO-PER-2026',
      file_size_kb: 210,
    },
    {
      id: p('doc-01-bri'),
      client_id: clientId,
      employee_id: p('emp-01'),
      doc_type: 'brigada_incendio',
      title: 'Certificado Brigada de Incêndio (NR-23)',
      issuer: 'PrevFire Treinamentos CBM',
      issue_date: `${curY - 1}-${pad2(curM)}-20`,
      expiry_date: `${curY}-${pad2(curM)}-20`,
      certificate_number: 'BRIG-IT17-9041',
      file_size_kb: 340,
    },
    {
      id: p('doc-03-per'),
      client_id: clientId,
      employee_id: p('emp-03'),
      doc_type: 'aso_periodico',
      title: 'ASO — Exame Periódico (NR-07)',
      issuer: 'VidaMed Ocupacional',
      issue_date: `${curY - 1}-${pad2(curM)}-02`,
      expiry_date: `${curY}-${pad2(curM)}-02`, // Vencido recentemente para sinalizar
      certificate_number: 'ASO-PER-7740',
      file_size_kb: 195,
    },
    {
      id: p('doc-05-bri'),
      client_id: clientId,
      employee_id: p('emp-05'),
      doc_type: 'brigada_incendio',
      title: 'Certificado Brigada de Incêndio (NR-23)',
      issuer: 'PrevFire Treinamentos CBM',
      issue_date: `${curY - 1}-09-25`,
      expiry_date: `${curY}-09-25`,
      certificate_number: 'BRIG-8412',
      file_size_kb: 312,
    },
    {
      id: p('doc-09-nr10'),
      client_id: clientId,
      employee_id: p('emp-09'),
      doc_type: 'nr10',
      title: 'Certificado NR-10 (Elétrica)',
      issuer: 'SENAI Treinamentos',
      issue_date: `${curY - 2}-11-16`,
      expiry_date: `${curY}-12-16`,
      certificate_number: 'NR10-SP-4482',
      file_size_kb: 420,
    },
  ];

  const vacations: EmployeeVacation[] = [
    {
      id: p('vac-01'),
      client_id: clientId,
      employee_id: p('emp-04'),
      acquisitive_start: `${curY - 2}-09-20`,
      acquisitive_end: `${curY - 1}-09-19`,
      concessive_limit: `${curY}-12-19`,
      start_date: `${curY}-${pad2(curM)}-18`,
      end_date: `${curY}-${pad2(curM)}-28`,
      days: 10,
      status: 'programada',
      notes: '1º período fracionado',
    },
  ];

  // Ajustes manuais dia a dia (ex: atestado no dia 10 do mês para testar déficit)
  const schedule_overrides_v2: ScheduleOverrideCell[] = [
    {
      employee_id: p('emp-01'),
      date_iso: `${curY}-${pad2(curM)}-10`,
      day: false,
      night: false,
      reason: 'Atestado médico',
    },
  ];

  const party_bookings: PartyRoomBooking[] = [
    {
      id: p('party-01'),
      client_id: clientId,
      space_name: 'Salão de Festas Principal',
      resident_name: 'Dra. Camila Vasconcelos',
      unit_label: 'Torre A • Apto 402',
      event_title: 'Aniversário Infantil',
      date_iso: `${curY}-${pad2(curM)}-08`,
      start_time: '13:00',
      end_time: '21:00',
      status: 'confirmada',
      guest_count: 45,
      fee_amount: 350,
    },
    {
      id: p('party-02'),
      client_id: clientId,
      space_name: 'Espaço Gourmet & Churrasqueira',
      resident_name: 'Rodrigo Albuquerque',
      unit_label: 'Torre B • Apto 1104',
      event_title: 'Confraternização Familiar',
      date_iso: `${curY}-${pad2(curM)}-15`,
      start_time: '11:30',
      end_time: '20:00',
      status: 'confirmada',
      guest_count: 25,
      fee_amount: 220,
    },
  ];

  const condo_documents: CondoDocument[] = [
    {
      id: p('cdoc-01'),
      client_id: clientId,
      category: 'condo_doc',
      title: 'Limpeza e Desinfecção das Caixas d’Água',
      provider_or_issuer: 'AcquaLimp Ambiental',
      document_number: 'LAUDO-CX-2026',
      issue_date: `${curY}-05-19`,
      expiry_date: `${curY}-${pad2(curM)}-19`,
      alert_days_before: 30,
      annual_or_monthly_value: 1850,
    },
    {
      id: p('cdoc-02'),
      client_id: clientId,
      category: 'condo_doc',
      title: 'Recarga de Extintores e Teste Hidrostático',
      provider_or_issuer: 'PrevFire Equipamentos',
      document_number: 'INMETRO-7721',
      issue_date: `${curY - 1}-${pad2(curM)}-25`,
      expiry_date: `${curY}-${pad2(curM)}-25`,
      alert_days_before: 30,
      annual_or_monthly_value: 3420,
    },
    {
      id: p('cnt-01'),
      client_id: clientId,
      category: 'contract',
      title: 'Manutenção Preventiva e Emergencial 24h de Elevadores',
      provider_or_issuer: 'Atlas Schindler S.A.',
      document_number: 'CTR-ELV-2024/119',
      issue_date: `${curY - 1}-11-30`,
      expiry_date: `${curY}-${pad2(curM)}-30`,
      alert_days_before: 45,
      annual_or_monthly_value: 3890,
    },
  ];

  // ===========================================================================
  // Árvore do Ficheiro Digital (Windows Explorer Style)
  // Inclui pasta raiz "Funcionários" com subpastas para todos (inclusive desligados)
  // ===========================================================================
  const file_explorer_items: ExplorerItem[] = [
    // Pastas Raiz
    {
      id: 'root-funcionarios',
      client_id: clientId,
      parent_id: null,
      name: 'Funcionários',
      type: 'folder',
      updated_at: `${curY}-01-10T10:00:00Z`,
      category: 'employee',
    },
    {
      id: 'root-laudos',
      client_id: clientId,
      parent_id: null,
      name: 'Laudos & Segurança Predial',
      type: 'folder',
      updated_at: `${curY}-02-15T14:30:00Z`,
      category: 'condo',
    },
    {
      id: 'root-contratos',
      client_id: clientId,
      parent_id: null,
      name: 'Contratos com Fornecedores',
      type: 'folder',
      updated_at: `${curY}-03-01T09:15:00Z`,
      category: 'contract',
    },
    {
      id: 'root-atas',
      client_id: clientId,
      parent_id: null,
      name: 'Atas & Assembleias',
      type: 'folder',
      updated_at: `${curY}-01-05T16:00:00Z`,
      category: 'general',
    },
    {
      id: 'root-financeiro',
      client_id: clientId,
      parent_id: null,
      name: 'Financeiro & Balancetes',
      type: 'folder',
      updated_at: `${curY}-10-01T11:20:00Z`,
      category: 'general',
    },

    // Arquivos em Laudos
    {
      id: 'file-laudo-avcb',
      client_id: clientId,
      parent_id: 'root-laudos',
      name: 'AVCB_Auto_Vistoria_Corpo_Bombeiros_2026.pdf',
      type: 'file',
      extension: 'pdf',
      size_bytes: 1420000,
      updated_at: `${curY - 1}-08-10T10:00:00Z`,
      category: 'condo',
      content_description: 'Auto de Vistoria do Corpo de Bombeiros Militar de SP',
      expiry_date: `${curY + 2}-08-10`,
    },
    {
      id: 'file-laudo-cx-agua',
      client_id: clientId,
      parent_id: 'root-laudos',
      name: 'Laudo_Potabilidade_Limpeza_Caixas_Agua.pdf',
      type: 'file',
      extension: 'pdf',
      size_bytes: 840000,
      updated_at: `${curY}-05-19T08:30:00Z`,
      category: 'condo',
      content_description: 'Laudo bacteriológico e certificado de higienização',
      expiry_date: `${curY}-${pad2(curM)}-19`,
    },
    {
      id: 'file-laudo-spda',
      client_id: clientId,
      parent_id: 'root-laudos',
      name: 'Laudo_Tecnico_SPDA_ParaRaios_NBR5419.pdf',
      type: 'file',
      extension: 'pdf',
      size_bytes: 2150000,
      updated_at: `${curY}-04-20T14:00:00Z`,
      category: 'condo',
      content_description: 'Laudo de inspeção do para-raios com ART quitada',
      expiry_date: `${curY + 1}-04-20`,
    },
    {
      id: 'file-laudo-extintores',
      client_id: clientId,
      parent_id: 'root-laudos',
      name: 'Certificado_Recarga_Extintores_INMETRO.pdf',
      type: 'file',
      extension: 'pdf',
      size_bytes: 620000,
      updated_at: `${curY - 1}-${pad2(curM)}-25T09:00:00Z`,
      category: 'condo',
      content_description: 'Certificado anual de recarga de extintores e mangueiras',
      expiry_date: `${curY}-${pad2(curM)}-25`,
    },

    // Arquivos em Contratos
    {
      id: 'file-ctr-elevadores',
      client_id: clientId,
      parent_id: 'root-contratos',
      name: 'Contrato_Manutencao_Elevadores_Schindler.pdf',
      type: 'file',
      extension: 'pdf',
      size_bytes: 1850000,
      updated_at: `${curY - 1}-11-30T10:00:00Z`,
      category: 'contract',
      content_description: 'Contrato de manutenção 24h preventiva e corretiva',
      expiry_date: `${curY}-${pad2(curM)}-30`,
    },
    {
      id: 'file-ctr-contabilidade',
      client_id: clientId,
      parent_id: 'root-contratos',
      name: 'Contrato_Prestacao_Servicos_Contabeis_DP.pdf',
      type: 'file',
      extension: 'pdf',
      size_bytes: 980000,
      updated_at: `${curY}-05-01T15:00:00Z`,
      category: 'contract',
      content_description: 'Contrato de departamento pessoal e folha eSocial',
    },
  ];

  // Subpasta para Colaboradores Desligados
  const exFolderId = 'folder-emp-desligados';
  file_explorer_items.push({
    id: exFolderId,
    client_id: clientId,
    parent_id: 'root-funcionarios',
    name: '00_Desligados & Inativos',
    type: 'folder',
    updated_at: `${curY}-01-15T08:00:00Z`,
    category: 'employee',
  });

  // Pastas de ex-funcionários com documentação rescisória
  const exEmps = [
    {
      name: 'Sebastião Ferreira Santos (Ex-Porteiro)',
      files: [
        'TRCT_Termo_Rescisao_Contrato.pdf',
        'ASO_Exame_Demissional.pdf',
        'Extrato_Quitacao_FGTS_Multa.pdf',
      ],
    },
    {
      name: 'Maria das Graças Silva (Ex-Limpeza)',
      files: [
        'TRCT_Termo_Homologado.pdf',
        'ASO_Exame_Demissional.pdf',
        'Comprovante_Entrega_CTPS.pdf',
      ],
    },
  ];

  exEmps.forEach((ex, idx) => {
    const folderId = `folder-ex-${idx + 1}`;
    file_explorer_items.push({
      id: folderId,
      client_id: clientId,
      parent_id: exFolderId,
      name: ex.name,
      type: 'folder',
      updated_at: `${curY - 1}-10-20T10:00:00Z`,
      category: 'employee',
    });
    ex.files.forEach((fName, fIdx) => {
      file_explorer_items.push({
        id: `file-ex-${idx + 1}-${fIdx + 1}`,
        client_id: clientId,
        parent_id: folderId,
        name: fName,
        type: 'file',
        extension: 'pdf',
        size_bytes: 420000 + fIdx * 110000,
        updated_at: `${curY - 1}-10-22T14:00:00Z`,
        category: 'employee',
      });
    });
  });

  // Pasta para cada um dos 10 funcionários ativos com seus respectivos documentos
  employees.forEach((emp) => {
    const empFolderId = `folder-emp-${emp.id}`;
    file_explorer_items.push({
      id: empFolderId,
      client_id: clientId,
      parent_id: 'root-funcionarios',
      name: `${emp.full_name} (${emp.registration_code})`,
      type: 'folder',
      updated_at: emp.admission_date,
      employee_id: emp.id,
      category: 'employee',
    });

    // Arquivos padrão do funcionário
    file_explorer_items.push(
      {
        id: `file-${emp.id}-aso-adm`,
        client_id: clientId,
        parent_id: empFolderId,
        name: `ASO_Admissional_${emp.full_name.replace(/\s+/g, '_')}.pdf`,
        type: 'file',
        extension: 'pdf',
        size_bytes: 285000,
        updated_at: emp.admission_date,
        employee_id: emp.id,
        category: 'employee',
        content_description: 'Atestado de Saúde Ocupacional Admissional',
      },
      {
        id: `file-${emp.id}-clt`,
        client_id: clientId,
        parent_id: empFolderId,
        name: `Contrato_Trabalho_CLT_${emp.registration_code}.pdf`,
        type: 'file',
        extension: 'pdf',
        size_bytes: 520000,
        updated_at: emp.admission_date,
        employee_id: emp.id,
        category: 'employee',
        content_description: 'Contrato Individual de Trabalho registrado no eSocial',
      },
      {
        id: `file-${emp.id}-aso-per`,
        client_id: clientId,
        parent_id: empFolderId,
        name: `ASO_Periodico_NR07_${curY}.pdf`,
        type: 'file',
        extension: 'pdf',
        size_bytes: 210000,
        updated_at: `${curY}-02-15`,
        employee_id: emp.id,
        category: 'employee',
        content_description: 'Exame Médico Periódico Obrigatório (NR-07)',
        expiry_date: `${curY + 1}-02-15`,
      },
      {
        id: `file-${emp.id}-brigada`,
        client_id: clientId,
        parent_id: empFolderId,
        name: `Certificado_Brigada_Incendio_NR23.pdf`,
        type: 'file',
        extension: 'pdf',
        size_bytes: 340000,
        updated_at: `${curY - 1}-${pad2(curM)}-20`,
        employee_id: emp.id,
        category: 'employee',
        content_description: 'Treinamento e Formação de Brigadista de Incêndio',
        expiry_date: `${curY}-${pad2(curM)}-20`,
      }
    );
  });

  return {
    config,
    employees,
    employee_documents,
    vacations,
    schedule_overrides_v2,
    schedule_validations: [],
    party_bookings,
    condo_documents,
    file_explorer_items,
  };
}
