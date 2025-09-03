'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  TrendingUp,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  BarChart3
} from 'lucide-react'

interface RehearsalMetrics {
  duration: number
  wpm: number
  fillerCount: number
  pauseCount: number
  sections: SectionMetrics[]
  fillerWords: { [word: string]: number }
  confidence: number
  timestamp: string
}

interface SectionMetrics {
  title: string
  duration: number
  wpm: number
  fillerCount: number
  targetWpm: number
}

interface RehearsalAnalyticsProps {
  speechSections: any[]
  targetDurationMinutes: number
  onSaveMetrics?: (metrics: RehearsalMetrics) => void
}

// Filler words to detect
const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally', 'so', 'well']

export function RehearsalAnalytics({ speechSections, targetDurationMinutes, onSaveMetrics }: RehearsalAnalyticsProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [metrics, setMetrics] = useState<RehearsalMetrics | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const startTimeRef = useRef<number>()
  const sectionStartTimeRef = useRef<number>()
  const sectionTranscriptsRef = useRef<string[]>([])
  
  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      
      recognition.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        setTranscript(prev => prev + finalTranscript)
        
        // Track section transcripts
        if (sectionTranscriptsRef.current[currentSection]) {
          sectionTranscriptsRef.current[currentSection] += finalTranscript
        } else {
          sectionTranscriptsRef.current[currentSection] = finalTranscript
        }
      }
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
      }
      
      recognitionRef.current = recognition
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [currentSection])
  
  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isRecording && !isPaused && startTimeRef.current) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current!)
      }, 100)
    }
    
    return () => clearInterval(interval)
  }, [isRecording, isPaused])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []
      sectionTranscriptsRef.current = new Array(speechSections.length).fill('')
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.start()
      
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }
      
      setIsRecording(true)
      setIsPaused(false)
      setTranscript('')
      setMetrics(null)
      startTimeRef.current = Date.now()
      sectionStartTimeRef.current = Date.now()
      setElapsedTime(0)
      setCurrentSection(0)
      
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }
  
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        // Resume
        mediaRecorderRef.current.resume()
        if (recognitionRef.current) {
          recognitionRef.current.start()
        }
        startTimeRef.current = Date.now() - elapsedTime
        setIsPaused(false)
      } else {
        // Pause
        mediaRecorderRef.current.pause()
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }
        setIsPaused(true)
      }
    }
  }
  
  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      
      setIsRecording(false)
      setIsPaused(false)
      setIsAnalyzing(true)
      
      // Wait for recording to finish
      mediaRecorderRef.current.onstop = () => {
        analyzeRecording()
      }
    }
  }
  
  const nextSection = () => {
    if (currentSection < speechSections.length - 1) {
      setCurrentSection(prev => prev + 1)
      sectionStartTimeRef.current = Date.now()
    }
  }
  
  const analyzeRecording = () => {
    if (!transcript || !startTimeRef.current) return
    
    const duration = elapsedTime
    const words = transcript.trim().split(/\s+/).filter(word => word.length > 0)
    const wpm = Math.round((words.length / (duration / 1000)) * 60)
    
    // Count filler words
    const fillerCounts: { [word: string]: number } = {}
    let totalFillerCount = 0
    
    FILLER_WORDS.forEach(filler => {
      const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi')
      const matches = transcript.match(regex) || []
      fillerCounts[filler] = matches.length
      totalFillerCount += matches.length
    })
    
    // Estimate pause count (periods of silence in transcript)
    const sentences = transcript.split(/[.!?]/).filter(s => s.trim().length > 0)
    const pauseCount = Math.max(0, sentences.length - 1)
    
    // Analyze sections
    const sectionMetrics: SectionMetrics[] = speechSections.map((section, index) => {
      const sectionText = sectionTranscriptsRef.current[index] || ''
      const sectionWords = sectionText.trim().split(/\s+/).filter(word => word.length > 0)
      const sectionDuration = section.allocatedTimeMinutes * 60 * 1000 // Estimate
      const sectionWpm = sectionWords.length > 0 ? Math.round((sectionWords.length / (sectionDuration / 1000)) * 60) : 0
      
      // Count fillers in this section
      let sectionFillerCount = 0
      FILLER_WORDS.forEach(filler => {
        const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi')
        const matches = sectionText.match(regex) || []
        sectionFillerCount += matches.length
      })
      
      return {
        title: section.title || `Section ${index + 1}`,
        duration: sectionDuration,
        wpm: sectionWpm,
        fillerCount: sectionFillerCount,
        targetWpm: 150 // Default target
      }
    })
    
    // Calculate confidence score (0-100)
    const targetWpm = 150
    const wpmScore = Math.max(0, 100 - Math.abs(wpm - targetWpm) * 2)
    const fillerScore = Math.max(0, 100 - totalFillerCount * 5)
    const confidence = Math.round((wpmScore + fillerScore) / 2)
    
    const newMetrics: RehearsalMetrics = {
      duration,
      wpm,
      fillerCount: totalFillerCount,
      pauseCount,
      sections: sectionMetrics,
      fillerWords: fillerCounts,
      confidence,
      timestamp: new Date().toISOString()
    }
    
    setMetrics(newMetrics)
    setIsAnalyzing(false)
    
    if (onSaveMetrics) {
      onSaveMetrics(newMetrics)
    }
  }
  
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  const getWpmColor = (wpm: number, target: number = 150) => {
    const diff = Math.abs(wpm - target)
    if (diff <= 10) return 'text-green-600'
    if (diff <= 25) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Practice Recording
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <Button onClick={startRecording}>
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant={isPaused ? "default" : "secondary"}
                      onClick={pauseRecording}
                    >
                      {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button variant="destructive" onClick={stopRecording}>
                      <Square className="w-4 h-4 mr-2" />
                      Stop & Analyze
                    </Button>
                  </>
                )}
              </div>
              
              {isRecording && (
                <Badge variant={isPaused ? "secondary" : "destructive"} className="animate-pulse">
                  {isPaused ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
                  {isPaused ? 'PAUSED' : 'RECORDING'}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{formatTime(elapsedTime)}</span>
                <span className="text-gray-500">/ {targetDurationMinutes}:00</span>
              </div>
            </div>
          </div>
          
          {/* Section Navigator */}
          {isRecording && speechSections.length > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-600">Section:</span>
              {speechSections.map((section, index) => (
                <Badge
                  key={index}
                  variant={index === currentSection ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setCurrentSection(index)}
                >
                  {section.title || `Section ${index + 1}`}
                </Badge>
              ))}
              {currentSection < speechSections.length - 1 && (
                <Button size="sm" variant="outline" onClick={nextSection}>
                  Next Section
                </Button>
              )}
            </div>
          )}
          
          {/* Live Transcript */}
          {(isRecording || transcript) && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Live Transcript</h4>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto text-sm">
                {transcript || <span className="text-gray-400">Speak to see transcript...</span>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {isAnalyzing && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing your performance...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overall Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Overall Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Confidence Score</span>
                <span className={`font-semibold ${getConfidenceColor(metrics.confidence)}`}>
                  {metrics.confidence}/100
                </span>
              </div>
              <Progress value={metrics.confidence} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="text-sm text-gray-600">Speaking Speed</div>
                  <div className={`font-semibold ${getWpmColor(metrics.wpm)}`}>
                    {metrics.wpm} WPM
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Duration</div>
                  <div className="font-semibold">
                    {formatTime(metrics.duration)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Filler Words</div>
                  <div className={`font-semibold ${metrics.fillerCount <= 5 ? 'text-green-600' : metrics.fillerCount <= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {metrics.fillerCount}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Pauses</div>
                  <div className="font-semibold">
                    {metrics.pauseCount}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Improvement Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Improvement Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.wpm < 120 && (
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Speak faster</div>
                    <div className="text-gray-600">Your pace is slower than optimal (120-180 WPM)</div>
                  </div>
                </div>
              )}
              
              {metrics.wpm > 200 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Slow down</div>
                    <div className="text-gray-600">You're speaking too fast for audience comprehension</div>
                  </div>
                </div>
              )}
              
              {metrics.fillerCount > 10 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Reduce filler words</div>
                    <div className="text-gray-600">Try pausing instead of using "um" or "uh"</div>
                  </div>
                </div>
              )}
              
              {metrics.fillerCount <= 5 && metrics.wpm >= 120 && metrics.wpm <= 180 && (
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Great job!</div>
                    <div className="text-gray-600">Your pace and clarity are excellent</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filler Words Breakdown */}
      {metrics && Object.values(metrics.fillerWords).some(count => count > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Filler Words Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(metrics.fillerWords)
                .filter(([_, count]) => count > 0)
                .map(([word, count]) => (
                  <div key={word} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-600">"{word}"</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}