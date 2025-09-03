'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Monitor, 
  Mic, 
  Volume2, 
  Scissors,
  Clock,
  BarChart3,
  Save,
  Download,
  Share
} from 'lucide-react'
import { Teleprompter } from './teleprompter'
import { RehearsalAnalytics } from './rehearsal-analytics'
import { TTSPlayer } from './tts-player'
import { CutToTarget } from './cut-to-target'

interface RehearsalMetrics {
  duration: number
  wpm: number
  fillerCount: number
  pauseCount: number
  sections: any[]
  fillerWords: { [word: string]: number }
  confidence: number
  timestamp: string
}

interface CutSuggestion {
  id: string
  type: 'redundant' | 'filler' | 'verbose' | 'tangent' | 'example'
  severity: 'low' | 'medium' | 'high'
  originalText: string
  suggestedText: string
  savedWords: number
  savedSeconds: number
  reasoning: string
  sectionIndex: number
  startIndex: number
  endIndex: number
  preservesBeat: boolean
  affectsCallback: boolean
}

interface SpeechSection {
  id: string
  title: string
  content: string | null
  allocatedTimeMinutes: number
  actualTimeMinutes: number | null
  sectionType: string | null
  notes: string | null
  orderIndex: number
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
  createdAt: string
  updatedAt: string
}

interface RehearsalSuiteProps {
  speech: Speech
  onUpdate?: (updatedSpeech: Speech) => void
}

