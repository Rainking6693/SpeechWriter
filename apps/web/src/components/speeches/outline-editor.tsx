'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  GripVertical, 
  Clock, 
  Edit3, 
  Save, 
  RefreshCw,
  Plus,
  Trash2,
  Target,
  MessageCircle
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
  createdAt: string
  updatedAt: string
}

interface Speech {
  id: string
  title: string
  sections: SpeechSection[]
  targetDurationMinutes: number
  [key: string]: any
}

interface OutlineEditorProps {
  speech: Speech
  onUpdate: (speech: Speech) => void
  onRegenerate: () => void
}

export function OutlineEditor({ speech, onUpdate, onRegenerate }: OutlineEditorProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [sections, setSections] = useState(speech.sections)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const totalAllocatedTime = sections.reduce((sum, section) => sum + section.allocatedTimeMinutes, 0)
  const timeVariance = totalAllocatedTime - speech.targetDurationMinutes
  const timeVariancePercent = Math.abs(timeVariance) / speech.targetDurationMinutes * 100

  const getSectionTypeColor = (type: string | null) => {
    switch (type) {
      case 'opening': return 'bg-green-100 text-green-800'
      case 'body': return 'bg-blue-100 text-blue-800'
      case 'callback': return 'bg-purple-100 text-purple-800'
      case 'close': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSectionUpdate = (sectionId: string, updates: Partial<SpeechSection>) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, ...updates }
        : section
    ))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Save sections to backend
      const response = await fetch(`/api/speeches/${speech.id}/sections`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sections })
      })

      if (!response.ok) {
        throw new Error('Failed to save sections')
      }

      // Update parent component
      onUpdate({ ...speech, sections })
      
      toast({
        title: 'Outline saved!',
        description: 'Your speech outline has been updated.'
      })

      setEditingSection(null)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save outline. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddSection = () => {
    const newSection: SpeechSection = {
      id: `temp-${Date.now()}`,
      title: 'New Section',
      content: null,
      orderIndex: sections.length + 1,
      allocatedTimeMinutes: 2,
      actualTimeMinutes: null,
      sectionType: 'body',
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setSections(prev => [...prev, newSection])
    setEditingSection(newSection.id)
  }

  const handleDeleteSection = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId))
  }

  const parseNotes = (notes: string | null) => {
    if (!notes) return null
    try {
      return JSON.parse(notes)
    } catch {
      return { description: notes }
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">Speech Outline</h3>
            <p className="text-sm text-gray-600">
              Structure your speech with time-allocated sections
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRegenerate}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              Save Outline
            </Button>
          </div>
        </div>

        {/* Time Summary */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>Target: {speech.targetDurationMinutes} min</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-500" />
            <span>Allocated: {totalAllocatedTime} min</span>
            {timeVariancePercent > 5 && (
              <Badge variant="destructive">
                {timeVariance > 0 ? '+' : ''}{timeVariance} min
              </Badge>
            )}
          </div>
          <div className="text-gray-500">
            {sections.length} sections
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, index) => {
          const isEditing = editingSection === section.id
          const sectionNotes = parseNotes(section.notes)

          return (
            <Card key={section.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">
                        {index + 1}.
                      </span>
                      {isEditing ? (
                        <Input
                          value={section.title}
                          onChange={(e) => handleSectionUpdate(section.id, { title: e.target.value })}
                          className="font-semibold"
                          autoFocus
                        />
                      ) : (
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                      )}
                    </div>
                    {section.sectionType && (
                      <Badge className={getSectionTypeColor(section.sectionType)}>
                        {section.sectionType}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {isEditing ? (
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          value={section.allocatedTimeMinutes}
                          onChange={(e) => handleSectionUpdate(section.id, { 
                            allocatedTimeMinutes: parseInt(e.target.value) || 1 
                          })}
                          className="w-16 h-8 text-center"
                        />
                      ) : (
                        <span>{section.allocatedTimeMinutes}</span>
                      )}
                      <span>min</span>
                    </div>
                    
                    {!isEditing && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSection(section.id)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSection(section.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSection(null)}
                      >
                        Done
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {(isEditing || sectionNotes?.description) && (
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <Textarea
                          value={sectionNotes?.description || ''}
                          onChange={(e) => {
                            const updatedNotes = {
                              ...sectionNotes,
                              description: e.target.value
                            }
                            handleSectionUpdate(section.id, { 
                              notes: JSON.stringify(updatedNotes) 
                            })
                          }}
                          rows={2}
                          placeholder="What should this section cover?"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Key Points
                        </label>
                        <Textarea
                          value={(sectionNotes?.keyPoints || []).join('\n')}
                          onChange={(e) => {
                            const keyPoints = e.target.value
                              .split('\n')
                              .filter(point => point.trim())
                            const updatedNotes = {
                              ...sectionNotes,
                              keyPoints
                            }
                            handleSectionUpdate(section.id, { 
                              notes: JSON.stringify(updatedNotes) 
                            })
                          }}
                          rows={3}
                          placeholder="Key points to cover (one per line)"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sectionNotes?.description && (
                        <p className="text-sm text-gray-700">{sectionNotes.description}</p>
                      )}
                      {sectionNotes?.keyPoints && sectionNotes.keyPoints.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-600 mb-1">Key Points:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {sectionNotes.keyPoints.map((point: string, i: number) => (
                              <li key={i} className="text-sm text-gray-600">{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Add Section Button */}
      <Button
        variant="outline"
        onClick={handleAddSection}
        className="w-full py-3 border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Section
      </Button>
    </div>
  )
}