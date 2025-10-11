'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ThemeProviderProps } from '@/lib/supabase'
import { ReactNode } from 'react'

export default function ThemeProvider({
  children,
  attribute = 'class',
  enableSystem = true,
  defaultTheme = 'dark',
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      enableSystem={enableSystem}
      defaultTheme={defaultTheme}
    >
      {children}
    </NextThemesProvider>
  )
}

interface ThemeWrapperProps {
  children: ReactNode
  attribute?: 'class' | 'data-theme'
  enableSystem?: boolean
  defaultTheme?: string
}

export function ThemeWrapper({
  children,
  attribute = 'class',
  enableSystem = true,
  defaultTheme = 'dark',
}: ThemeWrapperProps) {
  return (
    <ThemeProvider
      attribute={attribute}
      enableSystem={enableSystem}
      defaultTheme={defaultTheme}
    >
      {children}
    </ThemeProvider>
  )
}
