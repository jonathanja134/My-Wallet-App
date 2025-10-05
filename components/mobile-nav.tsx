"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Menu,
  Home,
  PiggyBank,
  CreditCard,
  Target,
  Wallet,
  Settings,
  User,
  HelpCircle,
  LogOut,
  Calendar,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "@/app/actions/auth"

const navigation = [
  { name: "Tableau de bord", href: "/", icon: Home },
  { name: "Budget", href: "/budget", icon: PiggyBank },
  { name: "Dépenses", href: "/expenses", icon: CreditCard },
  { name: "Objectifs", href: "/goals", icon: Target },
  { name: "Comptes", href: "/accounts", icon: Wallet },
  { name: "Habitudes", href: "/task", icon: Calendar },
  { name: "Notes", href: "/notes", icon: FileText },
]

const secondaryNavigation = [
  { name: "Profil", href: "/profile", icon: User },
  { name: "Paramètres", href: "/settings", icon: Settings },
  { name: "Aide", href: "/help", icon: HelpCircle },
]

interface MobileNavProps {
  userEmail?: string
}

export function MobileNav({ userEmail }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  async function handleSignOut() {
    await signOut()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center space-x-3 p-6 border-b">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">My Wallet</h2>
              <p className="text-sm text-foreground truncate">{userEmail || "Utilisateur"}</p>
            </div>
          </div>

          {/* Main Navigation */}
          <div className="flex-1 px-4 py-6">
            <nav className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive ? "bg-black text-white" : "text-foreground hover:bg-gray-100",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Secondary Navigation */}
            <div className="mt-8 pt-6 border-t">
              <nav className="space-y-2">
                {secondaryNavigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-gray-100 transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <form action={handleSignOut}>
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Se déconnecter
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
