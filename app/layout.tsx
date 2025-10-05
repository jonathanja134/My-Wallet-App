"use client"
import './css/globals.css'
import './css/critical.css'
import  ThemeProvider from '@/components/theme-provider'
import { useEffect, useState } from 'react'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Optimize LCP by marking body as loaded
              document.addEventListener('DOMContentLoaded', function() {
                document.body.classList.add('loaded');
              });
            `,
          }}
        />
      </head>
      <body className="loaded">
      {mounted && (
          <ThemeProvider attribute="class" enableSystem defaultTheme="dark">
            {children}
          </ThemeProvider>
        )}
        </body>
    </html>
  )
}
//where to set dark/light mode

