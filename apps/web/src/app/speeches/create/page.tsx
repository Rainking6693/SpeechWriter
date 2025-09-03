import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { BriefForm } from '@/components/speeches/brief-form'

export default async function CreateSpeechPage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
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