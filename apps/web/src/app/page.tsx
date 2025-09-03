import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { SpeechList } from '@/components/dashboard/speech-list'
import { CreateSpeechButton } from '@/components/dashboard/create-speech-button'

export default async function HomePage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="container mx-auto py-8">
      <DashboardHeader />
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Speeches</h2>
          <CreateSpeechButton />
        </div>
        <SpeechList />
      </div>
    </div>
  )
}