'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Sparkles,
  Clock, 
  Edit3, 
  Save, 
  Play,
  RefreshCw,
  Target,
  Mic
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SpeechSection {
  id: string
  title: string
  content: string | null
  orderIndex: number
  allocatedTimeMinutes: number
  actualTimeMinutes: number | null
  sectionType: string | null
  notes: string | null
}

interface Speech {
  id: string
  title: string
  sections: SpeechSection[]
  targetDurationMinutes: number
  [key: string]: any
}

interface DraftEditorProps {
  speech: Speech
  onUpdate: (speech: Speech) => void
}

export function DraftEditor({ speech, onUpdate }: DraftEditorProps) {
  const [draftingSection, setDraftingSection] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const sections = speech.sections.sort((a, b) => a.orderIndex - b.orderIndex)
  const completedSections = sections.filter(s => s.content).length
  const progress = (completedSections / sections.length) * 100

  const estimateWPM = (text: string) => {
    const words = text.trim().split(/\s+/).length
    return words
  }

  const estimateDuration = (text: string) => {
    const words = estimateWPM(text)
    return Math.round(words / 180) // Assume 180 WPM speaking rate
  }

  const handleGenerateSection = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    setDraftingSection(sectionId)
    setStreamingContent('')
    setLoading(true)

    try {
      const response = await fetch('/api/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speechId: speech.id,
          sectionId: section.id,
          regenerate: !!section.content
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate draft')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let content = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          content += chunk
          setStreamingContent(content)
        }
      }

      // Update the section with the generated content
      const updatedSections = sections.map(s => 
        s.id === sectionId 
          ? { ...s, content, actualTimeMinutes: estimateDuration(content) }
          : s
      )

      onUpdate({ ...speech, sections: updatedSections })

      toast({
        title: 'Section drafted!',
        description: `${section.title} has been generated.`
      })

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate section. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setDraftingSection(null)
      setStreamingContent('')
    }
  }

  const handleContentUpdate = (sectionId: string, content: string) => {
    const updatedSections = sections.map(s => 
      s.id === sectionId 
        ? { ...s, content, actualTimeMinutes: estimateDuration(content) }
        : s
    )
    onUpdate({ ...speech, sections: updatedSections })
  }

  const getSectionProgress = (section: SpeechSection) => {
    if (!section.content) return 0
    const words = estimateWPM(section.content)
    const targetWords = section.allocatedTimeMinutes * 180 // 180 WPM
    return Math.min((words / targetWords) * 100, 100)
  }

  const totalActualTime = sections.reduce((sum, s) => 
    sum + (s.actualTimeMinutes || 0), 0
  )

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">Speech Draft</h3>
            <p className="text-sm text-gray-600">
              Generate and edit your speech content section by section
            </p>
          </div>
          <Button size="sm" disabled={progress < 100}>
            <Play className="w-4 h-4 mr-2" />
            Preview Full Speech
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{completedSections} of {sections.length} sections</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span>Target: {speech.targetDurationMinutes} min</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Current: {totalActualTime} min</span>
              {Math.abs(totalActualTime - speech.targetDurationMinutes) > 1 && (
                <Badge variant="outline">
                  {totalActualTime > speech.targetDurationMinutes ? 'Over' : 'Under'} by{' '}
                  {Math.abs(totalActualTime - speech.targetDurationMinutes)} min
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, index) => (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">
                    {index + 1}.
                  </span>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{section.allocatedTimeMinutes} min</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {section.content && (
                    <div className="text-sm text-gray-600">
                      {estimateWPM(section.content)} words • ~{section.actualTimeMinutes} min
                    </div>
                  )}
                  
                  <Button
                    size="sm"
                    onClick={() => handleGenerateSection(section.id)}
                    disabled={loading}
                    variant={section.content ? "outline" : "default"}
                  >
                    {draftingSection === section.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : section.content ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {draftingSection === section.id ? (
                <div className="space-y-3">
                  <div className="text-sm text-blue-600 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    Generating content for {section.title}...
                  </div>
                  <Textarea
                    value={streamingContent}
                    readOnly
                    className="min-h-32 font-mono text-sm"
                    placeholder="Content will appear here as it's generated..."
                  />
                </div>
              ) : section.content ? (
                <div className="space-y-3">
                  <Progress value={getSectionProgress(section)} className="h-1" />
                  <Textarea
                    value={section.content}
                    onChange={(e) => handleContentUpdate(section.id, e.target.value)}
                    className="min-h-32"
                    placeholder="Section content..."
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{estimateWPM(section.content)} words</span>
                    <span>~{estimateDuration(section.content)} minutes at speaking pace</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Click Generate to create content for this section</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {progress === 100 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Target className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-green-900">Speech Draft Complete!</h4>
                <p className="text-sm text-green-700">
                  Your speech is ready for review and rehearsal. Total duration: ~{totalActualTime} minutes
                </p>
              </div>
              <Button size="sm" className="ml-auto">
                <Mic className="w-4 h-4 mr-2" />
                Start Rehearsing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}