'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX,
  Settings,
  SkipForward,
  SkipBack,
  Clock
} from 'lucide-react'

interface TTSPlayerProps {
  speechText: string
  speechSections?: any[]
  targetDurationMinutes: number
  onSectionChange?: (sectionIndex: number) => void
}

interface Voice {
  voice: SpeechSynthesisVoice
  name: string
  lang: string
}

export function TTSPlayer({ speechText, speechSections = [], targetDurationMinutes, onSectionChange }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [rate, setRate] = useState(1.0) // Speech rate (0.1 to 10)
  const [pitch, setPitch] = useState(1.0) // Speech pitch (0 to 2)
  const [volume, setVolume] = useState(0.8) // Volume (0 to 1)
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([])
  const [currentPosition, setCurrentPosition] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [currentSection, setCurrentSection] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const textSegmentsRef = useRef<string[]>([])
  const currentSegmentRef = useRef(0)
  const positionTimerRef = useRef<NodeJS.Timeout>()
  
  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices()
      const voiceOptions: Voice[] = voices
        .filter(voice => voice.lang.startsWith('en')) // English voices only
        .map(voice => ({
          voice,
          name: voice.name,
          lang: voice.lang
        }))
        .sort((a, b) => {
          // Prioritize system voices over remote voices
          if (a.voice.localService && !b.voice.localService) return -1
          if (!a.voice.localService && b.voice.localService) return 1
          return a.name.localeCompare(b.name)
        })
      
      setAvailableVoices(voiceOptions)
      
      // Set default voice (prefer system voices)
      const defaultVoice = voiceOptions.find(v => v.voice.localService) || voiceOptions[0]
      if (defaultVoice && !selectedVoice) {
        setSelectedVoice(defaultVoice.voice)
      }
    }
    
    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)
    
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    }
  }, [selectedVoice])
  
  // Parse speech text into segments for better control
  useEffect(() => {
    // Split text into sentences/segments for more granular control
    const segments = speechText
      .split(/[.!?]/)
      .map(segment => segment.trim())
      .filter(segment => segment.length > 0)
      .map(segment => segment + (segment.match(/[.!?]$/) ? '' : '.'))
    
    textSegmentsRef.current = segments
    
    // Estimate total duration based on text length and rate
    const words = speechText.trim().split(/\s+/).length
    const estimatedDuration = (words / (150 * rate)) * 60 * 1000 // 150 WPM baseline
    setTotalDuration(estimatedDuration)
  }, [speechText, rate])
  
  // Position tracking
  useEffect(() => {
    if (isPlaying && !isPaused) {
      positionTimerRef.current = setInterval(() => {
        setCurrentPosition(prev => {
          const newPosition = prev + 100
          
          // Update current section based on position
          if (speechSections.length > 0) {
            const sectionDuration = totalDuration / speechSections.length
            const newSection = Math.floor(newPosition / sectionDuration)
            if (newSection !== currentSection && newSection < speechSections.length) {
              setCurrentSection(newSection)
              if (onSectionChange) {
                onSectionChange(newSection)
              }
            }
          }
          
          return Math.min(newPosition, totalDuration)
        })
      }, 100)
    } else {
      if (positionTimerRef.current) {
        clearInterval(positionTimerRef.current)
      }
    }
    
    return () => {
      if (positionTimerRef.current) {
        clearInterval(positionTimerRef.current)
      }
    }
  }, [isPlaying, isPaused, totalDuration, currentSection, speechSections.length, onSectionChange])
  
  const createUtterance = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }
    
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume
    
    return utterance
  }
  
  const handlePlay = () => {
    if (isPaused) {
      speechSynthesis.resume()
      setIsPaused(false)
      setIsPlaying(true)
      return
    }
    
    // Cancel any existing speech
    speechSynthesis.cancel()
    
    const textToSpeak = speechText
    const utterance = createUtterance(textToSpeak)
    
    utterance.onstart = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }
    
    utterance.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setCurrentPosition(totalDuration)
    }
    
    utterance.onerror = (event) => {
      console.error('TTS Error:', event.error)
      setIsPlaying(false)
      setIsPaused(false)
    }
    
    utterance.onboundary = (event) => {
      // Update position based on character position
      if (event.name === 'word') {
        const progressRatio = event.charIndex / textToSpeak.length
        setCurrentPosition(progressRatio * totalDuration)
      }
    }
    
    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
  }
  
  const handlePause = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.pause()
      setIsPaused(true)
      setIsPlaying(false)
    }
  }
  
  const handleStop = () => {
    speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentPosition(0)
    setCurrentSection(0)
  }
  
  const handleSeek = (newPosition: number) => {
    const wasPlaying = isPlaying
    handleStop()
    setCurrentPosition(newPosition)
    
    // Calculate which part of text to start from
    const progressRatio = newPosition / totalDuration
    const charIndex = Math.floor(progressRatio * speechText.length)
    
    // Find the nearest sentence boundary
    const textBefore = speechText.substring(0, charIndex)
    const lastSentenceEnd = Math.max(
      textBefore.lastIndexOf('.'),
      textBefore.lastIndexOf('!'),
      textBefore.lastIndexOf('?')
    )
    
    const startIndex = lastSentenceEnd > 0 ? lastSentenceEnd + 1 : charIndex
    const remainingText = speechText.substring(startIndex).trim()
    
    if (wasPlaying && remainingText) {
      const utterance = createUtterance(remainingText)
      
      utterance.onstart = () => {
        setIsPlaying(true)
        setIsPaused(false)
      }
      
      utterance.onend = () => {
        setIsPlaying(false)
        setIsPaused(false)
        setCurrentPosition(totalDuration)
      }
      
      utteranceRef.current = utterance
      speechSynthesis.speak(utterance)
    }
  }
  
  const skipToSection = (sectionIndex: number) => {
    if (sectionIndex >= 0 && sectionIndex < speechSections.length) {
      const sectionDuration = totalDuration / speechSections.length
      const newPosition = sectionIndex * sectionDuration
      handleSeek(newPosition)
      setCurrentSection(sectionIndex)
      if (onSectionChange) {
        onSectionChange(sectionIndex)
      }
    }
  }
  
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  const getProgress = () => {
    return totalDuration > 0 ? (currentPosition / totalDuration) * 100 : 0
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel()
      if (positionTimerRef.current) {
        clearInterval(positionTimerRef.current)
      }
    }
  }, [])

  if (showSettings) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            TTS Settings
            <Button variant="ghost" onClick={() => setShowSettings(false)}>
              Back
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Voice</label>
            <Select
              value={selectedVoice?.name || ''}
              onValueChange={(voiceName) => {
                const voice = availableVoices.find(v => v.name === voiceName)?.voice
                setSelectedVoice(voice || null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {availableVoices.map((voiceOption) => (
                  <SelectItem key={voiceOption.voice.name} value={voiceOption.voice.name}>
                    {voiceOption.name} ({voiceOption.lang})
                    {voiceOption.voice.localService && <Badge variant="outline" className="ml-2">System</Badge>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Speed: {rate.toFixed(1)}x
            </label>
            <Slider
              value={[rate]}
              onValueChange={([value]) => setRate(value)}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Pitch: {pitch.toFixed(1)}
            </label>
            <Slider
              value={[pitch]}
              onValueChange={([value]) => setPitch(value)}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Volume: {Math.round(volume * 100)}%
            </label>
            <Slider
              value={[volume]}
              onValueChange={([value]) => setVolume(value)}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Text-to-Speech Practice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isPlaying && !isPaused ? "destructive" : "default"}
              onClick={isPlaying && !isPaused ? handlePause : handlePlay}
              disabled={!speechText.trim()}
            >
              {isPlaying && !isPaused ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            
            <Button size="sm" variant="outline" onClick={handleStop}>
              <Square className="w-4 h-4" />
            </Button>
            
            {speechSections.length > 1 && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => skipToSection(Math.max(0, currentSection - 1))}
                  disabled={currentSection === 0}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => skipToSection(Math.min(speechSections.length - 1, currentSection + 1))}
                  disabled={currentSection === speechSections.length - 1}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>{formatTime(currentPosition)}</span>
              <span className="text-gray-500">/ {formatTime(totalDuration)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline">{rate}x speed</Badge>
              <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full cursor-pointer"
               onClick={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect()
                 const x = e.clientX - rect.left
                 const percentage = x / rect.width
                 handleSeek(percentage * totalDuration)
               }}>
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
          
          {/* Section markers */}
          {speechSections.length > 1 && (
            <div className="flex justify-between text-xs text-gray-500">
              {speechSections.map((section, index) => (
                <button
                  key={index}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    index === currentSection 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => skipToSection(index)}
                >
                  {section.title || `Section ${index + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Quick Settings */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Speed:</span>
              <div className="flex gap-1">
                {[0.8, 1.0, 1.2, 1.5].map(speed => (
                  <Button
                    key={speed}
                    size="sm"
                    variant={rate === speed ? "default" : "outline"}
                    className="px-2 py-1 text-xs"
                    onClick={() => setRate(speed)}
                  >
                    {speed}x
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-gray-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-gray-600" />
            )}
            <Slider
              value={[volume]}
              onValueChange={([value]) => setVolume(value)}
              min={0}
              max={1}
              step={0.1}
              className="w-20"
            />
          </div>
        </div>
        
        {/* Status */}
        {(isPlaying || isPaused) && (
          <div className="flex items-center justify-center">
            <Badge variant={isPlaying ? "default" : "secondary"}>
              {isPaused ? 'Paused' : isPlaying ? 'Playing' : 'Stopped'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}