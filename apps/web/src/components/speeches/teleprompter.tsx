'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  Square, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Settings,
  Timer,
  Clock
} from 'lucide-react'

interface TeleprompterProps {
  speechText: string
  targetDurationMinutes: number
  onComplete?: () => void
}

interface ParsedLine {
  text: string
  type: 'text' | 'pause' | 'emphasize' | 'callback'
  duration?: number // For pauses in seconds
}

export function Teleprompter({ speechText, targetDurationMinutes, onComplete }: TeleprompterProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [wpm, setWpm] = useState(150) // Words per minute
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [fontSize, setFontSize] = useState(36)
  const [lineHeight, setLineHeight] = useState(1.6)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout>()
  const startTimeRef = useRef<number>()
  
  // Parse speech text into structured lines
  const parsedLines = useCallback((): ParsedLine[] => {
    const lines = speechText.split('\n').filter(line => line.trim())
    const parsed: ParsedLine[] = []
    
    lines.forEach(line => {
      // Check for special tags
      if (line.includes('[PAUSE]')) {
        const parts = line.split('[PAUSE]')
        parts.forEach((part, index) => {
          if (part.trim()) {
            parsed.push({ text: part.trim(), type: 'text' })
          }
          if (index < parts.length - 1) {
            parsed.push({ text: '● ● ●', type: 'pause', duration: 2 })
          }
        })
      } else if (line.includes('[EMPHASIZE]')) {
        const cleanLine = line.replace(/\[EMPHASIZE\]/g, '').trim()
        if (cleanLine) {
          parsed.push({ text: cleanLine, type: 'emphasize' })
        }
      } else if (line.includes('[CALLBACK]')) {
        const cleanLine = line.replace(/\[CALLBACK\]/g, '').trim()
        if (cleanLine) {
          parsed.push({ text: cleanLine, type: 'callback' })
        }
      } else if (line.trim()) {
        parsed.push({ text: line.trim(), type: 'text' })
      }
    })
    
    return parsed
  }, [speechText])()

  // Calculate scroll timing based on WPM
  const calculateLineTime = useCallback((line: ParsedLine): number => {
    if (line.type === 'pause') {
      return (line.duration || 2) * 1000 // Convert to milliseconds
    }
    
    const words = line.text.split(' ').length
    const timePerWord = 60000 / wpm // milliseconds per word
    const baseTime = words * timePerWord
    
    // Add extra time for emphasis
    if (line.type === 'emphasize') {
      return baseTime * 1.3
    }
    
    return baseTime
  }, [wpm])

  // Auto-scroll functionality
  useEffect(() => {
    if (!isPlaying || currentLineIndex >= parsedLines.length) {
      return
    }

    const currentLine = parsedLines[currentLineIndex]
    const lineTime = calculateLineTime(currentLine)
    
    timerRef.current = setTimeout(() => {
      setCurrentLineIndex(prev => prev + 1)
    }, lineTime)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isPlaying, currentLineIndex, parsedLines, calculateLineTime])

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isPlaying && startTimeRef.current) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current!)
      }, 100)
    }
    
    return () => clearInterval(interval)
  }, [isPlaying])

  // Auto-scroll to current line
  useEffect(() => {
    if (scrollContainerRef.current && currentLineIndex < parsedLines.length) {
      const currentElement = scrollContainerRef.current.children[currentLineIndex] as HTMLElement
      if (currentElement) {
        const containerHeight = scrollContainerRef.current.clientHeight
        const elementTop = currentElement.offsetTop
        const elementHeight = currentElement.clientHeight
        const scrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2)
        
        scrollContainerRef.current.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        })
      }
    }
  }, [currentLineIndex, parsedLines.length])

  const handlePlay = () => {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now() - elapsedTime
    }
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleStop = () => {
    setIsPlaying(false)
    setCurrentLineIndex(0)
    setElapsedTime(0)
    startTimeRef.current = undefined
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleReset = () => {
    handleStop()
  }

  const toggleFullScreen = async () => {
    if (!containerRef.current) return
    
    if (!isFullScreen) {
      try {
        await containerRef.current.requestFullscreen()
        setIsFullScreen(true)
      } catch (error) {
        console.error('Failed to enter fullscreen:', error)
      }
    } else {
      try {
        await document.exitFullscreen()
        setIsFullScreen(false)
      } catch (error) {
        console.error('Failed to exit fullscreen:', error)
      }
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (isPlaying) {
          handlePause()
        } else {
          handlePlay()
        }
      } else if (e.code === 'Escape') {
        if (isFullScreen) {
          toggleFullScreen()
        }
      } else if (e.code === 'KeyR') {
        handleReset()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, isFullScreen])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getProgress = () => {
    return (currentLineIndex / Math.max(parsedLines.length, 1)) * 100
  }

  const getLineStyle = (line: ParsedLine, index: number) => {
    let baseClass = 'transition-all duration-300 px-8 py-4 rounded-lg mx-4 '
    
    if (index === currentLineIndex) {
      baseClass += 'bg-blue-100 dark:bg-blue-900/20 scale-105 shadow-lg '
    } else if (index < currentLineIndex) {
      baseClass += 'opacity-40 '
    } else {
      baseClass += 'opacity-70 '
    }
    
    switch (line.type) {
      case 'emphasize':
        baseClass += 'font-bold text-blue-600 dark:text-blue-400 '
        break
      case 'pause':
        baseClass += 'text-gray-500 text-center italic text-2xl '
        break
      case 'callback':
        baseClass += 'text-purple-600 dark:text-purple-400 border-l-4 border-purple-400 pl-6 '
        break
      default:
        baseClass += 'text-gray-900 dark:text-gray-100 '
    }
    
    return baseClass
  }

  if (showSettings) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Teleprompter Settings
            <Button variant="ghost" onClick={() => setShowSettings(false)}>
              Back
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Speaking Speed: {wpm} WPM
            </label>
            <Slider
              value={[wpm]}
              onValueChange={([value]) => setWpm(value)}
              min={80}
              max={250}
              step={5}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Font Size: {fontSize}px
            </label>
            <Slider
              value={[fontSize]}
              onValueChange={([value]) => setFontSize(value)}
              min={20}
              max={60}
              step={2}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Line Height: {lineHeight}
            </label>
            <Slider
              value={[lineHeight]}
              onValueChange={([value]) => setLineHeight(value)}
              min={1.2}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full flex flex-col bg-white dark:bg-gray-900 ${
        isFullScreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Control Bar */}
      <div className={`flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900 ${
        isFullScreen ? 'bg-black/90 text-white' : ''
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isPlaying ? "destructive" : "default"}
              onClick={isPlaying ? handlePause : handlePlay}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={handleStop}>
              <Square className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatTime(elapsedTime)}</span>
              <span className="text-gray-500">/ {targetDurationMinutes}:00</span>
            </div>
            <Badge variant="outline">{wpm} WPM</Badge>
            <Badge variant="outline">
              {Math.round(getProgress())}%
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={toggleFullScreen}>
            {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 h-1">
        <div 
          className="bg-blue-500 h-1 transition-all duration-300"
          style={{ width: `${getProgress()}%` }}
        />
      </div>

      {/* Teleprompter Display */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <div className="py-12">
          {parsedLines.map((line, index) => (
            <div
              key={index}
              className={getLineStyle(line, index)}
              style={{ 
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight
              }}
            >
              {line.text}
            </div>
          ))}
          
          {/* Completion message */}
          {currentLineIndex >= parsedLines.length && (
            <div className="text-center py-12">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-4">
                🎉 Speech Complete!
              </div>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Total time: {formatTime(elapsedTime)}
              </p>
              {onComplete && (
                <Button onClick={onComplete} className="mt-4">
                  Save Session
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Keyboard shortcuts hint */}
      <div className="text-xs text-gray-500 p-2 text-center border-t">
        Shortcuts: Space (play/pause) • R (reset) • Esc (exit fullscreen)
      </div>
    </div>
  )
}