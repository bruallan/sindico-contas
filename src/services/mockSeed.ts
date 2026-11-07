import { AccountCategory, Client, Transaction } from '@/types/database';
import { formatCurrencyBRL, formatDateBR, getRelativeYearMonth } from '@/utils/formatters';

export interface LocalAuthAccount {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'syndic';
}

export interface LocalDatabaseSchema {
  users: LocalAuthAccount[];
  clients: Client[];
  account_categories: AccountCategory[];
  transactions: Transaction[];
}

/**
 * Gera um comprovante digital vetorial minimalista (SVG Data URI) para inspeção realista no modal.
 */
export function buildDigitalReceiptDataUri(params: {
  protocol: string;
  condoName: string;
  counterparty: string;
  categoryName: string;
  amount: number;
  dateISO: string;
  type: 'income' | 'expense';
}): string {
  const accent = params.type === 'income' ? '#2AC38B' : '#EF4444';
  const badgeText = params.type === 'income' ? 'COMPROVANTE DE RECEBIMENTO' : 'COMPROVANTE DE PAGAMENTO';
  const formattedVal = formatCurrencyBRL(params.amount);
  const formattedDate = formatDateBR(params.dateISO);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="340" viewBox="0 0 520 340">
    <rect width="520" height="340" rx="12" fill="#FFFFFF"/>
    <rect x="1" y="1" width="518" height="338" rx="11" fill="none" stroke="#E6EAED" stroke-width="2"/>
    <rect x="0" y="0" width="520" height="6" rx="3" fill="${accent}"/>
    <text x="28" y="40" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700" fill="${accent}" letter-spacing="1">${badgeText}</text>
    <text x="492" y="40" text-anchor="end" font-family="monospace" font-size="11" fill="#64748B">#${params.protocol}</text>
    <line x1="28" y1="56" x2="492" y2="56" stroke="#E6EAED" stroke-width="1"/>
    <text x="28" y="86" font-family="Inter, Arial, sans-serif" font-size="11" fill="#64748B">VALOR EFETIVADO</text>
    <text x="28" y="116" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700" fill="#0E1B2B">${formattedVal}</text>
    <text x="340" y="86" font-family="Inter, Arial, sans-serif" font-size="11" fill="#64748B">DATA DE LIQUIDAÇÃO</text>
    <text x="340" y="110" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="600" fill="#0E1B2B">${formattedDate}</text>
    <rect x="28" y="140" width="464" height="132" rx="8" fill="#F8FAFC" stroke="#E6EAED"/>
    <text x="44" y="166" font-family="Inter, Arial, sans-serif" font-size="10" fill="#64748B">CONDOMÍNIO TITULAR</text>
    <text x="44" y="184" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="600" fill="#0E1B2B">${params.condoName}</text>
    <text x="44" y="212" font-family="Inter, Arial, sans-serif" font-size="10" fill="#64748B">FAVORECIDO / PAGADOR</text>
    <text x="44" y="230" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="600" fill="#0E1B2B">${params.counterparty}</text>
    <text x="310" y="212" font-family="Inter, Arial, sans-serif" font-size="10" fill="#64748B">CLASSIFICAÇÃO</text>
    <text x="310" y="230" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="500" fill="#0E1B2B">${params.categoryName}</text>
    <text x="28" y="304" font-family="monospace" font-size="10" fill="#94A3B8">AUTENTICAÇÃO BANCÁRIA: E94A.${params.protocol}.881C.2026-BR</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Cria o Plano de Contas Hierárquico padrão para qualquer novo condomínio cadastrado.
 */
export function createDefaultCategoriesForClient(clientId: string): AccountCategory[] {
  const p = (suffix: string) => `${clientId}-cat-${suffix}`;

  return [
    // ENTRADAS — Grupos Pais (Nível 1)
    { id: p('inc-1'), client_id: clientId, name: '1.1 Receitas Ordinárias', type: 'income', parent_id: null },
    { id: p('inc-2'), client_id: clientId, name: '1.2 Receitas Extraordinárias', type: 'income', parent_id: null },
    { id: p('inc-3'), client_id: clientId, name: '1.3 Receitas Financeiras', type: 'income', parent_id: null },

    // ENTRADAS — Contas Analíticas (Nível 2)
    { id: p('inc-1-1'), client_id: clientId, name: 'Taxa Condominial Ordinária', type: 'income', parent_id: p('inc-1') },
    { id: p('inc-1-2'), client_id: clientId, name: 'Rateio de Água e Gás', type: 'income', parent_id: p('inc-1') },
    { id: p('inc-1-3'), client_id: clientId, name: 'Recuperação de Inadimplência', type: 'income', parent_id: p('inc-1') },
    { id: p('inc-2-1'), client_id: clientId, name: 'Fundo de Reserva', type: 'income', parent_id: p('inc-2') },
    { id: p('inc-2-2'), client_id: clientId, name: 'Taxa Extra de Benfeitorias', type: 'income', parent_id: p('inc-2') },
    { id: p('inc-2-3'), client_id: clientId, name: 'Locação de Salão de Festas', type: 'income', parent_id: p('inc-2') },
    { id: p('inc-3-1'), client_id: clientId, name: 'Rendimento Aplicação CDB', type: 'income', parent_id: p('inc-3') },
    { id: p('inc-3-2'), client_id: clientId, name: 'Multas e Juros Recebidos', type: 'income', parent_id: p('inc-3') },

    // SAÍDAS — Grupos Pais (Nível 1)
    { id: p('exp-1'), client_id: clientId, name: '2.1 Pessoal e Encargos', type: 'expense', parent_id: null },
    { id: p('exp-2'), client_id: clientId, name: '2.2 Concessionárias e Consumo', type: 'expense', parent_id: null },
    { id: p('exp-3'), client_id: clientId, name: '2.3 Manutenção e Conservação', type: 'expense', parent_id: null },
    { id: p('exp-4'), client_id: clientId, name: '2.4 Despesas Administrativas', type: 'expense', parent_id: null },

    // SAÍDAS — Subgrupos (Nível 2 em 2.3 para demonstrar árvore multinível) + Contas Analíticas
    { id: p('exp-1-1'), client_id: clientId, name: 'Folha de Pagamento e Portaria', type: 'expense', parent_id: p('exp-1') },
    { id: p('exp-1-2'), client_id: clientId, name: 'Encargos Sociais (INSS / FGTS)', type: 'expense', parent_id: p('exp-1') },
    { id: p('exp-1-3'), client_id: clientId, name: 'Benefícios (VT / VA)', type: 'expense', parent_id: p('exp-1') },

    { id: p('exp-2-1'), client_id: clientId, name: 'Energia Elétrica Áreas Comuns', type: 'expense', parent_id: p('exp-2') },
    { id: p('exp-2-2'), client_id: clientId, name: 'Água e Saneamento Básico', type: 'expense', parent_id: p('exp-2') },
    { id: p('exp-2-3'), client_id: clientId, name: 'Gás Canalizado Coletivo', type: 'expense', parent_id: p('exp-2') },

    { id: p('exp-3-sub1'), client_id: clientId, name: '2.3.1 Sistemas Eletromecânicos', type: 'expense', parent_id: p('exp-3') },
    { id: p('exp-3-sub2'), client_id: clientId, name: '2.3.2 Conservação Predial', type: 'expense', parent_id: p('exp-3') },
    { id: p('exp-3-1'), client_id: clientId, name: 'Contrato Manutenção Elevadores', type: 'expense', parent_id: p('exp-3-sub1') },
    { id: p('exp-3-2'), client_id: clientId, name: 'Bombas, Portões e CFTV', type: 'expense', parent_id: p('exp-3-sub1') },
    { id: p('exp-3-3'), client_id: clientId, name: 'Insumos de Limpeza e Piscina', type: 'expense', parent_id: p('exp-3-sub2') },

    { id: p('exp-4-1'), client_id: clientId, name: 'Honorários Contábeis e Gestão', type: 'expense', parent_id: p('exp-4') },
    { id: p('exp-4-2'), client_id: clientId, name: 'Seguro Condominial Anual', type: 'expense', parent_id: p('exp-4') },
    { id: p('exp-4-3'), client_id: clientId, name: 'Tarifas Bancárias e Boletos', type: 'expense', parent_id: p('exp-4') },
  ];
}

export function buildInitialSeedDatabase(): LocalDatabaseSchema {
  const client1Id = 'c1000000-0000-4000-8000-000000000001';
  const client2Id = 'c1000000-0000-4000-8000-000000000002';
  const client3Id = 'c1000000-0000-4000-8000-000000000003';
  const client4Id = 'c1000000-0000-4000-8000-000000000004';
  const client5Id = 'c1000000-0000-4000-8000-000000000005';

  const futureInactMonth = getRelativeYearMonth(2);

  const users: LocalAuthAccount[] = [
    {
      id: 'u-admin-master',
      email: 'admin@sindicocontas.com.br',
      password: 'admin123',
      role: 'admin',
    },
    {
      id: 'u-admin-bruno',
      email: 'brunoallan004@gmail.com',
      password: 'admin123',
      role: 'admin',
    },
    {
      id: 'u-syndic-1',
      email: 'sindico@jardins.com.br',
      password: '123456',
      role: 'syndic',
    },
    {
      id: 'u-syndic-2',
      email: 'marina@residencialaurora.com.br',
      password: '123456',
      role: 'syndic',
    },
    {
      id: 'u-syndic-3',
      email: 'roberto@solarimperial.com.br',
      password: '123456',
      role: 'syndic',
    },
    {
      id: 'u-syndic-4',
      email: 'helena@villaverde.com.br',
      password: '123456',
      role: 'syndic',
    },
  ];

  const clients: Client[] = [
    {
      id: client1Id,
      condo_name: 'Edifício Jardins do Parque',
      syndic_name: 'Carlos Eduardo Mendes',
      syndic_email: 'sindico@jardins.com.br',
      user_id: 'u-syndic-1',
      status: 'active',
      scheduled_inactivation_date: null,
      created_at: '2026-01-10T10:00:00Z',
    },
    {
      id: client5Id,
      condo_name: 'Residencial Jardins das Palmeiras',
      syndic_name: 'Carlos Eduardo Mendes',
      syndic_email: 'sindico@jardins.com.br',
      user_id: 'u-syndic-1',
      status: 'active',
      scheduled_inactivation_date: null,
      created_at: '2026-01-15T11:00:00Z',
    },
    {
      id: client2Id,
      condo_name: 'Residencial Aurora Boreal',
      syndic_name: 'Marina Costa Alencar',
      syndic_email: 'marina@residencialaurora.com.br',
      user_id: 'u-syndic-2',
      status: 'active',
      scheduled_inactivation_date: null,
      created_at: '2026-02-14T14:20:00Z',
    },
    {
      id: client3Id,
      condo_name: 'Condomínio Solar Imperial',
      syndic_name: 'Roberto Almeida Neto',
      syndic_email: 'roberto@solarimperial.com.br',
      user_id: 'u-syndic-3',
      status: 'active',
      scheduled_inactivation_date: `${futureInactMonth}-28`,
      created_at: '2026-03-05T09:15:00Z',
    },
    {
      id: client4Id,
      condo_name: 'Parque Reserva Villa Verde',
      syndic_name: 'Helena Vasconcelos',
      syndic_email: 'helena@villaverde.com.br',
      user_id: 'u-syndic-4',
      status: 'inactive',
      scheduled_inactivation_date: null,
      created_at: '2026-04-19T16:45:00Z',
    },
  ];

  const account_categories: AccountCategory[] = [
    ...createDefaultCategoriesForClient(client1Id),
    ...createDefaultCategoriesForClient(client5Id),
    ...createDefaultCategoriesForClient(client2Id),
    ...createDefaultCategoriesForClient(client3Id),
    ...createDefaultCategoriesForClient(client4Id),
  ];

  // Meses dinâmicos ancorados ao mês atual (-3, -2, -1, 0, +1, +2)
  const mNeg3 = getRelativeYearMonth(-3);
  const mNeg2 = getRelativeYearMonth(-2);
  const mNeg1 = getRelativeYearMonth(-1);
  const mCur = getRelativeYearMonth(0);
  const mPos1 = getRelativeYearMonth(1);
  const mPos2 = getRelativeYearMonth(2);

  const c1 = (suffix: string) => `${client1Id}-cat-${suffix}`;
  const condoName = 'Edifício Jardins do Parque';

  const rawTx: Omit<Transaction, 'id' | 'created_at' | 'receipt_url'>[] = [
    // Mês -3 (Efetivado — superávit)
    { client_id: client1Id, category_id: c1('inc-1-1'), type: 'income', counterparty: 'Arrecadação Condominial (48 unid.)', amount: 42800, due_date: `${mNeg3}-10`, effective_date: `${mNeg3}-10`, status: 'realized' },
    { client_id: client1Id, category_id: c1('inc-1-2'), type: 'income', counterparty: 'Rateio Individualizado Água/Gás', amount: 6450, due_date: `${mNeg3}-10`, effective_date: `${mNeg3}-11`, status: 'realized' },
    { client_id: client1Id, category_id: c1('inc-2-1'), type: 'income', counterparty: 'Cota Fundo de Reserva 5%', amount: 2140, due_date: `${mNeg3}-10`, effective_date: `${mNeg3}-10`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-1-1'), type: 'expense', counterparty: 'Grupo Sentinela Portaria & Zeladoria', amount: 19400, due_date: `${mNeg3}-05`, effective_date: `${mNeg3}-05`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-1-2'), type: 'expense', counterparty: 'Guia DARF / FGTS Digital', amount: 5820, due_date: `${mNeg3}-07`, effective_date: `${mNeg3}-07`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-2-1'), type: 'expense', counterparty: 'Concessionária de Energia S.A.', amount: 4380, due_date: `${mNeg3}-15`, effective_date: `${mNeg3}-15`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-2-2'), type: 'expense', counterparty: 'Companhia de Saneamento', amount: 5120, due_date: `${mNeg3}-18`, effective_date: `${mNeg3}-18`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-3-1'), type: 'expense', counterparty: 'Atlas Schindler Elevadores', amount: 3200, due_date: `${mNeg3}-20`, effective_date: `${mNeg3}-20`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-4-1'), type: 'expense', counterparty: 'Vértice Contabilidade Condominial', amount: 2650, due_date: `${mNeg3}-25`, effective_date: `${mNeg3}-25`, status: 'realized' },

    // Mês -2 (Efetivado — déficit pontual por seguro anual + modernização CFTV, linha desce abaixo de 0!)
    { client_id: client1Id, category_id: c1('inc-1-1'), type: 'income', counterparty: 'Arrecadação Condominial (48 unid.)', amount: 42800, due_date: `${mNeg2}-10`, effective_date: `${mNeg2}-10`, status: 'realized' },
    { client_id: client1Id, category_id: c1('inc-1-2'), type: 'income', counterparty: 'Rateio Individualizado Água/Gás', amount: 6180, due_date: `${mNeg2}-10`, effective_date: `${mNeg2}-10`, status: 'realized' },
    { client_id: client1Id, category_id: c1('inc-3-1'), type: 'income', counterparty: 'Banco Itaú — Rendimento CDB Liquidez', amount: 940, due_date: `${mNeg2}-28`, effective_date: `${mNeg2}-28`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-1-1'), type: 'expense', counterparty: 'Grupo Sentinela Portaria & Zeladoria', amount: 19400, due_date: `${mNeg2}-05`, effective_date: `${mNeg2}-05`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-1-2'), type: 'expense', counterparty: 'Guia DARF / FGTS Digital', amount: 5820, due_date: `${mNeg2}-07`, effective_date: `${mNeg2}-07`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-2-1'), type: 'expense', counterparty: 'Concessionária de Energia S.A.', amount: 4610, due_date: `${mNeg2}-15`, effective_date: `${mNeg2}-15`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-2-2'), type: 'expense', counterparty: 'Companhia de Saneamento', amount: 5390, due_date: `${mNeg2}-18`, effective_date: `${mNeg2}-18`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-3-2'), type: 'expense', counterparty: 'TechSec Automação e Câmeras IP', amount: 9850, due_date: `${mNeg2}-19`, effective_date: `${mNeg2}-19`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-4-2'), type: 'expense', counterparty: 'Porto Seguro — Apólice Predial Anual', amount: 8400, due_date: `${mNeg2}-22`, effective_date: `${mNeg2}-22`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-4-1'), type: 'expense', counterparty: 'Vértice Contabilidade Condominial', amount: 2650, due_date: `${mNeg2}-25`, effective_date: `${mNeg2}-25`, status: 'realized' },

    // Mês -1 (Efetivado — recuperação de inadimplência + superávit sólido)
    { client_id: client1Id, category_id: c1('inc-1-1'), type: 'income', counterparty: 'Arrecadação Condominial (48 unid.)', amount: 43600, due_date: `${mNeg1}-10`, effective_date: `${mNeg1}-10`, status: 'realized' },
    { client_id: client1Id, category_id: c1('inc-1-3'), type: 'income', counterparty: 'Acordo Extrajudicial Unid. 802', amount: 5400, due_date: `${mNeg1}-14`, effective_date: `${mNeg1}-14`, status: 'realized' },
    { client_id: client1Id, category_id: c1('inc-2-3'), type: 'income', counterparty: 'Reservas Salão Gourmet (4 eventos)', amount: 1600, due_date: `${mNeg1}-22`, effective_date: `${mNeg1}-22`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-1-1'), type: 'expense', counterparty: 'Grupo Sentinela Portaria & Zeladoria', amount: 19400, due_date: `${mNeg1}-05`, effective_date: `${mNeg1}-05`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-1-2'), type: 'expense', counterparty: 'Guia DARF / FGTS Digital', amount: 5820, due_date: `${mNeg1}-07`, effective_date: `${mNeg1}-07`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-2-1'), type: 'expense', counterparty: 'Concessionária de Energia S.A.', amount: 4290, due_date: `${mNeg1}-15`, effective_date: `${mNeg1}-15`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-3-1'), type: 'expense', counterparty: 'Atlas Schindler Elevadores', amount: 3200, due_date: `${mNeg1}-20`, effective_date: `${mNeg1}-20`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-3-3'), type: 'expense', counterparty: 'Higieniza Suprimentos Profissionais', amount: 1980, due_date: `${mNeg1}-21`, effective_date: `${mNeg1}-21`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-4-1'), type: 'expense', counterparty: 'Vértice Contabilidade Condominial', amount: 2650, due_date: `${mNeg1}-25`, effective_date: `${mNeg1}-25`, status: 'realized' },

    // Mês Atual (Híbrido: parte já efetivada e parte pendente/prevista no próprio mês)
    { client_id: client1Id, category_id: c1('inc-1-1'), type: 'income', counterparty: 'Arrecadação Condominial — 1º Lote PIX', amount: 34200, due_date: `${mCur}-05`, effective_date: `${mCur}-05`, status: 'realized' },
    { client_id: client1Id, category_id: c1('inc-1-1'), type: 'income', counterparty: 'Remessa Boletos Vencimento Dia 20', amount: 9400, due_date: `${mCur}-25`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('inc-2-1'), type: 'income', counterparty: 'Cota Fundo de Reserva Mensal', amount: 2180, due_date: `${mCur}-25`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('exp-1-1'), type: 'expense', counterparty: 'Grupo Sentinela Portaria & Zeladoria', amount: 19400, due_date: `${mCur}-05`, effective_date: `${mCur}-05`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-1-2'), type: 'expense', counterparty: 'Guia DARF / FGTS Digital', amount: 5820, due_date: `${mCur}-06`, effective_date: `${mCur}-06`, status: 'realized' },
    { client_id: client1Id, category_id: c1('exp-2-1'), type: 'expense', counterparty: 'Concessionária de Energia S.A.', amount: 4450, due_date: `${mCur}-24`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('exp-3-1'), type: 'expense', counterparty: 'Atlas Schindler Elevadores', amount: 3200, due_date: `${mCur}-26`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('exp-4-1'), type: 'expense', counterparty: 'Vértice Contabilidade Condominial', amount: 2650, due_date: `${mCur}-28`, effective_date: null, status: 'pending' },

    // Mês +1 (100% Projeção Pendente — tons pastéis)
    { client_id: client1Id, category_id: c1('inc-1-1'), type: 'income', counterparty: 'Previsão Arrecadação Condominial', amount: 43600, due_date: `${mPos1}-10`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('inc-1-2'), type: 'income', counterparty: 'Previsão Rateio Água e Gás', amount: 6300, due_date: `${mPos1}-10`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('exp-1-1'), type: 'expense', counterparty: 'Grupo Sentinela Portaria & Zeladoria', amount: 19400, due_date: `${mPos1}-05`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('exp-1-2'), type: 'expense', counterparty: 'Provisão Encargos e 13º Proporcional', amount: 7900, due_date: `${mPos1}-07`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('exp-2-1'), type: 'expense', counterparty: 'Concessionária de Energia S.A.', amount: 4500, due_date: `${mPos1}-15`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('exp-2-2'), type: 'expense', counterparty: 'Companhia de Saneamento', amount: 5250, due_date: `${mPos1}-18`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('exp-3-1'), type: 'expense', counterparty: 'Atlas Schindler Elevadores', amount: 3200, due_date: `${mPos1}-20`, effective_date: null, status: 'pending' },

    // Mês +2 (100% Projeção Pendente — tons pastéis)
    { client_id: client1Id, category_id: c1('inc-1-1'), type: 'income', counterparty: 'Previsão Arrecadação Condominial', amount: 43600, due_date: `${mPos2}-10`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('inc-2-2'), type: 'income', counterparty: '1ª Parcela Taxa Extra Pintura Fachada', amount: 12000, due_date: `${mPos2}-15`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('exp-1-1'), type: 'expense', counterparty: 'Grupo Sentinela Portaria & Zeladoria', amount: 19400, due_date: `${mPos2}-05`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('exp-2-1'), type: 'expense', counterparty: 'Concessionária de Energia S.A.', amount: 4600, due_date: `${mPos2}-15`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('exp-3-3'), type: 'expense', counterparty: 'Contrato Pintura Predial — Sinal', amount: 18500, due_date: `${mPos2}-20`, effective_date: null, status: 'pending' },
    { client_id: client1Id, category_id: c1('exp-4-1'), type: 'expense', counterparty: 'Vértice Contabilidade Condominial', amount: 2650, due_date: `${mPos2}-25`, effective_date: null, status: 'pending' },
  ];

  const catNameMap = new Map(account_categories.map((c) => [c.id, c.name]));

  const transactions: Transaction[] = rawTx.map((item, idx) => {
    const id = `tx-${String(idx + 1).padStart(4, '0')}`;
    const receipt_url =
      item.status === 'realized'
        ? buildDigitalReceiptDataUri({
            protocol: String(104200 + idx),
            condoName,
            counterparty: item.counterparty,
            categoryName: catNameMap.get(item.category_id) ?? 'Conta Contábil',
            amount: item.amount,
            dateISO: item.effective_date ?? item.due_date,
            type: item.type,
          })
        : null;

    return {
      ...item,
      id,
      receipt_url,
      created_at: `${item.due_date}T12:00:00Z`,
    };
  });

  return {
    users,
    clients,
    account_categories,
    transactions,
  };
}
