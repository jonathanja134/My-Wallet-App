"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { syncAccount } from "@/app/actions/accounts"

interface SyncAllAccountsProps {
  accounts: Array<{ id: string; name: string; is_connected: boolean }>
}

export function SyncAllAccounts({ accounts }: SyncAllAccountsProps) {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  async function handleSyncAll() {
    setSyncing(true)

    const connectedAccounts = accounts.filter((acc) => acc.is_connected)

    try {
      // Sync all connected accounts
      await Promise.all(connectedAccounts.map((account) => syncAccount(account.id)))

      setLastSync(new Date())
    } catch (error) {
      console.error("Sync error:", error)
    } finally {
      setSyncing(false)
    }
  }

  const connectedCount = accounts.filter((acc) => acc.is_connected).length

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <RefreshCw className={`h-5 w-5 text-blue-600 ${syncing ? "animate-spin" : ""}`} />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Synchronisation automatique</h3>
          <p className="text-sm text-gray-500">
            {connectedCount} compte{connectedCount > 1 ? "s" : ""} connecté{connectedCount > 1 ? "s" : ""}
            {lastSync && ` • Dernière sync: ${lastSync.toLocaleTimeString("fr-FR")}`}
          </p>
        </div>
      </div>

      <Button
        onClick={handleSyncAll}
        disabled={syncing || connectedCount === 0}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700"
      >
        {syncing ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Synchronisation...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Synchroniser tout
          </>
        )}
      </Button>
    </div>
  )
}
