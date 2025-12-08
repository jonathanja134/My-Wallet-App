// components/page-header.tsx
"use client"

import { Wallet } from "lucide-react"
import { MobileNav } from "@/components/mobile-nav"
import { DesktopNav } from "@/components/desktop-nav"

interface PageHeaderProps {
  actionButton?: React.ReactNode
}

export function PageHeader({ actionButton }: PageHeaderProps) {
  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <MobileNav />
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-card-foreground">My Wallet</h1>
          </div>
          <DesktopNav />
          {actionButton}
        </div>
      </div>
    </header>
  )
}