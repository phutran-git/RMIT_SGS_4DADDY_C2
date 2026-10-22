import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Fraunces, Be_Vietnam_Pro } from 'next/font/google'
import { TideCloakProvider } from '@tidecloak/nextjs'
import tcConfig from '../tidecloak.json'
import Shell from './shell'
import './globals.css'

const display = Fraunces({ subsets: ['latin', 'vietnamese'], variable: '--font-display' })
const body = Be_Vietnam_Pro({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'LangTrust · Community Language Data Trust',
  description: 'Minority-language communities donate stories to train AI, and keep the keys to who reads them.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <TideCloakProvider config={tcConfig}>
          <Shell>{children}</Shell>
        </TideCloakProvider>
      </body>
    </html>
  )
}
