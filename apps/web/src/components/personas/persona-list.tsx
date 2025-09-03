'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Edit, Trash, Star } from 'lucide-react'

interface Persona {
  id: string
  name: string
  description?: string
  toneSliders: {
    formal: number
    enthusiastic: number
    conversational: number
    authoritative: number
    humorous: number
    empathetic: number
  }
  isDefault: boolean
  isPreset: boolean
  createdAt: string
  updatedAt: string
}

interface PersonaListProps {
  personas: Persona[]
  onEdit: (persona: Persona) => void
  onDelete: (personaId: string) => void
  onSetDefault: (personaId: string) => void
  onCreateNew: () => void
  isLoading?: boolean
}

export function PersonaList({ 
  personas, 
  onEdit, 
  onDelete, 
  onSetDefault, 
  onCreateNew,
  isLoading = false 
}: PersonaListProps) {
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null)

  const getPersonaPreview = (persona: Persona) => {
    const topTones = Object.entries(persona.toneSliders)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([tone, value]) => ({ tone: tone.charAt(0).toUpperCase() + tone.slice(1), value }))

    return topTones
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
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

  if (personas.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No personas yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first persona to start personalizing your speeches
          </p>
          <Button onClick={onCreateNew}>Create Your First Persona</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Personas</h2>
        <Button onClick={onCreateNew}>Create New Persona</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {personas.map((persona) => (
          <Card
            key={persona.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedPersona === persona.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedPersona(selectedPersona === persona.id ? null : persona.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {persona.name}
                    {persona.isDefault && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </CardTitle>
                  {persona.description && (
                    <CardDescription className="text-sm mt-1">
                      {persona.description}
                    </CardDescription>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {persona.isPreset && (
                    <Badge variant="secondary" className="text-xs">
                      Preset
                    </Badge>
                  )}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Toggle menu or handle action directly
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <strong>Top tones:</strong>
                </div>
                <div className="flex flex-wrap gap-1">
                  {getPersonaPreview(persona).map(({ tone, value }) => (
                    <Badge key={tone} variant="outline" className="text-xs">
                      {tone} {value}%
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedPersona === persona.id && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(persona)
                    }}
                    className="w-full"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  
                  {!persona.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSetDefault(persona.id)
                      }}
                      className="w-full"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Set as Default
                    </Button>
                  )}
                  
                  {!persona.isPreset && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Are you sure you want to delete this persona?')) {
                          onDelete(persona.id)
                        }
                      }}
                      className="w-full"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {personas.length > 0 && (
        <div className="text-center">
          <Button variant="outline" onClick={onCreateNew}>
            + Add Another Persona
          </Button>
        </div>
      )}
    </div>
  )
}