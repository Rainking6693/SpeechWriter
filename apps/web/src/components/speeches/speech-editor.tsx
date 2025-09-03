'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Clock, 
  Users, 
  Target, 
  Sparkles, 
  Play, 
  Save, 
  ArrowLeft,
  RefreshCw,
  Edit3
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { OutlineEditor } from './outline-editor'
import { DraftEditor } from './draft-editor'
import { VersionHistory } from './version-history'
import { RehearsalSuite } from './rehearsal-suite'

interface SpeechSection {
  id: string
  title: string
  content: string | null
  orderIndex: number
  allocatedTimeMinutes: number
  actualTimeMinutes: number | null
  sectionType: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface SpeechVersion {
  id: string
  versionNumber: number
  label: string | null
  fullText: string
  outline: any
  wordCount: number | null
  estimatedDurationMinutes: number | null
  isAutomatic: boolean
  createdAt: string
}

interface Speech {
  id: string
  title: string
  occasion: string
  audience: string
  targetDurationMinutes: number
  constraints: string | null
  thesis: string | null
  status: string
  sections: SpeechSection[]
  versions: SpeechVersion[]
  createdAt: string
  updatedAt: string
}

interface SpeechEditorProps {
  speech: Speech
}

export function SpeechEditor({ speech: initialSpeech }: SpeechEditorProps) {
  const [speech, setSpeech] = useState(initialSpeech)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('outline')
  const router = useRouter()
  const { toast } = useToast()

  const handleGenerateOutline = async (regenerate = false) => {
    setLoading(true)
    try {
      const response = await fetch('/api/outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speechId: speech.id,
          regenerate
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate outline')
      }

      const result = await response.json()
      
      // Update speech with new sections
      setSpeech(prev => ({
        ...prev,
        sections: result.outline,
        status: 'outline'
      }))

      toast({
        title: regenerate ? 'Outline regenerated!' : 'Outline generated!',
        description: 'Your speech outline is ready for editing.'
      })

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate outline. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'outline': return 'bg-blue-100 text-blue-800'
      case 'drafting': return 'bg-purple-100 text-purple-800'
      case 'complete': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const hasOutline = speech.sections && speech.sections.length > 0 && 
    speech.sections.some(s => s.notes || s.content)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{speech.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {speech.occasion}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {speech.targetDurationMinutes} min
                </span>
                <Badge className={getStatusColor(speech.status)}>
                  {speech.status}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Brief Summary */}
      <div className="border-b bg-gray-50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-700 mb-1">Audience</div>
            <div className="text-gray-600">{speech.audience}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700 mb-1">Main Message</div>
            <div className="text-gray-600">{speech.thesis || 'Not specified'}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700 mb-1">Constraints</div>
            <div className="text-gray-600">{speech.constraints || 'None specified'}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="outline">Outline</TabsTrigger>
            <TabsTrigger value="draft" disabled={!hasOutline}>Draft</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="rehearse" disabled={!hasOutline}>
              Rehearse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outline" className="flex-1 overflow-hidden">
            <div className="h-full p-4">
              {!hasOutline ? (
                <div className="h-full flex items-center justify-center">
                  <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle>Generate Your Outline</CardTitle>
                      <p className="text-gray-600">
                        Let AI create a structured outline based on your speech brief
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={() => handleGenerateOutline(false)} 
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Outline
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <OutlineEditor 
                  speech={speech} 
                  onUpdate={setSpeech}
                  onRegenerate={() => handleGenerateOutline(true)}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="draft" className="flex-1 overflow-hidden">
            <div className="h-full p-4">
              <DraftEditor speech={speech} onUpdate={setSpeech} />
            </div>
          </TabsContent>

          <TabsContent value="versions" className="flex-1 overflow-hidden">
            <div className="h-full p-4">
              <VersionHistory speech={speech} onRestore={setSpeech} />
            </div>
          </TabsContent>

          <TabsContent value="rehearse" className="flex-1 overflow-hidden">
            <RehearsalSuite speech={speech} onUpdate={setSpeech} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}