// components/desktop-nav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function DesktopNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Tableau de bord" },
    { href: "/budget", label: "Budget" },
    { href: "/expenses", label: "Dépenses" },
    { href: "/goals", label: "Objectifs" },
    { href: "/task", label: "Habitudes" },
    { href: "/cash-flow", label: "Cash-flow" },
    { href: "/notes", label: "Notes" },
  ]

  return (
    <nav className="hidden md:flex space-x-8">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`font-semibold transition-colors ${
            pathname === item.href
              ? "text-card-foreground"
              : "text-secondary-foreground hover:text-accent-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}