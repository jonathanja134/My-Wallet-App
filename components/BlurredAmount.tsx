"use client"
import { useState } from "react"

function formatCurrency(amount: number) {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
}

export function BlurredAmount({ totalExpenses, totalBudget }: { totalExpenses: number, totalBudget: number }) {
  const [isBlurred, setIsBlurred] = useState(true)
  return (
    <p
      className={`text-2xl m-4 md:text-3xl font-bold test-secondary-foreground transition-all duration-300 cursor-pointer ${isBlurred ? "blur-md" : ""}`}
      onClick={() => setIsBlurred((b) => !b)}
      title={isBlurred ? "Cliquez pour afficher" : ""}
    >
      {formatCurrency(totalExpenses)} / {formatCurrency(totalBudget)}
    </p>
  )
}