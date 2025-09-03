'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'

export function CreateSpeechButton() {
  const router = useRouter()

  return (
    <Button onClick={() => router.push('/speeches/create')}>
      <Plus className="w-4 h-4 mr-2" />
      New Speech
    </Button>
  )
}