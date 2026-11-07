import { AccountCategory, CategoryTreeNode, Client, Transaction } from '@/types/database';

const MONTH_SHORT_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

/**
 * Retorna a data atual local no formato YYYY-MM-DD (sem desvio de fuso UTC).
 */
export function getLocalTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna o mês/ano relativo ao mês atual no formato YYYY-MM.
 */
export function getRelativeYearMonth(offsetMonths: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Formata valor numérico para moeda BRL (ex: R$ 12.450,00).
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata valores do eixo Y de forma limpa e concisa.
 */
export function formatAxisCurrency(value: number): string {
  if (value === 0) return '0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`;
  }
  return `${sign}R$ ${abs.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

/**
 * Converte digitação bruta de centavos em número decimal e string formatada BRL.
 */
export function parseCurrencyDigits(rawInput: string): { numeric: number; formatted: string } {
  const digits = rawInput.replace(/\D/g, '');
  if (!digits) {
    return { numeric: 0, formatted: '' };
  }
  const cents = parseInt(digits, 10);
  const numeric = cents / 100;
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
  return { numeric, formatted };
}

/**
 * Formata YYYY-MM-DD para DD/MM/AAAA.
 */
export function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const parts = isoDate.slice(0, 10).split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Formata YYYY-MM para rótulo curto ex: Nov/26.
 */
export function formatYearMonthShort(yearMonth: string): string {
  const [yStr, mStr] = yearMonth.split('-');
  const mIdx = parseInt(mStr, 10) - 1;
  const shortYear = yStr.slice(-2);
  return `${MONTH_SHORT_PT[mIdx] ?? mStr}/${shortYear}`;
}

/**
 * Gera lista contínua de meses YYYY-MM entre início e fim (inclusive).
 */
export function getMonthsInRange(startYM: string, endYM: string): string[] {
  const [sYear, sMonth] = startYM.split('-').map(Number);
  const [eYear, eMonth] = endYM.split('-').map(Number);
  if (!sYear || !sMonth || !eYear || !eMonth) return [];

  const startTotal = sYear * 12 + (sMonth - 1);
  const endTotal = eYear * 12 + (eMonth - 1);
  const from = Math.min(startTotal, endTotal);
  const to = Math.max(startTotal, endTotal);

  const months: string[] = [];
  for (let cur = from; cur <= to; cur++) {
    const y = Math.floor(cur / 12);
    const m = (cur % 12) + 1;
    months.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return months;
}

/**
 * Determina o mês de competência/caixa exibido para uma transação:
 * - Efetivado (realized): prioriza effective_date (ou due_date se nulo)
 * - Pendente (pending): utiliza due_date
 */
export function getTransactionReferenceDate(tx: Transaction): string {
  if (tx.status === 'realized' && tx.effective_date) {
    return tx.effective_date.slice(0, 10);
  }
  return tx.due_date.slice(0, 10);
}

export function getTransactionYearMonth(tx: Transaction): string {
  return getTransactionReferenceDate(tx).slice(0, 7);
}

/**
 * Avalia se um cliente atingiu sua data de inativação programada.
 */
export function isClientScheduledExpired(client: Client, todayISO = getLocalTodayISO()): boolean {
  return Boolean(
    client.scheduled_inactivation_date && client.scheduled_inactivation_date <= todayISO
  );
}

/**
 * Constrói a árvore recursiva do Plano de Contas (suporta N níveis de profundidade).
 */
export function buildCategoryTree(
  categories: AccountCategory[],
  type: 'income' | 'expense'
): CategoryTreeNode[] {
  const filtered = categories.filter((c) => c.type === type);
  const byParent = new Map<string | null, AccountCategory[]>();

  for (const cat of filtered) {
    const key = cat.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(cat);
    byParent.set(key, list);
  }

  // Ordena alfabeticamente mantendo numeração contábil (1.1, 1.2...)
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));
  }

  const buildNodes = (parentId: string | null, depth: number, prefixPath: string): CategoryTreeNode[] => {
    const childrenRaw = byParent.get(parentId) ?? [];
    return childrenRaw.map((cat) => {
      const currentPath = prefixPath ? `${prefixPath} › ${cat.name}` : cat.name;
      const children = buildNodes(cat.id, depth + 1, currentPath);
      return {
        ...cat,
        children,
        isLeaf: children.length === 0,
        depth,
        pathLabel: currentPath,
      };
    });
  };

  return buildNodes(null, 0, '');
}

/**
 * Extrai apenas as contas analíticas (último nível filho / nós-folha) agrupadas pelo caminho pai.
 */
export function getAnalyticalLeafCategories(
  categories: AccountCategory[],
  type: 'income' | 'expense'
): { groupName: string; leaves: CategoryTreeNode[] }[] {
  const roots = buildCategoryTree(categories, type);
  const groups: { groupName: string; leaves: CategoryTreeNode[] }[] = [];

  const collectLeaves = (node: CategoryTreeNode, acc: CategoryTreeNode[]) => {
    if (node.isLeaf) {
      acc.push(node);
    } else {
      for (const child of node.children) {
        collectLeaves(child, acc);
      }
    }
  };

  for (const root of roots) {
    if (root.isLeaf) {
      groups.push({ groupName: 'Contas Diretas', leaves: [root] });
    } else {
      const leaves: CategoryTreeNode[] = [];
      collectLeaves(root, leaves);
      if (leaves.length > 0) {
        groups.push({ groupName: root.name, leaves });
      }
    }
  }

  return groups;
}
