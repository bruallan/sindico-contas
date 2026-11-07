import {
  CondoDocument,
  CondoHrBundle,
  CondoHrConfig,
  Employee,
  EmployeeDocument,
  EmployeeVacation,
  PartyRoomBooking,
  ScheduleOverride,
} from '@/types/hr';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function makeDateOffsetMonths(baseYear: number, baseMonth1: number, offsetMonths: number, day: number): string {
  const dt = new Date(baseYear, baseMonth1 - 1 + offsetMonths, 1);
  const y = dt.getFullYear();
  const m = dt.getMonth() + 1;
  const maxDay = new Date(y, m, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), maxDay);
  return `${y}-${pad2(m)}-${pad2(safeDay)}`;
}

function generateDeterministicCnpj(clientId: string): string {
  if (clientId === '5a7d7811-2946-4649-98be-ae9d4d426f1e' || clientId.endsWith('0001')) {
    return '18.492.310/0001-54';
  }
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash * 31 + clientId.charCodeAt(i)) % 89999999;
  }
  const num = String(10000000 + Math.abs(hash)).slice(0, 8);
  const check = String(10 + (Math.abs(hash) % 89));
  return `${num.slice(0, 2)}.${num.slice(2, 5)}.${num.slice(5, 8)}/0001-${check}`;
}

/**
 * Constrói um pacote completo e realista de dados fictícios para um condomínio:
 * - 10 colaboradores CLT contratados direto pelo CNPJ do condomínio
 * - Exames admissionais, periódicos (NR-07), certificados de Brigada de Incêndio (NR-23), NR-10, NR-35, Portaria/CFTV
 * - Férias em andamento, programadas e concluídas integradas à escala 24/7
 * - Alterações manuais de exemplo + alertas reais de desfalque na escala para inspeção imediata
 * - Reservas do salão de festas, documentos do condomínio (AVCB, Seguro, Caixa d'água, SPDA) e contratos
 */
