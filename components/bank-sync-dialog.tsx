"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, CheckCircle, Loader2 } from "lucide-react"
import { syncAccount } from "@/app/actions/accounts"

interface BankSyncDialogProps {
  accountId: string
  accountName: string
  children: React.ReactNode
}

export function BankSyncDialog({ accountId, accountName, children }: BankSyncDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"select" | "connecting" | "success">("select")

  const banks = [
    { name: "Caisse d'Épargne", logo: "🏦", supported: true },
    { name: "Boursorama", logo: "💳", supported: true },
    { name: "BNP Paribas", logo: "🏛️", supported: true },
    { name: "Crédit Agricole", logo: "🌾", supported: true },
    { name: "LCL", logo: "🏪", supported: true },
    { name: "Société Générale", logo: "🏢", supported: false },
  ]

  async function handleBankConnect(bankName: string) {
    setLoading(true)
    setStep("connecting")

    // Simulate bank connection process
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Sync account data
    await syncAccount(accountId)

    setStep("success")
    setLoading(false)

    // Auto close after success
    setTimeout(() => {
      setOpen(false)
      setStep("select")
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Connexion bancaire sécurisée
          </DialogTitle>
          <DialogDescription>
            Connectez votre compte "{accountName}" pour une synchronisation automatique
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Connexion sécurisée</span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Vos données sont chiffrées et nous ne stockons jamais vos identifiants bancaires
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Sélectionnez votre banque :</h4>
              <div className="grid grid-cols-2 gap-2">
                {banks.map((bank) => (
                  <Card
                    key={bank.name}
                    className={`cursor-pointer transition-colors ${
                      bank.supported ? "hover:bg-gray-50 border-gray-200" : "opacity-50 cursor-not-allowed bg-gray-50"
                    }`}
                    onClick={() => bank.supported && handleBankConnect(bank.name)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{bank.logo}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{bank.name}</p>
                          {bank.supported ? (
                            <Badge variant="default" className="text-xs">
                              Supporté
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Bientôt
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "connecting" && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connexion en cours...</h3>
            <p className="text-sm text-gray-500">Nous établissons une connexion sécurisée avec votre banque</p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-8">
            <CheckCircle className="h-8 w-8 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connexion réussie !</h3>
            <p className="text-sm text-gray-500">Votre compte est maintenant synchronisé automatiquement</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
