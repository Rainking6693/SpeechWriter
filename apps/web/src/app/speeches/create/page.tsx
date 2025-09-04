'use client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BriefForm } from '@/components/speeches/brief-form'

export default function CreateSpeechPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null // Will redirect
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Speech</h1>
        <p className="text-gray-600 mt-2">
          Start by providing some basic information about your speech
        </p>
      </div>
      <BriefForm />
    </div>
  )
}