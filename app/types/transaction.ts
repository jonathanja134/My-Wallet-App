export type Transaction = {
  id: string
  amount: number
  transaction_date: string
  description: string

  // Relations optionnelles
  category_id?: string
  budget_categories?: { id: string; name: string }
  accounts?: { id: string; name: string }

  // Champs Supabase
  user_id?: string
  account_id?: string
  is_recurring?: boolean
  created_at?: string
  updated_at?: string
}