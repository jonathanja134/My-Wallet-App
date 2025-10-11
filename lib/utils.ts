import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
import type { Transaction } from "@/lib/supabase"

export function getTotalExpenses(transactions: Transaction[], month?: number, year?: number) {
  return transactions
    .filter((t) => {
      if (t.amount >= 0) return false // only expenses
      if (month !== undefined && year !== undefined) {
        const date = new Date(t.transaction_date)
        return date.getMonth() === month && date.getFullYear() === year
      }
      return true
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}


export function getTotalIncome(transactions: { amount: number }[]) {
  return transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
}

export function getTotalBudget(categorySpending: { budget_amount: number }[]) {
  return categorySpending.reduce((sum, cat) => sum + cat.budget_amount, 0)
}

export function formatCurrency(value: number) {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €";
}
