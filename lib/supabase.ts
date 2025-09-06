import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface User {
  id: string
  email: string
  full_name?: string
  created_at: string
  updated_at: string
}

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
  color: string
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
