import type { Metadata } from 'next'
import './css/globals.css'
import './css/critical.css'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'Wallet',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
      <body>
        <ThemeProvider attribute="class" enableSystem defaultTheme="dark">
          {children}
        </ThemeProvider>
        </body>
    </html>
  )
}
//where to set dark/light mode

