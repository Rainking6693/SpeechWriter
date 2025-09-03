'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  History, 
  Clock, 
  FileText, 
  RotateCcw,
  Tag,
  Eye,
  Save
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
  versions: SpeechVersion[]
  [key: string]: any
}

interface VersionHistoryProps {
  speech: Speech
  onRestore: (speech: Speech) => void
}

export function VersionHistory({ speech, onRestore }: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const versions = speech.versions.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const handleRestore = async (versionId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/speeches/${speech.id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ versionId })
      })

      if (!response.ok) {
        throw new Error('Failed to restore version')
      }

      const restoredSpeech = await response.json()
      onRestore(restoredSpeech)

      toast({
        title: 'Version restored!',
        description: 'Your speech has been restored to the selected version.'
      })

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to restore version. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSnapshot = async () => {
    setLoading(true)
    try {
      const label = prompt('Enter a label for this snapshot:')
      if (!label) return

      const response = await fetch(`/api/speeches/${speech.id}/snapshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label })
      })

      if (!response.ok) {
        throw new Error('Failed to create snapshot')
      }

      toast({
        title: 'Snapshot created!',
        description: `Saved current version as "${label}"`
      })

      // Refresh the page to show new snapshot
      window.location.reload()

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create snapshot. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getVersionTypeColor = (isAutomatic: boolean) => {
    return isAutomatic 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800'
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No versions yet</h3>
        <p className="text-gray-500 mb-4">
          Versions are created automatically as you work on your speech
        </p>
        <Button onClick={handleSaveSnapshot} disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          Create Snapshot
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Version History</h3>
          <p className="text-sm text-gray-600">
            Track changes and restore previous versions of your speech
          </p>
        </div>
        <Button onClick={handleSaveSnapshot} disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          Save Snapshot
        </Button>
      </div>

      {/* Version List */}
      <div className="space-y-4">
        {versions.map((version, index) => (
          <Card key={version.id} className={selectedVersion === version.id ? 'ring-2 ring-blue-500' : ''}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {version.label || `Version ${version.versionNumber}`}
                    </CardTitle>
                    {index === 0 && (
                      <Badge variant="default">Current</Badge>
                    )}
                    <Badge className={getVersionTypeColor(version.isAutomatic)}>
                      {version.isAutomatic ? 'Auto' : 'Manual'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(version.createdAt).toLocaleDateString()} at {new Date(version.createdAt).toLocaleTimeString()}
                    </span>
                    {version.wordCount && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {version.wordCount} words
                      </span>
                    )}
                    {version.estimatedDurationMinutes && (
                      <span>~{version.estimatedDurationMinutes} min</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedVersion(
                      selectedVersion === version.id ? null : version.id
                    )}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {selectedVersion === version.id ? 'Hide' : 'Preview'}
                  </Button>
                  
                  {index !== 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleRestore(version.id)}
                      disabled={loading}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {selectedVersion === version.id && (
              <CardContent>
                <div className="space-y-4">
                  {/* Outline Preview */}
                  {version.outline && (
                    <div>
                      <h4 className="font-medium mb-2">Outline</h4>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        {version.outline.sections ? (
                          <ul className="space-y-1">
                            {version.outline.sections.map((section: any, i: number) => (
                              <li key={i} className="flex justify-between">
                                <span>{section.title}</span>
                                <span className="text-gray-500">{section.allocatedTimeMinutes}min</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500">No outline data available</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Full Text Preview */}
                  {version.fullText && (
                    <div>
                      <h4 className="font-medium mb-2">Full Text</h4>
                      <div className="bg-gray-50 p-3 rounded text-sm max-h-60 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-sans">
                          {version.fullText.length > 500 
                            ? version.fullText.substring(0, 500) + '...'
                            : version.fullText
                          }
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {versions.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <History className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-medium text-blue-900 mb-1">Version Management</h4>
                <p className="text-blue-700">
                  Versions are automatically created when you generate outlines or complete drafts. 
                  You can also create manual snapshots at any time to save important milestones.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}