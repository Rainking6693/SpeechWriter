import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { AnalyticsProvider } from '@/lib/analytics-provider'
import { Toaster } from '@/components/ui/toaster'

// Force dynamic rendering for entire app
export const dynamic = 'force-dynamic'
export const revalidate = 0

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SpeechWriter - AI-Powered Speech Creation',
  description: 'Create compelling speeches with AI assistance, from brief to final draft',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AnalyticsProvider>
            <div className="min-h-screen bg-background">
              {children}
            </div>
            <Toaster />
          </AnalyticsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}