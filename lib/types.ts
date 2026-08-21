export type Direction = 'income' | 'expense' | 'transfer';

export interface RawRow { [key: string]: string | number | boolean | null | undefined; }

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  debit: string;
  credit: string;
  account: string;
  category: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  direction: Direction;
  account: string;
  category: string;
  source: string;
  recurringId?: string;
  transferPairId?: string;
  unusualScore?: number;
}

export interface RecurringCommitment {
  id: string;
  merchant: string;
  category: string;
  medianAmount: number;
  cadenceDays: number;
  occurrences: number;
  nextExpectedDate: string;
  driftPct: number;
  direction: 'expense' | 'income';
  confidence: number;
}

export interface SinkingFund {
  merchant: string;
  annualizedAmount: number;
  monthlyReserve: number;
  expectedMonth: string;
  confidence: number;
}

export interface FinancialSummary {
  income: number;
  expenses: number;
  transfers: number;
  netCashFlow: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  fixedCommitments: number;
  safeToSpend: number;
  emergencyBufferMonths: number;
  incomeReliability: number;
  anomalyCount: number;
}

export interface ForecastMonth {
  month: string;
  income: number;
  expenses: number;
  balanceChange: number;
  cumulativeChange: number;
  lower: number;
  upper: number;
}

export interface ScenarioInputs {
  monthlyIncomeChange: number;
  monthlyEmi: number;
  monthlyRentChange: number;
  oneTimeSpend: number;
  monthlyInvestment: number;
}

export interface ActionItem {
  priority: 'high' | 'medium' | 'info';
  title: string;
  detail: string;
  amount?: number;
  evidence: 'known' | 'estimate' | 'simulation' | 'heuristic';
}

export interface Analysis {
  transactions: Transaction[];
  recurring: RecurringCommitment[];
  sinkingFunds: SinkingFund[];
  summary: FinancialSummary;
  forecast: ForecastMonth[];
  actions: ActionItem[];
}
