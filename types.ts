
export type DebtStatus = 'Pendente' | 'Paga';

export interface Customer {
  id: string;
  name: string;
  document?: string;
  phone: string;
  whatsapp: string;
  address?: string;
  observations?: string;
  createdAt: number;
}

export interface Debt {
  id: string;
  customerId: string;
  customerName: string;
  value: number;
  date: string;
  dueDate: string;
  status: DebtStatus;
  paymentMethod?: string;
  observations?: string;
  createdAt: number;
}

export interface User {
  username: string;
  isAuthenticated: boolean;
}

export interface StoredUser {
  username: string;
  password: string;
  createdAt: number;
}

export type View = 'dashboard' | 'customers' | 'debts' | 'calculator';
