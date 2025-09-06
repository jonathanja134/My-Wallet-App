import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function getTotalExpenses(transactions: { amount: number }[]) {
  return transactions
    .filter((t) => t.amount < 0)
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
