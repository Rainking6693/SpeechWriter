'use client'

import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut, User, Settings } from 'lucide-react'
import Link from 'next/link'

export function DashboardHeader() {
  const { data: session } = useSession()

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">SpeechWriter</h1>
            <p className="text-gray-600">AI-powered speech creation</p>
          </div>
          
          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                <span>{session.user.name || session.user.email}</span>
              </div>
            )}
            
            <Link href="/settings">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}