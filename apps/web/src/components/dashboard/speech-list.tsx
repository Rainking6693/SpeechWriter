'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Clock, Users, Calendar, MoreHorizontal, Plus } from 'lucide-react'

interface Speech {
  id: string
  title: string
  occasion: string
  audience: string
  targetDurationMinutes: number
  status: string
  createdAt: string
  updatedAt: string
}

export function SpeechList() {
  const [speeches, setSpeeches] = useState<Speech[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchSpeeches()
  }, [])

  const fetchSpeeches = async () => {
    try {
      const response = await fetch('/api/speeches')
      if (response.ok) {
        const data = await response.json()
        setSpeeches(data)
      }
    } catch (error) {
      console.error('Error fetching speeches:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-yellow-600 bg-yellow-100'
      case 'outline': return 'text-blue-600 bg-blue-100'
      case 'complete': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (speeches.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No speeches yet</h3>
        <p className="text-gray-500 mb-4">Create your first speech to get started</p>
        <Button onClick={() => router.push('/speeches/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Your First Speech
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {speeches.map((speech) => (
        <Card key={speech.id} className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg line-clamp-2">{speech.title}</CardTitle>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(speech.status)}`}>
                {speech.status}
              </span>
            </div>
          </CardHeader>
          
          <CardContent onClick={() => router.push(`/speeches/${speech.id}`)}>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{speech.occasion}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="line-clamp-1">{speech.audience}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{speech.targetDurationMinutes} minutes</span>
              </div>
              
              <div className="pt-2 border-t">
                <span className="text-xs text-gray-500">
                  Updated {new Date(speech.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}