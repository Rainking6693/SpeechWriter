'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface StoryData {
  id?: string
  title: string
  content: string
  summary?: string
  theme?: string
  emotion?: string
  audienceType?: string
  sensitivityLevel: 'low' | 'medium' | 'high'
  tags?: string
  context?: string
  isPrivate: boolean
}

interface StoryFormProps {
  onSubmit: (story: StoryData) => void
  onCancel: () => void
  initialData?: Partial<StoryData>
  isEditing?: boolean
}

const THEME_OPTIONS = [
  'Childhood', 'Family', 'Career', 'Challenge', 'Success', 'Failure', 'Learning', 
  'Travel', 'Relationships', 'Innovation', 'Leadership', 'Teamwork', 'Personal Growth'
]

const EMOTION_OPTIONS = [
  'Inspiring', 'Humorous', 'Touching', 'Surprising', 'Dramatic', 'Uplifting', 
  'Nostalgic', 'Motivational', 'Educational', 'Cautionary'
]

const AUDIENCE_OPTIONS = [
  'Corporate', 'Academic', 'Personal', 'Wedding', 'Graduation', 'Conference', 
  'Team Meeting', 'General Public', 'Industry Specific', 'Cultural Event'
]

const PRESET_TAGS = [
  'personal', 'professional', 'inspirational', 'humorous', 'emotional', 
  'technical', 'sensitive'
]

export function StoryForm({ onSubmit, onCancel, initialData, isEditing = false }: StoryFormProps) {
  const [storyData, setStoryData] = useState<StoryData>({
    title: '',
    content: '',
    summary: '',
    theme: '',
    emotion: '',
    audienceType: '',
    sensitivityLevel: 'low',
    tags: '',
    context: '',
    isPrivate: true,
    ...initialData,
  })

  const [selectedTags, setSelectedTags] = useState<string[]>(
    storyData.tags ? storyData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  )

  const handleTagAdd = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      const newTags = [...selectedTags, tag]
      setSelectedTags(newTags)
      setStoryData(prev => ({ ...prev, tags: newTags.join(', ') }))
    }
  }

  const handleTagRemove = (tag: string) => {
    const newTags = selectedTags.filter(t => t !== tag)
    setSelectedTags(newTags)
    setStoryData(prev => ({ ...prev, tags: newTags.join(', ') }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(storyData)
  }

  const canSubmit = storyData.title.trim().length > 0 && storyData.content.trim().length > 0

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Story' : 'Add New Story'}</CardTitle>
          <CardDescription>
            {isEditing 
              ? 'Update your story details and content'
              : 'Add a new story to your vault for use in speeches'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Story Title *</Label>
                <Input
                  id="title"
                  value={storyData.title}
                  onChange={(e) => setStoryData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Give your story a memorable title"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={storyData.theme}
                  onValueChange={(value) => setStoryData(prev => ({ ...prev, theme: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_OPTIONS.map(theme => (
                      <SelectItem key={theme} value={theme.toLowerCase()}>
                        {theme}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Story Content */}
            <div>
              <Label htmlFor="content">Story Content *</Label>
              <Textarea
                id="content"
                value={storyData.content}
                onChange={(e) => setStoryData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your story here. Include details that make it compelling and relatable..."
                rows={8}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                {storyData.content.length} characters
              </p>
            </div>

            {/* Summary */}
            <div>
              <Label htmlFor="summary">Summary (Optional)</Label>
              <Textarea
                id="summary"
                value={storyData.summary}
                onChange={(e) => setStoryData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Brief summary of the story (will be auto-generated if left empty)"
                rows={2}
              />
            </div>

            {/* Categorization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="emotion">Emotional Tone</Label>
                <Select
                  value={storyData.emotion}
                  onValueChange={(value) => setStoryData(prev => ({ ...prev, emotion: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select emotion" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMOTION_OPTIONS.map(emotion => (
                      <SelectItem key={emotion} value={emotion.toLowerCase()}>
                        {emotion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="audienceType">Audience Type</Label>
                <Select
                  value={storyData.audienceType}
                  onValueChange={(value) => setStoryData(prev => ({ ...prev, audienceType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map(audience => (
                      <SelectItem key={audience} value={audience.toLowerCase().replace(' ', '_')}>
                        {audience}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sensitivityLevel">Sensitivity Level</Label>
                <Select
                  value={storyData.sensitivityLevel}
                  onValueChange={(value: 'low' | 'medium' | 'high') => 
                    setStoryData(prev => ({ ...prev, sensitivityLevel: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sensitivity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Safe for all audiences</SelectItem>
                    <SelectItem value="medium">Medium - Consider context</SelectItem>
                    <SelectItem value="high">High - Use with caution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagAdd(tag)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleTagRemove(tag)}
                          className="ml-1 hover:bg-gray-300 rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Context */}
            <div>
              <Label htmlFor="context">Context & Usage Notes</Label>
              <Textarea
                id="context"
                value={storyData.context}
                onChange={(e) => setStoryData(prev => ({ ...prev, context: e.target.value }))}
                placeholder="When and how should this story be used? What type of speech would it fit best?"
                rows={3}
              />
            </div>

            {/* Privacy */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrivate"
                checked={storyData.isPrivate}
                onChange={(e) => setStoryData(prev => ({ ...prev, isPrivate: e.target.checked }))}
              />
              <Label htmlFor="isPrivate">Keep this story private</Label>
              <p className="text-sm text-gray-500">
                (Private stories are only visible to you)
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isEditing ? 'Update Story' : 'Save Story'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}