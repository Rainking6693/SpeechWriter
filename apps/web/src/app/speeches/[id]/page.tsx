import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { SpeechEditor } from '@/components/speeches/speech-editor'

interface SpeechPageProps {
  params: { id: string }
}

export default async function SpeechPage({ params }: SpeechPageProps) {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  const speech = await db.speech.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' }
      },
      versions: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!speech) {
    notFound()
  }

  return (
    <div className="h-screen flex flex-col">
      <SpeechEditor speech={speech} />
    </div>
  )
}