export function RehearsalSuite({ speech, onUpdate }: RehearsalSuiteProps) {
  const [activeTab, setActiveTab] = useState('teleprompter')
  const [rehearsalHistory, setRehearsalHistory] = useState<RehearsalMetrics[]>([])
  const [currentSection, setCurrentSection] = useState(0)
  
  // Compile full speech text
  const compiledText = speech.sections
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(section => section.content || '')
    .join('\n\n')
    .trim()
  
  // Calculate current duration (estimate from word count)
  const wordCount = compiledText.split(/\s+/).filter(word => word.length > 0).length
  const estimatedDurationMinutes = wordCount / 150 // Assuming 150 WPM
  
  const handleSaveMetrics = (metrics: RehearsalMetrics) => {
    setRehearsalHistory(prev => [...prev, metrics])
    
    // You might want to save this to the database here
    console.log('Saving rehearsal metrics:', metrics)
  }
  
  const handleApplyCuts = async (cuts: CutSuggestion[]) => {
    try {
      // Apply cuts to the speech sections
      const updatedSections = [...speech.sections]
      
      cuts.forEach(cut => {
        const section = updatedSections[cut.sectionIndex]
        if (section && section.content) {
          // For this demo, we'll replace the original text with suggested text
          section.content = section.content.replace(cut.originalText, cut.suggestedText)
        }
      })
      
      const updatedSpeech = {
        ...speech,
        sections: updatedSections
      }
      
      if (onUpdate) {
        onUpdate(updatedSpeech)
      }
      
    } catch (error) {
      console.error('Error applying cuts:', error)
    }
  }
  
  const exportRehearsalData = () => {
    const data = {
      speech: {
        title: speech.title,
        occasion: speech.occasion,
        targetDuration: speech.targetDurationMinutes
      },
      rehearsalHistory,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${speech.title.replace(/\s+/g, '_')}_rehearsal_data.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  const getTabIcon = (tabName: string) => {
    switch (tabName) {
      case 'teleprompter': return <Monitor className="w-4 h-4" />
      case 'practice': return <Mic className="w-4 h-4" />
      case 'tts': return <Volume2 className="w-4 h-4" />
      case 'optimize': return <Scissors className="w-4 h-4" />
      case 'analytics': return <BarChart3 className="w-4 h-4" />
      default: return null
    }
  }
  
  const getRecentMetrics = () => {
    if (rehearsalHistory.length === 0) return null
    return rehearsalHistory[rehearsalHistory.length - 1]
  }
  
  const recentMetrics = getRecentMetrics()

  return (
    <div className="h-full flex flex-col">
      {/* Header with Speech Info */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{speech.title}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Target: {speech.targetDurationMinutes}m
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                Est: {estimatedDurationMinutes.toFixed(1)}m
              </span>
              {recentMetrics && (
                <Badge variant="outline">
                  Last: {recentMetrics.confidence}/100 confidence
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportRehearsalData}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" size="sm">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Main Rehearsal Interface */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="teleprompter" className="flex items-center gap-2">
              {getTabIcon('teleprompter')}
              <span className="hidden sm:inline">Teleprompter</span>
            </TabsTrigger>
            <TabsTrigger value="practice" className="flex items-center gap-2">
              {getTabIcon('practice')}
              <span className="hidden sm:inline">Practice</span>
            </TabsTrigger>
            <TabsTrigger value="tts" className="flex items-center gap-2">
              {getTabIcon('tts')}
              <span className="hidden sm:inline">Listen</span>
            </TabsTrigger>
            <TabsTrigger value="optimize" className="flex items-center gap-2">
              {getTabIcon('optimize')}
              <span className="hidden sm:inline">Optimize</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              {getTabIcon('analytics')}
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teleprompter" className="flex-1 overflow-hidden">
            {compiledText ? (
              <Teleprompter
                speechText={compiledText}
                targetDurationMinutes={speech.targetDurationMinutes}
                onComplete={() => {
                  // Could trigger automatic save or analytics
                  console.log('Teleprompter session completed')
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <Card className="max-w-md">
                  <CardHeader className="text-center">
                    <CardTitle>No Content Available</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-center">
                      Complete your speech draft to use the teleprompter.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="practice" className="flex-1 overflow-hidden p-4">
            <RehearsalAnalytics
              speechSections={speech.sections}
              targetDurationMinutes={speech.targetDurationMinutes}
              onSaveMetrics={handleSaveMetrics}
            />
          </TabsContent>

          <TabsContent value="tts" className="flex-1 overflow-hidden p-4">
            <TTSPlayer
              speechText={compiledText}
              speechSections={speech.sections}
              targetDurationMinutes={speech.targetDurationMinutes}
              onSectionChange={setCurrentSection}
            />
          </TabsContent>

          <TabsContent value="optimize" className="flex-1 overflow-hidden p-4">
            <CutToTarget
              speechSections={speech.sections}
              targetDurationMinutes={speech.targetDurationMinutes}
              currentDurationMinutes={estimatedDurationMinutes}
              onApplyCuts={handleApplyCuts}
            />
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 overflow-hidden p-4">
            {rehearsalHistory.length > 0 ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Rehearsal History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {rehearsalHistory.map((session, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                            <div>
                              <div className="text-sm text-gray-600">Date</div>
                              <div className="font-medium">
                                {new Date(session.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600">Duration</div>
                              <div className="font-medium">
                                {Math.floor(session.duration / 1000 / 60)}:{Math.floor((session.duration / 1000) % 60).toString().padStart(2, '0')}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600">WPM</div>
                              <div className="font-medium">{session.wpm}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600">Confidence</div>
                              <Badge 
                                variant={session.confidence >= 80 ? "default" : session.confidence >= 60 ? "secondary" : "destructive"}
                              >
                                {session.confidence}/100
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Trends */}
                {rehearsalHistory.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {rehearsalHistory[rehearsalHistory.length - 1].confidence - rehearsalHistory[0].confidence > 0 ? '+' : ''}
                            {rehearsalHistory[rehearsalHistory.length - 1].confidence - rehearsalHistory[0].confidence}
                          </div>
                          <div className="text-sm text-gray-600">Confidence Change</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {rehearsalHistory[0].fillerCount - rehearsalHistory[rehearsalHistory.length - 1].fillerCount}
                          </div>
                          <div className="text-sm text-gray-600">Fewer Fillers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {rehearsalHistory.length}
                          </div>
                          <div className="text-sm text-gray-600">Practice Sessions</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <Card className="max-w-md">
                  <CardHeader className="text-center">
                    <CardTitle>No Analytics Yet</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-gray-600 mb-4">
                      Complete a practice session to see your performance analytics.
                    </p>
                    <Button onClick={() => setActiveTab('practice')}>
                      <Mic className="w-4 h-4 mr-2" />
                      Start Practicing
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}