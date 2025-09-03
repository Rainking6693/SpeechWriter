import { Handler } from '@netlify/functions'

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

interface RequestBody {
  speechSections: SpeechSection[]
  targetReductionSeconds: number
  aggressiveness: number // 0-100
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { speechSections, targetReductionSeconds, aggressiveness }: RequestBody = JSON.parse(event.body || '{}')

    if (!speechSections || typeof targetReductionSeconds !== 'number' || typeof aggressiveness !== 'number') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      }
    }

    const suggestions: CutSuggestion[] = []

    // Process each section
    speechSections.forEach((section, sectionIndex) => {
      if (!section.content) return

      const content = section.content
      const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0)

      sentences.forEach((sentence, sentenceIndex) => {
        const trimmedSentence = sentence.trim()
        if (trimmedSentence.length < 20) return

        const sectionSuggestions = analyzeSentenceForCuts(
          trimmedSentence,
          sectionIndex,
          sentenceIndex,
          section,
          aggressiveness
        )

        suggestions.push(...sectionSuggestions)
      })
    })

    // Sort suggestions by effectiveness
    const sortedSuggestions = suggestions
      .sort((a, b) => getSuggestionScore(b) - getSuggestionScore(a))
      .slice(0, 25) // Limit to top 25 suggestions

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        suggestions: sortedSuggestions,
        totalSuggestions: suggestions.length,
        maxReduction: suggestions.reduce((sum, s) => sum + s.savedSeconds, 0)
      })
    }
  } catch (error) {
    console.error('Error in cut-to-target function:', error)
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

function analyzeSentenceForCuts(
  sentence: string,
  sectionIndex: number,
  sentenceIndex: number,
  section: SpeechSection,
  aggressiveness: number
): CutSuggestion[] {
  const suggestions: CutSuggestion[] = []
  const words = sentence.split(' ')
  const wordCount = words.length

  // Skip very short sentences unless aggressiveness is high
  if (wordCount < 5 && aggressiveness < 70) return suggestions

  const baseSavedSeconds = (wordCount / 150) * 60 // Assuming 150 WPM

  // 1. Detect redundant phrases
  const redundantPatterns = [
    { pattern: /\b(as I mentioned|like I said|again|once more|as we discussed)\b/gi, saved: 3, reason: 'Removes redundant transitional phrases' },
    { pattern: /\b(it is important to note that|it should be noted that|it goes without saying)\b/gi, saved: 5, reason: 'Removes unnecessary introductory phrases' },
    { pattern: /\b(needless to say|obviously|clearly|of course)\b/gi, saved: 2, reason: 'Removes obvious qualifiers' }
  ]

  redundantPatterns.forEach((pattern, patternIndex) => {
    if (pattern.pattern.test(sentence)) {
      const cleaned = sentence.replace(pattern.pattern, '').replace(/\s+/g, ' ').trim()
      if (cleaned.length > 10) {
        suggestions.push({
          id: `redundant-${sectionIndex}-${sentenceIndex}-${patternIndex}`,
          type: 'redundant',
          severity: 'high',
          originalText: sentence,
          suggestedText: cleaned,
          savedWords: pattern.saved,
          savedSeconds: (pattern.saved / 150) * 60,
          reasoning: pattern.reason,
          sectionIndex,
          startIndex: 0,
          endIndex: sentence.length,
          preservesBeat: true,
          affectsCallback: sentence.includes('[CALLBACK]')
        })
      }
    }
  })

  // 2. Detect verbose expressions
  const verbosePatterns = [
    { pattern: /\bin order to\b/gi, replacement: 'to', saved: 2 },
    { pattern: /\bdue to the fact that\b/gi, replacement: 'because', saved: 4 },
    { pattern: /\bat this point in time\b/gi, replacement: 'now', saved: 4 },
    { pattern: /\bfor the purpose of\b/gi, replacement: 'to', saved: 3 },
    { pattern: /\bin the event that\b/gi, replacement: 'if', saved: 3 },
    { pattern: /\bwith regard to\b/gi, replacement: 'regarding', saved: 2 },
    { pattern: /\bin spite of the fact that\b/gi, replacement: 'although', saved: 5 }
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
        reasoning: 'Simplifies verbose expression for better flow',
        sectionIndex,
        startIndex: 0,
        endIndex: sentence.length,
        preservesBeat: true,
        affectsCallback: sentence.includes('[CALLBACK]')
      })
    }
  })

  // 3. Detect filler words and weak qualifiers
  const fillerWords = ['obviously', 'clearly', 'basically', 'literally', 'actually', 'really', 'very', 'quite', 'rather', 'somewhat', 'pretty much', 'kind of', 'sort of']
  
  fillerWords.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi')
    if (regex.test(sentence)) {
      const cleaned = sentence.replace(regex, '').replace(/\s+/g, ' ').trim()
      if (cleaned.length > 10) {
        suggestions.push({
          id: `filler-${sectionIndex}-${sentenceIndex}-${filler.replace(/\s+/g, '-')}`,
          type: 'filler',
          severity: aggressiveness > 30 ? 'medium' : 'low',
          originalText: sentence,
          suggestedText: cleaned,
          savedWords: filler.split(' ').length,
          savedSeconds: (filler.split(' ').length / 150) * 60,
          reasoning: `Removes filler word "${filler}" for more direct communication`,
          sectionIndex,
          startIndex: 0,
          endIndex: sentence.length,
          preservesBeat: true,
          affectsCallback: sentence.includes('[CALLBACK]')
        })
      }
    }
  })

  // 4. Detect wordy parenthetical statements
  const parentheticalMatch = sentence.match(/\(([^)]{20,})\)/)
  if (parentheticalMatch && aggressiveness > 50) {
    const withoutParenthetical = sentence.replace(/\([^)]+\)/, '').replace(/\s+/g, ' ').trim()
    if (withoutParenthetical.length > 15) {
      suggestions.push({
        id: `tangent-${sectionIndex}-${sentenceIndex}`,
        type: 'tangent',
        severity: 'medium',
        originalText: sentence,
        suggestedText: withoutParenthetical,
        savedWords: parentheticalMatch[1].split(' ').length + 2,
        savedSeconds: (parentheticalMatch[1].split(' ').length / 150) * 60,
        reasoning: 'Removes tangential parenthetical content to maintain focus',
        sectionIndex,
        startIndex: 0,
        endIndex: sentence.length,
        preservesBeat: true,
        affectsCallback: sentence.includes('[CALLBACK]')
      })
    }
  }

  // 5. Detect overly detailed examples (only if aggressive)
  if (aggressiveness > 70 && sentence.match(/\b(for example|for instance|such as|like when)\b/i) && wordCount > 20) {
    const shortened = sentence.substring(0, Math.floor(sentence.length * 0.65)) + '...'
    suggestions.push({
      id: `example-${sectionIndex}-${sentenceIndex}`,
      type: 'example',
      severity: 'medium',
      originalText: sentence,
      suggestedText: shortened,
      savedWords: Math.floor(wordCount * 0.35),
      savedSeconds: baseSavedSeconds * 0.35,
      reasoning: 'Shortens detailed example while preserving core message',
      sectionIndex,
      startIndex: 0,
      endIndex: sentence.length,
      preservesBeat: section.sectionType !== 'story' && section.sectionType !== 'conclusion',
      affectsCallback: sentence.includes('[CALLBACK]')
    })
  }

  // 6. Detect hedge language that weakens impact
  const hedgePatterns = [
    { pattern: /\bI think that\b/gi, replacement: '', saved: 3, reason: 'Removes weak qualifier for stronger statement' },
    { pattern: /\bI believe that\b/gi, replacement: '', saved: 3, reason: 'Removes weak qualifier for stronger statement' },
    { pattern: /\bit seems that\b/gi, replacement: '', saved: 3, reason: 'Removes uncertainty for more confident delivery' },
    { pattern: /\bperhaps\b/gi, replacement: '', saved: 1, reason: 'Removes uncertainty qualifier' }
  ]

  if (aggressiveness > 60) {
    hedgePatterns.forEach((pattern, patternIndex) => {
      if (pattern.pattern.test(sentence)) {
        const strengthened = sentence.replace(pattern.pattern, pattern.replacement).replace(/\s+/g, ' ').trim()
        if (strengthened.length > 10) {
          suggestions.push({
            id: `hedge-${sectionIndex}-${sentenceIndex}-${patternIndex}`,
            type: 'filler',
            severity: 'low',
            originalText: sentence,
            suggestedText: strengthened,
            savedWords: pattern.saved,
            savedSeconds: (pattern.saved / 150) * 60,
            reasoning: pattern.reason,
            sectionIndex,
            startIndex: 0,
            endIndex: sentence.length,
            preservesBeat: true,
            affectsCallback: sentence.includes('[CALLBACK]')
          })
        }
      }
    })
  }

  return suggestions
}

function getSuggestionScore(suggestion: CutSuggestion): number {
  let score = suggestion.savedSeconds

  // Boost score for high severity
  if (suggestion.severity === 'high') score *= 2
  if (suggestion.severity === 'medium') score *= 1.5

  // Boost score for redundant content (highest priority)
  if (suggestion.type === 'redundant') score *= 1.8
  if (suggestion.type === 'verbose') score *= 1.6
  if (suggestion.type === 'filler') score *= 1.4

  // Reduce score if affects story beats or callbacks
  if (!suggestion.preservesBeat) score *= 0.6
  if (suggestion.affectsCallback) score *= 0.4

  return score
}