export function buildInitialCondoHrBundle(
  clientId: string,
  condoName = 'Condomínio Residencial'
): CondoHrBundle {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1; // 1..12
  const p = (suffix: string) => `${clientId}-hr-${suffix}`;

  const config: CondoHrConfig = {
    client_id: clientId,
    enabled: true,
    cnpj: generateDeterministicCnpj(clientId),
    corporate_name: `${condoName} — Administração Direta`,
    min_day_staff: 2,
    min_night_staff: 2,
    updated_at: now.toISOString(),
  };

  // 10 Colaboradores Fictícios (Distribuídos para garantir cobertura 24/7 + Zeladoria e Limpeza)
  const employees: Employee[] = [
    {
      id: p('emp-01'),
      client_id: clientId,
      registration_code: 'CLT-001',
      full_name: 'Carlos Eduardo Mendes',
      role: 'Porteiro Diurno ( Líder Turma A )',
      role_category: 'portaria',
      cpf_masked: '***.418.920-14',
      admission_date: `${curY - 5}-03-12`,
      birth_date: `${curY - 41}-${pad2(curM)}-14`, // Aniversário no mês atual!
      phone: '(11) 98741-2210',
      schedule_pattern: '12x36_day_even',
      work_hours_label: '12x36 • 06:00 às 18:00',
      base_salary: 2680,
      status: 'ativo',
      emergency_contact: 'Márcia Mendes (Esposa) — (11) 98741-9901',
    },
    {
      id: p('emp-02'),
      client_id: clientId,
      registration_code: 'CLT-002',
      full_name: 'Juliana Ferreira Costa',
      role: 'Controladora de Acesso Diurna (Turma B)',
      role_category: 'portaria',
      cpf_masked: '***.732.104-58',
      admission_date: `${curY - 3}-07-05`,
      birth_date: makeDateOffsetMonths(curY - 32, curM, 1, 9), // Próximo mês
      phone: '(11) 99125-4830',
      schedule_pattern: '12x36_day_odd',
      work_hours_label: '12x36 • 06:00 às 18:00',
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
      birth_date: `${curY - 45}-${pad2(curM)}-26`, // Aniversário no mês atual!
      phone: '(11) 98410-7732',
      schedule_pattern: '12x36_night_even',
      work_hours_label: '12x36 • 18:00 às 06:00 (+ Adic. Noturno)',
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
      birth_date: makeDateOffsetMonths(curY - 36, curM, 2, 19),
      phone: '(11) 97654-8821',
      schedule_pattern: '12x36_night_odd',
      work_hours_label: '12x36 • 18:00 às 06:00 (+ Adic. Noturno)',
      base_salary: 2940,
      status: 'ferias', // Em gozo de férias na 2ª quinzena!
      emergency_contact: 'Renata Santana (Irmã) — (11) 97650-0044',
    },
    {
      id: p('emp-05'),
      client_id: clientId,
      registration_code: 'CLT-005',
      full_name: 'Fernando Gomes Ribeiro',
      role: 'Ronda & Segurança Interna Diurno (Turma A)',
      role_category: 'ronda',
      cpf_masked: '***.540.781-22',
      admission_date: `${curY - 4}-05-10`,
      birth_date: makeDateOffsetMonths(curY - 39, curM, -2, 11),
      phone: '(11) 98233-6019',
      schedule_pattern: '12x36_day_even',
      work_hours_label: '12x36 • 06:00 às 18:00',
      base_salary: 2520,
      status: 'ativo',
      emergency_contact: 'Simone Ribeiro (Esposa) — (11) 98230-1988',
    },
    {
      id: p('emp-06'),
      client_id: clientId,
      registration_code: 'CLT-006',
      full_name: 'José Augusto Almeida',
      role: 'Ronda & Segurança Interna Diurno (Turma B)',
      role_category: 'ronda',
      cpf_masked: '***.119.467-80',
      admission_date: `${curY - 5}-08-14`,
      birth_date: makeDateOffsetMonths(curY - 48, curM, -3, 22),
      phone: '(11) 99402-1570',
      schedule_pattern: '12x36_day_odd',
      work_hours_label: '12x36 • 06:00 às 18:00',
      base_salary: 2520,
      status: 'ativo',
      emergency_contact: 'Lucas Almeida (Filho) — (11) 99408-5511',
    },
    {
      id: p('emp-07'),
      client_id: clientId,
      registration_code: 'CLT-007',
      full_name: 'Ricardo Barbosa Lima',
      role: 'Vigia & Monitoramento Noturno (Turma A)',
      role_category: 'ronda',
      cpf_masked: '***.663.290-45',
      admission_date: `${curY - 3}-02-02`,
      birth_date: makeDateOffsetMonths(curY - 34, curM, 4, 12),
      phone: '(11) 98871-3409',
      schedule_pattern: '12x36_night_even',
      work_hours_label: '12x36 • 18:00 às 06:00 (+ Adic. Noturno)',
      base_salary: 2790,
      status: 'ativo',
      emergency_contact: 'Camila Lima (Esposa) — (11) 98870-9012',
    },
    {
      id: p('emp-08'),
      client_id: clientId,
      registration_code: 'CLT-008',
      full_name: 'Roberto Alves Nascimento',
      role: 'Vigia & Monitoramento Noturno (Turma B)',
      role_category: 'ronda',
      cpf_masked: '***.304.872-67',
      admission_date: `${curY - 2}-11-11`,
      birth_date: `${curY - 43}-${pad2(curM)}-21`, // Aniversário no mês atual!
      phone: '(11) 97190-4428',
      schedule_pattern: '12x36_night_odd',
      work_hours_label: '12x36 • 18:00 às 06:00 (+ Adic. Noturno)',
      base_salary: 2790,
      status: 'ativo',
      emergency_contact: 'Beatriz Nascimento (Esposa) — (11) 97195-2210',
    },
    {
      id: p('emp-09'),
      client_id: clientId,
      registration_code: 'CLT-009',
      full_name: 'Antônio Marcos Silva',
      role: 'Zelador Chefe & Cobertura Operacional',
      role_category: 'cobertura',
      cpf_masked: '***.951.603-11',
      admission_date: `${curY - 7}-02-04`,
      birth_date: `${curY - 50}-${pad2(curM)}-05`, // Aniversário no mês atual!
      phone: '(11) 99611-8045',
      schedule_pattern: 'commercial_mon_sat',
      work_hours_label: '44h Semanais • Seg–Sex 08h–17h / Sáb 08h–12h',
      base_salary: 3850,
      status: 'ativo',
      emergency_contact: 'Sônia Silva (Esposa) — (11) 99610-3321',
    },
    {
      id: p('emp-10'),
      client_id: clientId,
      registration_code: 'CLT-010',
      full_name: 'Cláudia Regina Oliveira',
      role: 'Auxiliar de Conservação e Limpeza',
      role_category: 'limpeza',
      cpf_masked: '***.472.519-93',
      admission_date: `${curY - 4}-06-15`,
      birth_date: makeDateOffsetMonths(curY - 37, curM, 5, 17),
      phone: '(11) 98520-6193',
      schedule_pattern: 'commercial_mon_sat',
      work_hours_label: '44h Semanais • Seg–Sex 07h–16h / Sáb 07h–11h',
      base_salary: 2180,
      status: 'ativo',
      emergency_contact: 'Pedro Oliveira (Marido) — (11) 98522-7740',
    },
  ];

  // Documentos dos 10 Colaboradores (Exames Admissionais, Periódicos NR-07, Brigada de Incêndio NR-23, NRs)
  const employee_documents: EmployeeDocument[] = [
    // 01 - Carlos Eduardo
    {
      id: p('doc-01-adm'),
      client_id: clientId,
      employee_id: p('emp-01'),
      doc_type: 'aso_admissional',
      title: 'ASO — Exame Médico Admissional',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: `${curY - 5}-03-10`,
      expiry_date: null,
      certificate_number: 'ASO-ADM-2021-0412',
    },
    {
      id: p('doc-01-per'),
      client_id: clientId,
      employee_id: p('emp-01'),
      doc_type: 'aso_periodico',
      title: 'ASO — Exame Médico Periódico (NR-07)',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: makeDateOffsetMonths(curY, curM, -8, 15),
      expiry_date: makeDateOffsetMonths(curY, curM, 4, 15),
      certificate_number: 'ASO-PER-8821',
    },
    {
      id: p('doc-01-bri'),
      client_id: clientId,
      employee_id: p('emp-01'),
      doc_type: 'brigada_incendio',
      title: 'Certificado de Brigada de Incêndio (NR-23 / IT-17)',
      issuer: 'PrevFire Treinamentos Credenciados CBM',
      issue_date: makeDateOffsetMonths(curY, curM, -11, 22),
      expiry_date: makeDateOffsetMonths(curY, curM, 0, 22), // Vence neste mês!
      certificate_number: 'BRIG-IT17-9041',
      notes: 'Líder de evacuação do Bloco A — agendar reciclagem anual.',
    },

    // 02 - Juliana Ferreira
    {
      id: p('doc-02-adm'),
      client_id: clientId,
      employee_id: p('emp-02'),
      doc_type: 'aso_admissional',
      title: 'ASO — Exame Médico Admissional',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: `${curY - 3}-07-03`,
      expiry_date: null,
      certificate_number: 'ASO-ADM-2023-1189',
    },
    {
      id: p('doc-02-per'),
      client_id: clientId,
      employee_id: p('emp-02'),
      doc_type: 'aso_periodico',
      title: 'ASO — Exame Médico Periódico (NR-07)',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: makeDateOffsetMonths(curY, curM, -5, 10),
      expiry_date: makeDateOffsetMonths(curY, curM, 7, 10),
      certificate_number: 'ASO-PER-9104',
    },
    {
      id: p('doc-02-bri'),
      client_id: clientId,
      employee_id: p('emp-02'),
      doc_type: 'brigada_incendio',
      title: 'Certificado de Brigada de Incêndio (NR-23 / IT-17)',
      issuer: 'PrevFire Treinamentos Credenciados CBM',
      issue_date: makeDateOffsetMonths(curY, curM, -6, 14),
      expiry_date: makeDateOffsetMonths(curY, curM, 6, 14),
      certificate_number: 'BRIG-IT17-9410',
    },
    {
      id: p('doc-02-cftv'),
      client_id: clientId,
      employee_id: p('emp-02'),
      doc_type: 'portaria_cftv',
      title: 'Certificado Controle de Acesso Digital e CFTV',
      issuer: 'Instituto Condominial SP',
      issue_date: makeDateOffsetMonths(curY, curM, -10, 5),
      expiry_date: makeDateOffsetMonths(curY, curM, 14, 5),
      certificate_number: 'CFTV-2025-332',
    },

    // 03 - Marcos Vinícius (Com Exame Periódico Vencido para demonstração de alerta!)
    {
      id: p('doc-03-adm'),
      client_id: clientId,
      employee_id: p('emp-03'),
      doc_type: 'aso_admissional',
      title: 'ASO — Exame Médico Admissional',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: `${curY - 6}-01-15`,
      expiry_date: null,
      certificate_number: 'ASO-ADM-2020-0084',
    },
    {
      id: p('doc-03-per'),
      client_id: clientId,
      employee_id: p('emp-03'),
      doc_type: 'aso_periodico',
      title: 'ASO — Exame Médico Periódico (NR-07)',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: makeDateOffsetMonths(curY, curM, -12, 2),
      expiry_date: makeDateOffsetMonths(curY, curM, 0, 2), // Vencido no dia 02 do mês atual!
      certificate_number: 'ASO-PER-7740',
      notes: 'Convocação clínica enviada — aguardando comparecimento.',
    },
    {
      id: p('doc-03-bri'),
      client_id: clientId,
      employee_id: p('emp-03'),
      doc_type: 'brigada_incendio',
      title: 'Certificado de Brigada de Incêndio (NR-23 / IT-17)',
      issuer: 'PrevFire Treinamentos Credenciados CBM',
      issue_date: makeDateOffsetMonths(curY, curM, -7, 18),
      expiry_date: makeDateOffsetMonths(curY, curM, 5, 18),
      certificate_number: 'BRIG-IT17-9288',
    },

    // 04 - Paulo Henrique
    {
      id: p('doc-04-adm'),
      client_id: clientId,
      employee_id: p('emp-04'),
      doc_type: 'aso_admissional',
      title: 'ASO — Exame Médico Admissional',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: `${curY - 3}-09-18`,
      expiry_date: null,
      certificate_number: 'ASO-ADM-2023-1490',
    },
    {
      id: p('doc-04-per'),
      client_id: clientId,
      employee_id: p('emp-04'),
      doc_type: 'aso_periodico',
      title: 'ASO — Exame Médico Periódico (NR-07)',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: makeDateOffsetMonths(curY, curM, -2, 19),
      expiry_date: makeDateOffsetMonths(curY, curM, 10, 19),
      certificate_number: 'ASO-PER-9612',
    },
    {
      id: p('doc-04-bri'),
      client_id: clientId,
      employee_id: p('emp-04'),
      doc_type: 'brigada_incendio',
      title: 'Certificado de Brigada de Incêndio (NR-23 / IT-17)',
      issuer: 'PrevFire Treinamentos Credenciados CBM',
      issue_date: makeDateOffsetMonths(curY, curM, -4, 10),
      expiry_date: makeDateOffsetMonths(curY, curM, 8, 10),
      certificate_number: 'BRIG-IT17-9502',
    },

    // 05 - Fernando Gomes (Certificado de Incêndio Vencido para demonstrar alerta crítico!)
    {
      id: p('doc-05-adm'),
      client_id: clientId,
      employee_id: p('emp-05'),
      doc_type: 'aso_admissional',
      title: 'ASO — Exame Médico Admissional',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: `${curY - 4}-05-08`,
      expiry_date: null,
      certificate_number: 'ASO-ADM-2022-0611',
    },
    {
      id: p('doc-05-per'),
      client_id: clientId,
      employee_id: p('emp-05'),
      doc_type: 'aso_periodico',
      title: 'ASO — Exame Médico Periódico (NR-07)',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: makeDateOffsetMonths(curY, curM, -6, 12),
      expiry_date: makeDateOffsetMonths(curY, curM, 6, 12),
      certificate_number: 'ASO-PER-9301',
    },
    {
      id: p('doc-05-bri'),
      client_id: clientId,
      employee_id: p('emp-05'),
      doc_type: 'brigada_incendio',
      title: 'Certificado de Brigada de Incêndio (NR-23 / IT-17)',
      issuer: 'PrevFire Treinamentos Credenciados CBM',
      issue_date: makeDateOffsetMonths(curY, curM, -13, 25),
      expiry_date: makeDateOffsetMonths(curY, curM, -1, 25), // Vencido no mês passado!
      certificate_number: 'BRIG-IT17-8412',
      notes: 'Reciclagem obrigatória pendente junto ao Corpo de Bombeiros.',
    },

    // 06 - José Augusto
    {
      id: p('doc-06-adm'),
      client_id: clientId,
      employee_id: p('emp-06'),
      doc_type: 'aso_admissional',
      title: 'ASO — Exame Médico Admissional',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: `${curY - 5}-08-12`,
      expiry_date: null,
      certificate_number: 'ASO-ADM-2021-0899',
    },
    {
      id: p('doc-06-per'),
      client_id: clientId,
      employee_id: p('emp-06'),
      doc_type: 'aso_periodico',
      title: 'ASO — Exame Médico Periódico (NR-07)',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: makeDateOffsetMonths(curY, curM, -11, 28),
      expiry_date: makeDateOffsetMonths(curY, curM, 0, 28), // Vence no fim deste mês!
      certificate_number: 'ASO-PER-8910',
    },
    {
      id: p('doc-06-bri'),
      client_id: clientId,
      employee_id: p('emp-06'),
      doc_type: 'brigada_incendio',
      title: 'Certificado de Brigada de Incêndio (NR-23 / IT-17)',
      issuer: 'PrevFire Treinamentos Credenciados CBM',
      issue_date: makeDateOffsetMonths(curY, curM, -5, 20),
      expiry_date: makeDateOffsetMonths(curY, curM, 7, 20),
      certificate_number: 'BRIG-IT17-9480',
    },

    // 07 - Ricardo Barbosa
    {
      id: p('doc-07-adm'),
      client_id: clientId,
      employee_id: p('emp-07'),
      doc_type: 'aso_admissional',
      title: 'ASO — Exame Médico Admissional',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: `${curY - 3}-01-30`,
      expiry_date: null,
      certificate_number: 'ASO-ADM-2023-0102',
    },
    {
      id: p('doc-07-per'),
      client_id: clientId,
      employee_id: p('emp-07'),
      doc_type: 'aso_periodico',
      title: 'ASO — Exame Médico Periódico (NR-07)',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: makeDateOffsetMonths(curY, curM, -9, 8),
      expiry_date: makeDateOffsetMonths(curY, curM, 3, 8),
      certificate_number: 'ASO-PER-9045',
    },
    {
      id: p('doc-07-bri'),
      client_id: clientId,
      employee_id: p('emp-07'),
      doc_type: 'brigada_incendio',
      title: 'Certificado de Brigada de Incêndio (NR-23 / IT-17)',
      issuer: 'PrevFire Treinamentos Credenciados CBM',
      issue_date: makeDateOffsetMonths(curY, curM, -9, 15),
      expiry_date: makeDateOffsetMonths(curY, curM, 3, 15),
      certificate_number: 'BRIG-IT17-9115',
    },

    // 08 - Roberto Alves
    {
      id: p('doc-08-adm'),
      client_id: clientId,
      employee_id: p('emp-08'),
      doc_type: 'aso_admissional',
      title: 'ASO — Exame Médico Admissional',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: `${curY - 2}-11-09`,
      expiry_date: null,
      certificate_number: 'ASO-ADM-2024-1102',
    },
    {
      id: p('doc-08-per'),
      client_id: clientId,
      employee_id: p('emp-08'),
      doc_type: 'aso_periodico',
      title: 'ASO — Exame Médico Periódico (NR-07)',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: makeDateOffsetMonths(curY, curM, -11, 18),
      expiry_date: makeDateOffsetMonths(curY, curM, 0, 18), // Vence neste mês!
      certificate_number: 'ASO-PER-8995',
    },
    {
      id: p('doc-08-bri'),
      client_id: clientId,
      employee_id: p('emp-08'),
      doc_type: 'brigada_incendio',
      title: 'Certificado de Brigada de Incêndio (NR-23 / IT-17)',
      issuer: 'PrevFire Treinamentos Credenciados CBM',
      issue_date: makeDateOffsetMonths(curY, curM, -3, 12),
      expiry_date: makeDateOffsetMonths(curY, curM, 9, 12),
      certificate_number: 'BRIG-IT17-9677',
    },

    // 09 - Antônio Marcos (Zelador Chefe: Admissional, Periódico, Brigada Chefe, NR-10 e NR-35)
    {
      id: p('doc-09-adm'),
      client_id: clientId,
      employee_id: p('emp-09'),
      doc_type: 'aso_admissional',
      title: 'ASO — Exame Médico Admissional',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: `${curY - 7}-02-01`,
      expiry_date: null,
      certificate_number: 'ASO-ADM-2019-0039',
    },
    {
      id: p('doc-09-per'),
      client_id: clientId,
      employee_id: p('emp-09'),
      doc_type: 'aso_periodico',
      title: 'ASO — Exame Médico Periódico (NR-07)',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: makeDateOffsetMonths(curY, curM, -4, 4),
      expiry_date: makeDateOffsetMonths(curY, curM, 8, 4),
      certificate_number: 'ASO-PER-9508',
    },
    {
      id: p('doc-09-bri'),
      client_id: clientId,
      employee_id: p('emp-09'),
      doc_type: 'brigada_incendio',
      title: 'Certificado Chefe de Brigada de Incêndio (NR-23)',
      issuer: 'PrevFire Treinamentos Credenciados CBM',
      issue_date: makeDateOffsetMonths(curY, curM, -4, 20),
      expiry_date: makeDateOffsetMonths(curY, curM, 8, 20),
      certificate_number: 'BRIG-CHEFE-9540',
    },
    {
      id: p('doc-09-nr10'),
      client_id: clientId,
      employee_id: p('emp-09'),
      doc_type: 'nr10',
      title: 'Certificado NR-10 — Segurança em Instalações Elétricas',
      issuer: 'SENAI Treinamentos',
      issue_date: makeDateOffsetMonths(curY, curM, -23, 16),
      expiry_date: makeDateOffsetMonths(curY, curM, 1, 16), // Vence no próximo mês
      certificate_number: 'NR10-SP-44821',
    },
    {
      id: p('doc-09-nr35'),
      client_id: clientId,
      employee_id: p('emp-09'),
      doc_type: 'nr35',
      title: 'Certificado NR-35 — Trabalho em Altura (Reservatórios/Telhado)',
      issuer: 'SENAI Treinamentos',
      issue_date: makeDateOffsetMonths(curY, curM, -14, 10),
      expiry_date: makeDateOffsetMonths(curY, curM, 10, 10),
      certificate_number: 'NR35-SP-51209',
    },

    // 10 - Cláudia Regina (Limpeza: Admissional, Periódico, Brigada e NR-06 EPIs)
    {
      id: p('doc-10-adm'),
      client_id: clientId,
      employee_id: p('emp-10'),
      doc_type: 'aso_admissional',
      title: 'ASO — Exame Médico Admissional',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: `${curY - 4}-06-13`,
      expiry_date: null,
      certificate_number: 'ASO-ADM-2022-0774',
    },
    {
      id: p('doc-10-per'),
      client_id: clientId,
      employee_id: p('emp-10'),
      doc_type: 'aso_periodico',
      title: 'ASO — Exame Médico Periódico (NR-07)',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: makeDateOffsetMonths(curY, curM, -5, 16),
      expiry_date: makeDateOffsetMonths(curY, curM, 7, 16),
      certificate_number: 'ASO-PER-9412',
    },
    {
      id: p('doc-10-epi'),
      client_id: clientId,
      employee_id: p('emp-10'),
      doc_type: 'epi_nr06',
      title: 'Treinamento NR-06 — EPIs e Manuseio de Saneantes',
      issuer: 'VidaMed Saúde Ocupacional',
      issue_date: makeDateOffsetMonths(curY, curM, -5, 18),
      expiry_date: makeDateOffsetMonths(curY, curM, 7, 18),
      certificate_number: 'NR06-2026-118',
    },
  ];

  // Controle de Férias
  const vacStartThisMonth = `${curY}-${pad2(curM)}-20`;
  const maxDayThisMonth = new Date(curY, curM, 0).getDate();
  const vacEndThisMonth = `${curY}-${pad2(curM)}-${pad2(maxDayThisMonth)}`;
  const daysThisMonthVac = maxDayThisMonth - 20 + 1;

  const vacations: EmployeeVacation[] = [
    {
      id: p('vac-01'),
      client_id: clientId,
      employee_id: p('emp-04'), // Paulo Henrique Santana (Porteiro Noturno Turma B) -> impacta a escala deste mês!
      acquisitive_start: `${curY - 2}-09-20`,
      acquisitive_end: `${curY - 1}-09-19`,
      concessive_limit: `${curY}-12-19`,
      start_date: vacStartThisMonth,
      end_date: vacEndThisMonth,
      days: daysThisMonthVac,
      status: 'em_andamento',
      cover_employee_id: p('emp-03'),
      notes: '1º período fracionado CLT — últimas 2 noites ímpares ainda aguardam confirmação de cobertura na escala.',
    },
    {
      id: p('vac-02'),
      client_id: clientId,
      employee_id: p('emp-02'), // Juliana Ferreira -> férias programadas para o próximo mês
      acquisitive_start: `${curY - 2}-07-05`,
      acquisitive_end: `${curY - 1}-07-04`,
      concessive_limit: makeDateOffsetMonths(curY, curM, 2, 4),
      start_date: makeDateOffsetMonths(curY, curM, 1, 5),
      end_date: makeDateOffsetMonths(curY, curM, 1, 24),
      days: 20,
      status: 'programada',
      cover_employee_id: p('emp-09'),
      notes: 'Férias programadas com abono pecuniário de 10 dias.',
    },
    {
      id: p('vac-03'),
      client_id: clientId,
      employee_id: p('emp-09'), // Antônio Marcos -> férias programadas para daqui a 2 meses
      acquisitive_start: `${curY - 2}-02-04`,
      acquisitive_end: `${curY - 1}-02-03`,
      concessive_limit: makeDateOffsetMonths(curY, curM, 3, 3),
      start_date: makeDateOffsetMonths(curY, curM, 2, 10),
      end_date: makeDateOffsetMonths(curY, curM, 2, 24),
      days: 15,
      status: 'programada',
      notes: 'Zeladoria será acompanhada pelo sub-síndico e apoio diurno.',
    },
    {
      id: p('vac-04'),
      client_id: clientId,
      employee_id: p('emp-10'), // Cláudia Regina -> férias concluídas há 3 meses
      acquisitive_start: `${curY - 2}-06-15`,
      acquisitive_end: `${curY - 1}-06-14`,
      concessive_limit: `${curY}-05-14`,
      start_date: makeDateOffsetMonths(curY, curM, -3, 1),
      end_date: makeDateOffsetMonths(curY, curM, -3, 30),
      days: 30,
      status: 'concluida',
      notes: 'Período integral quitado e arquivado no eSocial.',
    },
  ];

  // Monta overrides realistas no mês atual:
  // 1) Dia 12: o porteiro diurno escalado nesse dia apresenta Atestado (AT) -> gera 1 alerta de desfalque Diurno!
  // 2) Do dia 20 ao fim do mês (férias do Paulo Henrique, `12x36_night_odd`):
  //    Cobrimos as primeiras noites ímpares com Marcos Vinícius (CN), mas deixamos as últimas 2 noites ímpares descobertas -> gera 2 alertas de desfalque Noturno!
  const schedule_overrides: ScheduleOverride[] = [];

  const day12ISO = `${curY}-${pad2(curM)}-12`;
  const isDay12Even = Math.floor(Date.UTC(curY, curM - 1, 12) / 86_400_000) % 2 === 0;
  schedule_overrides.push({
    id: p('ov-atestado-12'),
    client_id: clientId,
    employee_id: isDay12Even ? p('emp-01') : p('emp-02'),
    date_iso: day12ISO,
    shift_code: 'AT',
    reason: 'Atestado médico odontológico — posto aguardando substituto',
    updated_at: now.toISOString(),
  });

  // Identifica os dias de plantão que Paulo Henrique (`12x36_night_odd`, ou seja `!isEvenEpoch`) teria entre dia 20 e fim do mês
  const pauloDutyDatesInVac: string[] = [];
  for (let d = 20; d <= maxDayThisMonth; d++) {
    const isEven = Math.floor(Date.UTC(curY, curM - 1, d) / 86_400_000) % 2 === 0;
    if (!isEven) {
      pauloDutyDatesInVac.push(`${curY}-${pad2(curM)}-${pad2(d)}`);
    }
  }

  // Cobre os primeiros plantões com Marcos Vinícius (`emp-03`, que está de folga nesses dias!), deixando os últimos 2 em aberto para demonstrar o sinalizador de desfalque!
  const coveredSlice = pauloDutyDatesInVac.slice(0, Math.max(0, pauloDutyDatesInVac.length - 2));
  for (const dtISO of coveredSlice) {
    schedule_overrides.push({
      id: p(`ov-cov-${dtISO}`),
      client_id: clientId,
      employee_id: p('emp-03'),
      date_iso: dtISO,
      shift_code: 'CN',
      reason: 'Cobertura programada das férias de Paulo Henrique',
      updated_at: now.toISOString(),
    });
  }

  // Reservas do Salão de Festas e Churrasqueira Gourmet
  const party_bookings: PartyRoomBooking[] = [
    {
      id: p('party-01'),
      client_id: clientId,
      space_name: 'Salão de Festas Principal',
      resident_name: 'Dra. Camila Vasconcelos',
      unit_label: 'Torre A • Apto 402',
      event_title: 'Aniversário Infantil (8 anos)',
      date_iso: `${curY}-${pad2(curM)}-08`,
      start_time: '13:00',
      end_time: '21:00',
      status: 'confirmada',
      guest_count: 45,
      fee_amount: 350,
      notes: 'Lista de convidados entregue na portaria.',
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
    {
      id: p('party-03'),
      client_id: clientId,
      space_name: 'Salão de Festas Principal',
      resident_name: 'Fernanda & Thiago Moreira',
      unit_label: 'Torre A • Apto 901',
      event_title: 'Jantar de Noivado',
      date_iso: `${curY}-${pad2(curM)}-21`,
      start_time: '18:00',
      end_time: '23:30',
      status: 'confirmada',
      guest_count: 60,
      fee_amount: 350,
      notes: 'Solicitado reforço na conferência da portaria às 18h.',
    },
    {
      id: p('party-04'),
      client_id: clientId,
      space_name: 'Salão de Festas Principal',
      resident_name: 'Marcelo Tavares',
      unit_label: 'Torre B • Apto 203',
      event_title: 'Chá Revelação',
      date_iso: `${curY}-${pad2(curM)}-28`,
      start_time: '14:00',
      end_time: '20:00',
      status: 'pendente_taxa',
      guest_count: 40,
      fee_amount: 350,
      notes: 'Aguardando compensação do boleto da taxa de limpeza.',
    },
    {
      id: p('party-05'),
      client_id: clientId,
      space_name: 'Espaço Gourmet & Churrasqueira',
      resident_name: 'Patrícia Nogueira',
      unit_label: 'Torre A • Apto 604',
      event_title: 'Almoço de Domingo',
      date_iso: makeDateOffsetMonths(curY, curM, 1, 6),
      start_time: '12:00',
      end_time: '19:00',
      status: 'confirmada',
      guest_count: 20,
      fee_amount: 220,
    },
    {
      id: p('party-06'),
      client_id: clientId,
      space_name: 'Salão de Festas Principal',
      resident_name: ' Gustavo Peixoto',
      unit_label: 'Torre B • Cobertura 1401',
      event_title: 'Confraternização de Fim de Ano',
      date_iso: makeDateOffsetMonths(curY, curM, 1, 19),
      start_time: '17:00',
      end_time: '23:30',
      status: 'confirmada',
      guest_count: 55,
      fee_amount: 350,
    },
  ];

  // Documentos Obrigatórios do Condomínio & Contratos com Fornecedores
  const condo_documents: CondoDocument[] = [
    // Documentos do Condomínio (condo_doc)
    {
      id: p('cdoc-01'),
      client_id: clientId,
      category: 'condo_doc',
      title: 'Limpeza e Desinfecção Bacteriológica das Caixas d’Água',
      provider_or_issuer: 'AcquaLimp Ambiental (Vigilância Sanitária)',
      document_number: 'LAUDO-CX-2026/05',
      issue_date: makeDateOffsetMonths(curY, curM, -6, 19),
      expiry_date: `${curY}-${pad2(curM)}-19`, // Vence neste mês!
      alert_days_before: 30,
      annual_or_monthly_value: 1850,
      notes: 'Obrigatório semestralmente — agendar desligamento de registros por torre.',
    },
    {
      id: p('cdoc-02'),
      client_id: clientId,
      category: 'condo_doc',
      title: 'Recarga Anual de Extintores e Teste Hidrostático de Mangueiras',
      provider_or_issuer: 'PrevFire Equipamentos contra Incêndio',
      document_number: 'INMETRO-EXT-7721',
      issue_date: makeDateOffsetMonths(curY, curM, -11, 25),
      expiry_date: `${curY}-${pad2(curM)}-25`, // Vence neste mês!
      alert_days_before: 30,
      annual_or_monthly_value: 3420,
      notes: '48 extintores e 24 mangueiras — vistoria conjunta com o Zelador Chefe.',
    },
    {
      id: p('cdoc-03'),
      client_id: clientId,
      category: 'condo_doc',
      title: 'AVCB — Auto de Vistoria do Corpo de Bombeiros',
      provider_or_issuer: 'Corpo de Bombeiros Militar',
      document_number: 'AVCB-884920-SP',
      issue_date: makeDateOffsetMonths(curY, curM, -22, 10),
      expiry_date: makeDateOffsetMonths(curY, curM, 14, 10),
      alert_days_before: 60,
      annual_or_monthly_value: null,
      notes: 'Validade de 3 anos — depende da brigada de incêndio e laudo elétrico em dia.',
    },
    {
      id: p('cdoc-04'),
      client_id: clientId,
      category: 'condo_doc',
      title: 'Apólice de Seguro Condominial Obrigatório (Código Civil Art. 1.346)',
      provider_or_issuer: 'Porto Seguro Cia de Seguros Gerais',
      document_number: 'APOL-0194.2026.883',
      issue_date: makeDateOffsetMonths(curY, curM, -11, 12),
      expiry_date: makeDateOffsetMonths(curY, curM, 1, 12), // Vence no próximo mês
      alert_days_before: 45,
      annual_or_monthly_value: 9800,
      notes: 'Cotar renovação com 3 seguradoras 30 dias antes do vencimento.',
    },
    {
      id: p('cdoc-05'),
      client_id: clientId,
      category: 'condo_doc',
      title: 'Laudo Técnico de Inspeção do SPDA (Para-raios — NBR 5419)',
      provider_or_issuer: 'EngVolt Engenharia Elétrica (CREA/ART)',
      document_number: 'ART-280049182',
      issue_date: makeDateOffsetMonths(curY, curM, -8, 20),
      expiry_date: makeDateOffsetMonths(curY, curM, 4, 20),
      alert_days_before: 30,
      annual_or_monthly_value: 1600,
    },
    {
      id: p('cdoc-06'),
      client_id: clientId,
      category: 'condo_doc',
      title: 'Certificado Digital e-CNPJ A1 (Transmissão Folha / eSocial)',
      provider_or_issuer: 'Certisign Autoridade Certificadora',
      document_number: 'ECNPJ-A1-9920',
      issue_date: makeDateOffsetMonths(curY, curM, -12, 3),
      expiry_date: `${curY}-${pad2(curM)}-03`, // Vencido no início do mês para demonstrar filtro de urgência!
      alert_days_before: 30,
      annual_or_monthly_value: 260,
      notes: 'Essencial para fechamento da folha dos 10 funcionários próprios no eSocial.',
    },

    // Contratos com Fornecedores (contract)
    {
      id: p('cnt-01'),
      client_id: clientId,
      category: 'contract',
      title: 'Contrato de Manutenção Preventiva e Emergencial 24h de Elevadores',
      provider_or_issuer: 'Atlas Schindler Elevadores S.A.',
      document_number: 'CTR-ELV-2024/119',
      issue_date: makeDateOffsetMonths(curY, curM, -11, 30),
      expiry_date: `${curY}-${pad2(curM)}-${pad2(Math.min(29, maxDayThisMonth))}`, // Vence no fim deste mês!
      alert_days_before: 45,
      annual_or_monthly_value: 3890,
      notes: 'Cláusula de reajuste IPCA — avaliar índice antes da renovação automática.',
    },
    {
      id: p('cnt-02'),
      client_id: clientId,
      category: 'contract',
      title: 'Contrato de Locação e Manutenção de CFTV, Portões e Clausura',
      provider_or_issuer: 'SegurMax Tecnologia Condominial',
      document_number: 'CTR-SEG-882/25',
      issue_date: makeDateOffsetMonths(curY, curM, -10, 15),
      expiry_date: makeDateOffsetMonths(curY, curM, 2, 15),
      alert_days_before: 30,
      annual_or_monthly_value: 1490,
    },
    {
      id: p('cnt-03'),
      client_id: clientId,
      category: 'contract',
      title: 'Contrato de Assessoria Contábil, DP e Folha de Pagamento (CNPJ)',
      provider_or_issuer: 'ContabCondo Gestão Contábil Ltda.',
      document_number: 'CTR-DP-401/25',
      issue_date: makeDateOffsetMonths(curY, curM, -7, 5),
      expiry_date: makeDateOffsetMonths(curY, curM, 5, 5),
      alert_days_before: 30,
      annual_or_monthly_value: 2150,
    },
    {
      id: p('cnt-04'),
      client_id: clientId,
      category: 'contract',
      title: 'Contrato de Medicina Ocupacional — Gestão PCMSO, PGR e LTCAT',
      provider_or_issuer: 'VidaMed Saúde Ocupacional Ltda.',
      document_number: 'CTR-SST-2026/09',
      issue_date: makeDateOffsetMonths(curY, curM, -11, 10),
      expiry_date: makeDateOffsetMonths(curY, curM, 1, 10), // Vence no próximo mês
      alert_days_before: 30,
      annual_or_monthly_value: 680,
      notes: 'Cobre todos os exames periódicos e admissionais dos 10 colaboradores CLT.',
    },
    {
      id: p('cnt-05'),
      client_id: clientId,
      category: 'contract',
      title: 'Contrato de Conservação de Bombas de Recalque e Pressurizadores',
      provider_or_issuer: 'HidroTech Sistemas Hidráulicos',
      document_number: 'CTR-HID-312/26',
      issue_date: makeDateOffsetMonths(curY, curM, -5, 22),
      expiry_date: makeDateOffsetMonths(curY, curM, 7, 22),
      alert_days_before: 30,
      annual_or_monthly_value: 790,
    },
  ];

  return {
    config,
    employees,
    employee_documents,
    vacations,
    schedule_overrides,
    schedule_validations: [],
    party_bookings,
    condo_documents,
  };
}
