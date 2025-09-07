"use client"
import { Import } from "lucide-react"
import { Transaction } from "@/app/types/transaction"
import { useEffect, useState } from "react"


export default function ExpensesClient({ initialTransactions }: { initialTransactions: Transaction[] }) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
  const timeout = setTimeout(async () => {
    setLoading(true)
    const res = await fetch(`/api/search-transactions?q=${encodeURIComponent(searchQuery)}`)
    if (!res.ok) {
      console.error("Erreur API:", res.status, await res.text())
      setLoading(false)
      return
    }
    const data: Transaction[] = await res.json()
    setTransactions(data)
    setLoading(false)
  }, 300)

  return () => clearTimeout(timeout)
}, [searchQuery])

  return (
    <div>
      <input
        type="text"
        placeholder="Rechercher une transaction..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <ul>
        {transactions.map((t) => (
          <li key={t.id}>{t.description} - {t.amount}€</li>
        ))}
      </ul>
    </div>
  )
}
