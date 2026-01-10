import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { ReactNode } from 'react'
import type { User } from "@supabase/supabase-js"
export type { User }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export interface DbUser {
  id: string
  email: string
  full_name?: string
  created_at: string
  updated_at: string
}

// Types for our database

export interface Account {
  id: string
  user_id: string
  name: string
  type: string
  balance: number
  currency: string
  is_connected: boolean
  bank_connection_id?: string
  created_at: string
  updated_at: string
}

export interface BudgetCategory {
  id: string
  user_id: string
  name: string
  budget_amount: number
  category: string
  color: string
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date?: string
  category?: string
  color: string
  created_at: string
  updated_at: string
}

export interface AccountHistory {
  id: string
  account_id: string
  balance: number
  recorded_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  description?: string
  category: string
  color: string
  created_at: string
  updated_at: string
  progress: { [key: string]: boolean[] }
}

export interface HabitProgress {
  id: string
  habit_id: string
  month: number
  year: number
  progress: boolean[]
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  category: string
  color: string
  tags?: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id?: string
  description: string
  amount: number
  transaction_date: string
  is_recurring: boolean
  created_at: string
  updated_at: string
  accounts?: {
    name: string
    type: string
  }
  budget_categories?: {
    name: string
    color: string
  }
}


export interface ExpensesClientProps {
  initialTransactions: Transaction[]
  user: User | null
  categories: any[];
}

export interface Session {
  access_token: string
  user: {
    id: string
    email?: string
  }
}

export interface BudgetItem {
  category: string
  budget: number
  spent: number
}

export interface ExpenseHistoryChartProps {
  expenseHistory: Array<{
    month: any
    amount: number
    day: number
    transaction_date: string 
    date: number; 
    spent: number 
  allYear?: boolean
}>
  budgetData: BudgetItem[]
  monthName: string
}

export interface PieChartData {
  category: string
  total: number
}

export interface BudgetDonutChartProps {
  categories: {
    name: string
    budget_amount: number
    spent: number
    color: string
  }[]
  pageName: string
}

export interface ThemeProviderProps {
  children: ReactNode
  attribute?: 'class' | 'data-theme'
  enableSystem?: boolean
  defaultTheme?: string
}

export interface SankeyNode {
  name: string
  color?: string
  monthlyAverage?: number
  value?: number
}

export interface SankeyLink {
  source: number
  target: number
  value: number
}

export interface SankeyDataPoint {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

export interface CategoryData {
  id: string
  name: string
  color: string
  income: number
  expenses: number
}

export interface SankeyChartProps {
  categories: CategoryData[]
  totalIncome: number
  totalExpenses: number
}

export interface ExtendedSankeyChartProps extends SankeyChartProps {
  transactions?: Transaction[]
}

export interface SavedEntry {
  type: 'revenue' | 'expense'
  amount: string
  label: string
  id?: string
}