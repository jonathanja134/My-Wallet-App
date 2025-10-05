'use client'
import ThemeProvider from '@/components/theme-provider'
import { ReactNode } from 'react'

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
