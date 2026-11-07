export type ClientStatus = 'active' | 'inactive';
export type AccountType = 'income' | 'expense';
export type TransactionStatus = 'realized' | 'pending';
export type UserRole = 'admin' | 'syndic';

export interface Client {
  id: string;
  condo_name: string;
  syndic_name: string;
  syndic_email?: string | null;
  user_id: string | null;
  status: ClientStatus;
  scheduled_inactivation_date: string | null; // YYYY-MM-DD
  created_at: string;
}

export interface AccountCategory {
  id: string;
  client_id: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
}

export interface Transaction {
  id: string;
  client_id: string;
  category_id: string;
  type: AccountType;
  counterparty: string;
  amount: number;
  due_date: string; // YYYY-MM-DD
  effective_date: string | null; // YYYY-MM-DD
  status: TransactionStatus;
  receipt_url: string | null;
  created_at: string;
}

export interface CategoryTreeNode extends AccountCategory {
  children: CategoryTreeNode[];
  isLeaf: boolean;
  depth: number;
  pathLabel: string;
}

export interface CellAggregation {
  realized: number;
  pending: number;
  total: number;
  transactions: Transaction[];
}

export interface MonthlyCashFlowPoint {
  yearMonth: string; // YYYY-MM
  label: string; // ex: Nov/26
  incomeRealized: number; // >= 0
  incomePending: number; // >= 0
  expenseRealizedNeg: number; // <= 0 (cresce do 0 para baixo -Y)
  expensePendingNeg: number; // <= 0 (cresce do 0 para baixo -Y)
  expenseRealizedAbs: number;
  expensePendingAbs: number;
  netBalance: number; // Entradas Totais - Saídas Totais do mês
  hasOnlyPending: boolean;
}

export interface AuthUserSession {
  id: string;
  email: string;
  role: UserRole;
  client: Client | null;
  availableClients: Client[];
}

export interface CreateClientInput {
  condo_name: string;
  syndic_name: string;
  syndic_email?: string;
  initial_password?: string;
}

export interface UpdateClientManagementInput {
  status: ClientStatus;
  scheduled_inactivation_date: string | null;
}

export interface CreateTransactionInput {
  client_id: string;
  category_id: string;
  type: AccountType;
  counterparty: string;
  amount: number;
  due_date: string;
  forcePending?: boolean;
  receiptFile?: File | null;
}

export interface ConfirmTransactionInput {
  transaction_id: string;
  client_id: string;
  effective_date: string;
  receiptFile?: File | null;
}
