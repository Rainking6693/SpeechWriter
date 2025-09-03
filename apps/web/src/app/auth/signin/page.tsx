import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { SignInForm } from '@/components/auth/signin-form'

export default async function SignInPage() {
  const session = await auth()

  if (session) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to SpeechWriter
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create compelling speeches with AI assistance
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  )
}