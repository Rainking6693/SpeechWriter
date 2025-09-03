import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { speeches, speechSections, speechVersions } from '@speechwriter/database/schema'
import { eq, and, asc, desc } from 'drizzle-orm'
import { SpeechEditor } from '@/components/speeches/speech-editor'

interface SpeechPageProps {
  params: { id: string }
}

export default async function SpeechPage({ params }: SpeechPageProps) {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  // Get speech with Drizzle
  const speech = await db
    .select()
    .from(speeches)
    .where(
      and(
        eq(speeches.id, params.id),
        eq(speeches.userId, session.user.id)
      )
    )
    .limit(1)
  
  if (speech.length === 0) {
    notFound()
  }
  
  // Get sections
  const sections = await db
    .select()
    .from(speechSections)
    .where(eq(speechSections.speechId, params.id))
    .orderBy(asc(speechSections.orderIndex))
  
  // Get versions
  const versions = await db
    .select()
    .from(speechVersions)
    .where(eq(speechVersions.speechId, params.id))
    .orderBy(desc(speechVersions.createdAt))
  
  const speechData = {
    ...speech[0],
    sections,
    versions
  }

  return (
    <div className="h-screen flex flex-col">
      <SpeechEditor speech={speechData} />
    </div>
  )
}