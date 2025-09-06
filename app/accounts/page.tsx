import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  ArrowLeft,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Coins,
  Home,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { AddAccountDialog } from "@/components/add-account-dialog"
import { BankSyncDialog } from "@/components/bank-sync-dialog"
import { SyncAllAccounts } from "@/components/sync-all-accounts"
import { getAccounts, syncAccount } from "@/app/actions/accounts"
import { getTotalExpenses, getTotalIncome } from "@/lib/utils"
import { getTransactions } from "../actions/expenses"
//import totalExpense fonction



export default async function Accounts() {
  const [transactionsResult] = await Promise.all([
    getTransactions(),
  ])
  const accountsResult = await getAccounts()
  const accounts = accountsResult.data || []

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)
  const connectedAccounts = accounts.filter((account) => account.is_connected).length
  const totalAccounts = accounts.length
  const transactions = transactionsResult.data || []
  const totalExpenses = getTotalExpenses(transactions)
  const totalIncome = getTotalIncome(transactions)

  async function handleSyncAccount(accountId: string) {
    "use server"
    await syncAccount(accountId)
  }

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      "Compte courant": "bg-blue-100 text-blue-800",
      Épargne: "bg-green-100 text-green-800",
      Investissement: "bg-purple-100 text-purple-800",
      Assurance: "bg-yellow-100 text-yellow-800",
      Cryptomonnaies: "bg-orange-100 text-orange-800",
      Immobilier: "bg-red-100 text-red-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  const getAccountIcon = (type: string) => {
    const icons: { [key: string]: any } = {
      "Compte courant": CreditCard,
      Épargne: PiggyBank,
      Investissement: TrendingUp,
      Cryptomonnaies: Coins,
      Immobilier: Home,
    }
    return icons[type] || CreditCard
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MobileNav />
              <Link href="/" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Mes comptes</h1>
            </div>
            <div className="flex items-center space-x-2">
              <AddAccountDialog />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary */}
        <div className="mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Patrimoine total</p>
                  <p className="text-3xl font-bold text-gray-900"> {totalBalance.toLocaleString("fr-FR")} </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Comptes connectés</p>
                  <p className="text-2xl font-bold text-green-600">
                    {connectedAccounts}/{totalAccounts}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Dernière synchronisation</p>
                  <p className="text-lg font-semibold text-gray-900">Il y a 5min</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sync All Accounts */}
        <div className="mb-6">
          <SyncAllAccounts accounts={accounts} />
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const IconComponent = getAccountIcon(account.type)
            const randomChange = (Math.random() - 0.5) * 4 // Simulate change

            return (
              <Card key={account.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">{account.name}</CardTitle>
                        <Badge className={getTypeColor(account.type)}>{account.type}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{account.balance.toLocaleString("fr-FR")} €</p>
                      <div className="flex items-center mt-1">
                        {randomChange > 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={`text-sm font-medium ${randomChange > 0 ? "text-green-600" : "text-red-600"}`}>
                          {randomChange > 0 ? "+" : ""}
                          {randomChange.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Statut</span>
                      <div className="flex items-center">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${account.is_connected ? "bg-green-500" : "bg-gray-400"}`}
                        ></div>
                        <span
                          className={`text-sm font-medium ${account.is_connected ? "text-green-600" : "text-gray-500"}`}
                        >
                          {account.is_connected ? "Connecté" : "Manuel"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Dernière mise à jour</span>
                      <span className="text-sm text-gray-900">Il y a 5min</span>
                    </div>

                    <div className="pt-2 space-y-2">
                      {account.is_connected ? (
                        <form action={handleSyncAccount.bind(null, account.id)}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full bg-white text-gray-700 border-gray-200"
                            type="submit"
                          >
                            Synchroniser
                          </Button>
                        </form>
                      ) : (
                        <BankSyncDialog accountId={account.id} accountName={account.name}>
                          <Button size="sm" variant="outline" className="w-full bg-white text-gray-700 border-gray-200">
                            Connecter
                          </Button>
                        </BankSyncDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Add Account Options */}
        <div className="mt-8">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Ajouter un nouveau compte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AddAccountDialog accountType="Compte courant">
                  <Button variant="outline" className="h-20 flex-col bg-white text-gray-700 border-gray-200">
                    <CreditCard className="h-6 w-6 mb-2" />
                    <span className="text-sm">Compte bancaire</span>
                  </Button>
                </AddAccountDialog>
                <AddAccountDialog accountType="Investissement">
                  <Button variant="outline" className="h-20 flex-col bg-white text-gray-700 border-gray-200">
                    <TrendingUp className="h-6 w-6 mb-2" />
                    <span className="text-sm">Investissement</span>
                  </Button>
                </AddAccountDialog>
                <AddAccountDialog accountType="Cryptomonnaies">
                  <Button variant="outline" className="h-20 flex-col bg-white text-gray-700 border-gray-200">
                    <Coins className="h-6 w-6 mb-2" />
                    <span className="text-sm">Crypto</span>
                  </Button>
                </AddAccountDialog>
                <AddAccountDialog accountType="Immobilier">
                  <Button variant="outline" className="h-20 flex-col bg-white text-gray-700 border-gray-200">
                    <Home className="h-6 w-6 mb-2" />
                    <span className="text-sm">Immobilier</span>
                  </Button>
                </AddAccountDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
