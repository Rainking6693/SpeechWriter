'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { 
  Scissors, 
  Target, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Undo,
  Eye,
  EyeOff,
  Zap,
  TrendingDown,
  BarChart3,
  FileText
} from 'lucide-react'

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
  sectionType: string | null
}

interface CutToTargetProps {
  speechSections: SpeechSection[]
  targetDurationMinutes: number
  currentDurationMinutes: number
  onApplyCuts: (cuts: CutSuggestion[]) => void
}

export function CutToTarget({ 
  speechSections, 
  targetDurationMinutes, 
  currentDurationMinutes,
  onApplyCuts 
}: CutToTargetProps) {
  const [targetReduction, setTargetReduction] = useState(0)
  const [suggestions, setSuggestions] = useState<CutSuggestion[]>([])
  const [selectedCuts, setSelectedCuts] = useState<Set<string>>(new Set())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewSection, setPreviewSection] = useState<number | null>(null)
  const [aggressiveness, setAggressiveness] = useState(50) // 0-100 scale

  // Calculate reduction needed
  const reductionNeeded = Math.max(0, currentDurationMinutes - targetDurationMinutes)
  const reductionSeconds = reductionNeeded * 60

  // Calculate selected cuts impact
  const selectedCutsImpact = useMemo(() => {
    const selectedSuggestions = suggestions.filter(s => selectedCuts.has(s.id))
    const totalWordsSaved = selectedSuggestions.reduce((sum, s) => sum + s.savedWords, 0)
    const totalSecondsSaved = selectedSuggestions.reduce((sum, s) => sum + s.savedSeconds, 0)
    const affectsCallbacks = selectedSuggestions.some(s => s.affectsCallback)
    const affectsBeats = selectedSuggestions.some(s => !s.preservesBeat)
    
    return {
      totalWordsSaved,
      totalSecondsSaved,
      totalMinutesSaved: totalSecondsSaved / 60,
      affectsCallbacks,
      affectsBeats,
      count: selectedSuggestions.length
    }
  }, [suggestions, selectedCuts])

  // Initialize target reduction when component mounts
  useEffect(() => {
    setTargetReduction(reductionNeeded)
  }, [reductionNeeded])

  const analyzeSpeechForCuts = async () => {
    setIsAnalyzing(true)
    setSuggestions([])
    
    try {
      // Simulate API call for AI-powered analysis
      const allSuggestions: CutSuggestion[] = []
      
      speechSections.forEach((section, sectionIndex) => {
        if (!section.content) return
        
        const content = section.content
        const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0)
        
        sentences.forEach((sentence, sentenceIndex) => {
          const trimmedSentence = sentence.trim()
          if (trimmedSentence.length < 20) return
          
          // Identify different types of cuts based on heuristics
          const suggestions = identifyPotentialCuts(
            trimmedSentence, 
            sectionIndex, 
            sentenceIndex,
            section,
            aggressiveness
          )
          
          allSuggestions.push(...suggestions)
        })
      })
      
      // Sort by impact and severity
      const sortedSuggestions = allSuggestions
        .sort((a, b) => {
          // Prioritize high severity cuts that preserve story beats
          const scoreA = getSuggestionScore(a)
          const scoreB = getSuggestionScore(b)
          return scoreB - scoreA
        })
        .slice(0, 20) // Limit to top 20 suggestions
      
      setSuggestions(sortedSuggestions)
      
      // Auto-select cuts that meet target reduction
      autoSelectCuts(sortedSuggestions, targetReduction * 60)
      
    } catch (error) {
      console.error('Error analyzing speech for cuts:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  const identifyPotentialCuts = (
    sentence: string, 
    sectionIndex: number, 
    sentenceIndex: number,
    section: SpeechSection,
    aggressiveness: number
  ): CutSuggestion[] => {
    const suggestions: CutSuggestion[] = []
    const words = sentence.split(' ')
    const wordCount = words.length
    
    // Skip very short sentences unless aggressiveness is high
    if (wordCount < 5 && aggressiveness < 70) return suggestions
    
    const baseSavedSeconds = (wordCount / 150) * 60 // Assuming 150 WPM
    
    // Detect redundant phrases
    if (sentence.match(/\b(as I mentioned|like I said|again|once more|as we discussed)\b/i)) {
      suggestions.push({
        id: `redundant-${sectionIndex}-${sentenceIndex}`,
        type: 'redundant',
        severity: 'high',
        originalText: sentence,
        suggestedText: sentence.replace(/\b(as I mentioned|like I said|again|once more|as we discussed)\b/gi, '').trim(),
        savedWords: 3,
        savedSeconds: baseSavedSeconds * 0.2,
        reasoning: 'Removes redundant transitional phrases',
        sectionIndex,
        startIndex: 0,
        endIndex: sentence.length,
        preservesBeat: true,
        affectsCallback: false
      })
    }
    
    // Detect verbose expressions that can be simplified
    const verbosePatterns = [
      { pattern: /\bin order to\b/gi, replacement: 'to', saved: 2 },
      { pattern: /\bdue to the fact that\b/gi, replacement: 'because', saved: 4 },
      { pattern: /\bat this point in time\b/gi, replacement: 'now', saved: 4 },
      { pattern: /\bfor the purpose of\b/gi, replacement: 'to', saved: 3 },
      { pattern: /\bin the event that\b/gi, replacement: 'if', saved: 3 }
    ]
    
    verbosePatterns.forEach((pattern, patternIndex) => {
      if (pattern.pattern.test(sentence)) {
        const simplified = sentence.replace(pattern.pattern, pattern.replacement)
        suggestions.push({
          id: `verbose-${sectionIndex}-${sentenceIndex}-${patternIndex}`,
          type: 'verbose',
          severity: aggressiveness > 40 ? 'medium' : 'low',
          originalText: sentence,
          suggestedText: simplified,
          savedWords: pattern.saved,
          savedSeconds: (pattern.saved / 150) * 60,
          reasoning: 'Simplifies verbose expression',
          sectionIndex,
          startIndex: 0,
          endIndex: sentence.length,
          preservesBeat: true,
          affectsCallback: false
        })
      }
    })
    
    // Detect filler content (weak qualifiers, hedging language)
    if (sentence.match(/\b(obviously|clearly|basically|literally|actually|really|very|quite|rather|somewhat)\b/gi)) {
      const cleaned = sentence.replace(/\b(obviously|clearly|basically|literally|actually|really|very|quite|rather|somewhat)\b/gi, '').replace(/\s+/g, ' ').trim()
      if (cleaned.length > 10) {
        suggestions.push({
          id: `filler-${sectionIndex}-${sentenceIndex}`,
          type: 'filler',
          severity: aggressiveness > 30 ? 'medium' : 'low',
          originalText: sentence,
          suggestedText: cleaned,
          savedWords: Math.floor(wordCount * 0.15),
          savedSeconds: baseSavedSeconds * 0.15,
          reasoning: 'Removes filler words and weak qualifiers',
          sectionIndex,
          startIndex: 0,
          endIndex: sentence.length,
          preservesBeat: true,
          affectsCallback: false
        })
      }
    }
    
    // Detect potential examples that could be shortened (if aggressive enough)
    if (aggressiveness > 60 && sentence.match(/\b(for example|for instance|such as|like when)\b/i) && wordCount > 15) {
      const shortened = sentence.substring(0, Math.floor(sentence.length * 0.7)) + '...'
      suggestions.push({
        id: `example-${sectionIndex}-${sentenceIndex}`,
        type: 'example',
        severity: 'medium',
        originalText: sentence,
        suggestedText: shortened,
        savedWords: Math.floor(wordCount * 0.3),
        savedSeconds: baseSavedSeconds * 0.3,
        reasoning: 'Shortens detailed example while preserving meaning',
        sectionIndex,
        startIndex: 0,
        endIndex: sentence.length,
        preservesBeat: section.sectionType !== 'story' && section.sectionType !== 'conclusion',
        affectsCallback: sentence.includes('[CALLBACK]')
      })
    }
    
    // Detect potential tangents (long parenthetical statements)
    const parentheticalMatch = sentence.match(/\(([^)]{20,})\)/)
    if (parentheticalMatch && aggressiveness > 50) {
      const withoutParenthetical = sentence.replace(/\([^)]+\)/, '').replace(/\s+/g, ' ').trim()
      suggestions.push({
        id: `tangent-${sectionIndex}-${sentenceIndex}`,
        type: 'tangent',
        severity: 'medium',
        originalText: sentence,
        suggestedText: withoutParenthetical,
        savedWords: parentheticalMatch[1].split(' ').length + 2,
        savedSeconds: (parentheticalMatch[1].split(' ').length / 150) * 60,
        reasoning: 'Removes tangential parenthetical content',
        sectionIndex,
        startIndex: 0,
        endIndex: sentence.length,
        preservesBeat: true,
        affectsCallback: false
      })
    }
    
    return suggestions
  }
  
  const getSuggestionScore = (suggestion: CutSuggestion): number => {
    let score = suggestion.savedSeconds
    
    // Boost score for high severity
    if (suggestion.severity === 'high') score *= 2
    if (suggestion.severity === 'medium') score *= 1.5
    
    // Reduce score if affects story beats or callbacks
    if (!suggestion.preservesBeat) score *= 0.7
    if (suggestion.affectsCallback) score *= 0.5
    
    return score
  }
  
  const autoSelectCuts = (suggestions: CutSuggestion[], targetSeconds: number) => {
    const selected = new Set<string>()
    let currentSavings = 0
    
    // Sort by score and select until we reach target
    const sortedByScore = [...suggestions].sort((a, b) => getSuggestionScore(b) - getSuggestionScore(a))
    
    for (const suggestion of sortedByScore) {
      if (currentSavings >= targetSeconds) break
      
      // Prefer cuts that don't affect story beats
      if (suggestion.preservesBeat && !suggestion.affectsCallback) {
        selected.add(suggestion.id)
        currentSavings += suggestion.savedSeconds
      }
    }
    
    // If we haven't reached target, add more aggressive cuts
    if (currentSavings < targetSeconds) {
      for (const suggestion of sortedByScore) {
        if (currentSavings >= targetSeconds) break
        if (!selected.has(suggestion.id)) {
          selected.add(suggestion.id)
          currentSavings += suggestion.savedSeconds
        }
      }
    }
    
    setSelectedCuts(selected)
  }
  
  const toggleCutSelection = (suggestionId: string) => {
    const newSelected = new Set(selectedCuts)
    if (newSelected.has(suggestionId)) {
      newSelected.delete(suggestionId)
    } else {
      newSelected.add(suggestionId)
    }
    setSelectedCuts(newSelected)
  }
  
  const applyCuts = () => {
    const selectedSuggestions = suggestions.filter(s => selectedCuts.has(s.id))
    onApplyCuts(selectedSuggestions)
  }
  
  const getSeverityColor = (severity: CutSuggestion['severity']) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }
  
  const getTypeIcon = (type: CutSuggestion['type']) => {
    switch (type) {
      case 'redundant': return <TrendingDown className="w-4 h-4" />
      case 'filler': return <Zap className="w-4 h-4" />
      case 'verbose': return <FileText className="w-4 h-4" />
      case 'tangent': return <BarChart3 className="w-4 h-4" />
      case 'example': return <Eye className="w-4 h-4" />
      default: return <Scissors className="w-4 h-4" />
    }
  }
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Target Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Cut to Target Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{currentDurationMinutes.toFixed(1)}m</div>
              <div className="text-sm text-gray-600">Current Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{targetDurationMinutes.toFixed(1)}m</div>
              <div className="text-sm text-gray-600">Target Duration</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${reductionNeeded > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {reductionNeeded > 0 ? '-' : ''}{Math.abs(reductionNeeded).toFixed(1)}m
              </div>
              <div className="text-sm text-gray-600">
                {reductionNeeded > 0 ? 'Needs Cutting' : 'On Target'}
              </div>
            </div>
          </div>
          
          {reductionNeeded > 0 && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Aggressiveness: {aggressiveness}%
                </label>
                <Slider
                  value={[aggressiveness]}
                  onValueChange={([value]) => setAggressiveness(value)}
                  min={10}
                  max={100}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Conservative (preserves all content)</span>
                  <span>Aggressive (prioritizes time over detail)</span>
                </div>
              </div>
              
              <Button 
                onClick={analyzeSpeechForCuts} 
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing Speech...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4 mr-2" />
                    Find Cuts
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cut Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Cut Suggestions ({suggestions.length})</span>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">
                  {selectedCutsImpact.count} selected
                </Badge>
                <Badge variant="outline">
                  -{formatTime(selectedCutsImpact.totalSecondsSaved)} saved
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress toward target */}
            {reductionNeeded > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress toward target</span>
                  <span>
                    {formatTime(selectedCutsImpact.totalSecondsSaved)} / {formatTime(reductionSeconds)}
                  </span>
                </div>
                <Progress 
                  value={(selectedCutsImpact.totalSecondsSaved / reductionSeconds) * 100} 
                  className="h-2" 
                />
              </div>
            )}
            
            {/* Warnings */}
            {(selectedCutsImpact.affectsCallbacks || selectedCutsImpact.affectsBeats) && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800">Warning</div>
                  <div className="text-yellow-700">
                    {selectedCutsImpact.affectsCallbacks && 'Some cuts may affect story callbacks. '}
                    {selectedCutsImpact.affectsBeats && 'Some cuts may impact rhetorical effectiveness.'}
                  </div>
                </div>
              </div>
            )}
            
            {/* Suggestion List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedCuts.has(suggestion.id) 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => toggleCutSelection(suggestion.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(suggestion.type)}
                      <Badge className={`text-xs ${getSeverityColor(suggestion.severity)}`}>
                        {suggestion.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        -{suggestion.savedWords} words
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        -{formatTime(suggestion.savedSeconds)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {!suggestion.preservesBeat && (
                        <AlertCircle className="w-4 h-4 text-yellow-500" title="May affect story flow" />
                      )}
                      {suggestion.affectsCallback && (
                        <AlertCircle className="w-4 h-4 text-red-500" title="Affects callback" />
                      )}
                      {selectedCuts.has(suggestion.id) && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {suggestion.reasoning}
                  </div>
                  
                  {showPreview && previewSection === suggestions.indexOf(suggestion) && (
                    <div className="space-y-2 text-sm">
                      <div>
                        <div className="font-medium text-red-600 mb-1">Original:</div>
                        <div className="bg-red-50 p-2 rounded border">
                          {suggestion.originalText}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-green-600 mb-1">Suggested:</div>
                        <div className="bg-green-50 p-2 rounded border">
                          {suggestion.suggestedText}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      const suggestionIndex = suggestions.indexOf(suggestion)
                      setPreviewSection(
                        previewSection === suggestionIndex ? null : suggestionIndex
                      )
                      setShowPreview(previewSection !== suggestionIndex)
                    }}
                    className="mt-2"
                  >
                    {showPreview && previewSection === suggestions.indexOf(suggestion) ? (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        Hide Preview
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        Show Preview
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
            
            {/* Apply Cuts */}
            {selectedCuts.size > 0 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  {selectedCutsImpact.count} cuts selected • 
                  {selectedCutsImpact.totalWordsSaved} words • 
                  {formatTime(selectedCutsImpact.totalSecondsSaved)} saved
                </div>
                <Button onClick={applyCuts}>
                  <Scissors className="w-4 h-4 mr-2" />
                  Apply {selectedCuts.size} Cuts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {reductionNeeded <= 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-800 mb-2">Perfect Timing!</h3>
            <p className="text-green-600">
              Your speech is already at the target duration of {targetDurationMinutes} minutes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}