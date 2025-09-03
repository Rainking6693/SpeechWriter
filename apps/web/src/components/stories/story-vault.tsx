'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, Edit, Trash, Eye, Filter } from 'lucide-react'

interface Story {
  id: string
  title: string
  summary?: string
  theme?: string
  emotion?: string
  audienceType?: string
  sensitivityLevel: 'low' | 'medium' | 'high'
  tags?: string
  context?: string
  isPrivate: boolean
  createdAt: string
  updatedAt: string
}

interface StoryVaultProps {
  stories: Story[]
  onCreateNew: () => void
  onEdit: (story: Story) => void
  onDelete: (storyId: string) => void
  onView: (story: Story) => void
  isLoading?: boolean
}

const SENSITIVITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
}

export function StoryVault({ 
  stories, 
  onCreateNew, 
  onEdit, 
  onDelete, 
  onView,
  isLoading = false 
}: StoryVaultProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTheme, setFilterTheme] = useState('')
  const [filterEmotion, setFilterEmotion] = useState('')
  const [filterAudience, setFilterAudience] = useState('')
  const [filterSensitivity, setFilterSensitivity] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    return {
      themes: [...new Set(stories.map(s => s.theme).filter(Boolean))],
      emotions: [...new Set(stories.map(s => s.emotion).filter(Boolean))],
      audiences: [...new Set(stories.map(s => s.audienceType).filter(Boolean))],
    }
  }, [stories])

  // Filter stories based on search and filters
  const filteredStories = useMemo(() => {
    return stories.filter(story => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchableText = [
          story.title,
          story.summary || '',
          story.tags || '',
          story.context || '',
        ].join(' ').toLowerCase()
        
        if (!searchableText.includes(query)) {
          return false
        }
      }

      // Theme filter
      if (filterTheme && story.theme !== filterTheme) {
        return false
      }

      // Emotion filter
      if (filterEmotion && story.emotion !== filterEmotion) {
        return false
      }

      // Audience filter
      if (filterAudience && story.audienceType !== filterAudience) {
        return false
      }

      // Sensitivity filter
      if (filterSensitivity && story.sensitivityLevel !== filterSensitivity) {
        return false
      }

      return true
    })
  }, [stories, searchQuery, filterTheme, filterEmotion, filterAudience, filterSensitivity])

  const clearFilters = () => {
    setSearchQuery('')
    setFilterTheme('')
    setFilterEmotion('')
    setFilterAudience('')
    setFilterSensitivity('')
  }

  const hasActiveFilters = searchQuery || filterTheme || filterEmotion || filterAudience || filterSensitivity

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (stories.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Your story vault is empty</h3>
          <p className="text-gray-600 mb-4">
            Add stories to your vault to make your speeches more compelling and personal
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Story
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Story Vault</h2>
          <p className="text-gray-600">
            {filteredStories.length} of {stories.length} stories
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Story
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search stories by title, content, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="whitespace-nowrap"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {[searchQuery, filterTheme, filterEmotion, filterAudience, filterSensitivity]
                  .filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Theme</label>
                  <Select value={filterTheme} onValueChange={setFilterTheme}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any theme</SelectItem>
                      {filterOptions.themes.map(theme => (
                        <SelectItem key={theme} value={theme}>
                          {theme}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Emotion</label>
                  <Select value={filterEmotion} onValueChange={setFilterEmotion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any emotion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any emotion</SelectItem>
                      {filterOptions.emotions.map(emotion => (
                        <SelectItem key={emotion} value={emotion}>
                          {emotion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Audience</label>
                  <Select value={filterAudience} onValueChange={setFilterAudience}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any audience</SelectItem>
                      {filterOptions.audiences.map(audience => (
                        <SelectItem key={audience} value={audience}>
                          {audience}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Sensitivity</label>
                  <Select value={filterSensitivity} onValueChange={setFilterSensitivity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any level</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stories Grid */}
      {filteredStories.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">No stories match your filters</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStories.map((story) => (
            <Card key={story.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-base leading-tight">
                      {story.title}
                    </CardTitle>
                    {story.summary && (
                      <CardDescription className="text-sm mt-1 line-clamp-2">
                        {story.summary}
                      </CardDescription>
                    )}
                  </div>
                  
                  <Badge
                    className={`text-xs ${SENSITIVITY_COLORS[story.sensitivityLevel]} ml-2 flex-shrink-0`}
                  >
                    {story.sensitivityLevel}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                {/* Metadata */}
                <div className="space-y-2 flex-1">
                  {(story.theme || story.emotion) && (
                    <div className="flex flex-wrap gap-1">
                      {story.theme && (
                        <Badge variant="outline" className="text-xs">
                          {story.theme}
                        </Badge>
                      )}
                      {story.emotion && (
                        <Badge variant="outline" className="text-xs">
                          {story.emotion}
                        </Badge>
                      )}
                    </div>
                  )}

                  {story.tags && (
                    <div className="flex flex-wrap gap-1">
                      {story.tags.split(',').map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {story.context && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {story.context}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t">
                  <div className="text-xs text-gray-500">
                    {new Date(story.createdAt).toLocaleDateString()}
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(story)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(story)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this story?')) {
                          onDelete(story.id)
                        }
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}