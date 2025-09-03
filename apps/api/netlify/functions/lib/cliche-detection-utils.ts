import { generateAICompletion, parseJSONSafely } from './humanization-utils'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Comprehensive cliché database organized by category
export const CLICHE_DATABASE = {
  business: [
    'think outside the box',
    'low hanging fruit',
    'move the needle',
    'circle back',
    'touch base',
    'game changer',
    'synergy',
    'paradigm shift',
    'best practices',
    'win-win',
    'actionable insights',
    'core competency',
    'deliverables',
    'bandwidth',
    'deep dive',
    'drill down',
    'going forward',
    'take it to the next level',
    'push the envelope',
    'reinvent the wheel',
    'boil the ocean',
    'drinking from the fire hose',
    'eating our own dog food',
    'move the needle',
    'quick win',
    'value add',
    'table stakes',
    'moving parts',
    'ballpark figure',
    'pain point',
    'thought leader'
  ],
  
  general: [
    'at the end of the day',
    'when all is said and done',
    'it goes without saying',
    'needless to say',
    'last but not least',
    'for all intents and purposes',
    'in order to',
    'each and every',
    'at this point in time',
    'in today\'s day and age',
    'this day and age',
    'few and far between',
    'tried and true',
    'safe and sound',
    'first and foremost',
    'each and every one',
    'one and only',
    'null and void',
    'part and parcel',
    'peace and quiet',
    'beck and call',
    'trials and tribulations',
    'ups and downs',
    'ins and outs',
    'bits and pieces',
    'odds and ends'
  ],

  motivational: [
    'follow your dreams',
    'reach for the stars',
    'the sky\'s the limit',
    'anything is possible',
    'believe in yourself',
    'never give up',
    'stay positive',
    'think positive',
    'live life to the fullest',
    'seize the day',
    'carpe diem',
    'make every moment count',
    'life is short',
    'you only live once',
    'chase your passion',
    'find your purpose',
    'be yourself',
    'stay true to yourself',
    'follow your heart',
    'trust your gut'
  ],

  redundant: [
    'end result',
    'final outcome',
    'past history',
    'future plans',
    'personal opinion',
    'true facts',
    'close proximity',
    'exact same',
    'mutual cooperation',
    'basic fundamentals',
    'advance planning',
    'brief summary',
    'careful consideration',
    'complete monopoly',
    'consensus of opinion',
    'different varieties',
    'foreign imports',
    'free gift',
    'general public',
    'honest truth',
    'join together',
    'new innovation',
    'old adage',
    'past experience',
    'sudden impulse',
    'unexpected surprise'
  ]
}

// Trie data structure for efficient phrase matching
export class TrieNode {
  children: Map<string, TrieNode> = new Map()
  isEndOfPhrase: boolean = false
  phrase: string = ''
  category: string = ''
}

export class ClicheTrie {
  root: TrieNode = new TrieNode()

  constructor() {
    this.buildTrie()
  }

  private buildTrie() {
    Object.entries(CLICHE_DATABASE).forEach(([category, phrases]) => {
      phrases.forEach(phrase => {
        this.insert(phrase.toLowerCase(), category)
      })
    })
  }

  private insert(phrase: string, category: string) {
    let node = this.root
    const words = phrase.split(' ')

    for (const word of words) {
      if (!node.children.has(word)) {
        node.children.set(word, new TrieNode())
      }
      node = node.children.get(word)!
    }

    node.isEndOfPhrase = true
    node.phrase = phrase
    node.category = category
  }

  searchInText(text: string): Array<{
    phrase: string
    category: string
    start: number
    end: number
    context: string
  }> {
    const words = text.toLowerCase().split(/\s+/)
    const matches: Array<{
      phrase: string
      category: string
      start: number
      end: number
      context: string
    }> = []

    for (let i = 0; i < words.length; i++) {
      let node = this.root
      let j = i

      while (j < words.length && node.children.has(words[j])) {
        node = node.children.get(words[j])!
        j++

        if (node.isEndOfPhrase) {
          const phraseWords = words.slice(i, j)
          const phrase = phraseWords.join(' ')
          
          // Calculate actual character positions
          const textWords = text.split(/\s+/)
          let charStart = 0
          for (let k = 0; k < i; k++) {
            charStart += textWords[k].length + 1 // +1 for space
          }
          
          let charEnd = charStart
          for (let k = i; k < j; k++) {
            charEnd += textWords[k].length
            if (k < j - 1) charEnd += 1 // space
          }

          // Get context (30 chars before and after)
          const contextStart = Math.max(0, charStart - 30)
          const contextEnd = Math.min(text.length, charEnd + 30)
          const context = text.substring(contextStart, contextEnd)

          matches.push({
            phrase: node.phrase,
            category: node.category,
            start: charStart,
            end: charEnd,
            context
          })
        }
      }
    }

    return matches
  }
}

// Global trie instance
const clicheTrie = new ClicheTrie()

// Interfaces
export interface ClicheAnalysis {
  density: number
  detectedCliches: Array<{
    phrase: string
    category: string
    start: number
    end: number
    context: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
  }>
  totalTokens: number
  overallScore: number
  needsRewrite: boolean
  suggestions: RewriteSuggestion[]
}

export interface RewriteSuggestion {
  originalText: string
  start: number
  end: number
  alternatives: string[]
  reasoning: string
  confidence: number
}

export interface PlagiarismResult {
  similarityScore: number
  potentialMatches: Array<{
    text: string
    source: string
    similarity: number
    start: number
    end: number
  }>
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  needsRevision: boolean
}

/**
 * Perform comprehensive cliché analysis
 */
export async function analyzeClichesAdvanced(text: string): Promise<ClicheAnalysis> {
  // Use trie for fast phrase detection
  const trieMatches = clicheTrie.searchInText(text)
  
  // Enhance with AI analysis for contextual clichés
  const aiDetectedCliches = await detectContextualCliches(text)
  
  // Combine results and remove duplicates
  const allCliches = [...trieMatches, ...aiDetectedCliches]
  const uniqueCliches = deduplicateCliches(allCliches)
  
  // Calculate metrics
  const tokens = text.split(/\s+/)
  const density = (uniqueCliches.length / tokens.length) * 100
  const overallScore = calculateClicheScore(uniqueCliches, text)
  const needsRewrite = density > 0.8 || overallScore < 7.0
  
  // Generate rewrite suggestions for detected clichés
  const suggestions = await generateRewriteSuggestions(uniqueCliches, text)
  
  return {
    density,
    detectedCliches: uniqueCliches.map(cliche => ({
      ...cliche,
      severity: getSeverity(cliche.category, density)
    })),
    totalTokens: tokens.length,
    overallScore,
    needsRewrite,
    suggestions
  }
}

/**
 * Use AI to detect contextual and subtle clichés
 */
async function detectContextualCliches(text: string) {
  const systemPrompt = `You are an expert editor specializing in identifying clichéd language and overused phrases. Look for:

1. Overused metaphors and analogies
2. Tired expressions and sayings  
3. Generic motivational language
4. Business jargon and buzzwords
5. Redundant phrases
6. Predictable transitions
7. Worn-out comparisons

Return JSON format:
{
  "cliches": [
    {
      "phrase": "detected cliché",
      "category": "business|motivational|general|redundant|metaphor",
      "start": start_position,
      "end": end_position,
      "context": "surrounding text for context"
    }
  ]
}

Be selective - focus on truly overused and uninspired language.`

  try {
    const { result } = await generateAICompletion({
      systemPrompt,
      userPrompt: `Identify clichéd language in this speech text:\n\n${text}`,
      temperature: 0.2,
      maxTokens: 1000
    })

    const parsed = parseJSONSafely(result)
    return parsed?.cliches || []
  } catch (error) {
    console.error('AI cliché detection error:', error)
    return []
  }
}

/**
 * Remove duplicate cliché detections
 */
function deduplicateCliches(cliches: any[]) {
  const seen = new Set<string>()
  return cliches.filter(cliche => {
    const key = `${cliche.start}-${cliche.end}-${cliche.phrase}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Calculate overall cliché score (1-10, higher is better)
 */
function calculateClicheScore(cliches: any[], text: string): number {
  if (cliches.length === 0) return 10

  const tokens = text.split(/\s+/).length
  const density = (cliches.length / tokens) * 100
  
  // Penalty factors
  let score = 10
  
  // Density penalty
  if (density > 2) score -= 4
  else if (density > 1) score -= 2
  else if (density > 0.5) score -= 1
  
  // Category penalties
  const businessCount = cliches.filter(c => c.category === 'business').length
  const motivationalCount = cliches.filter(c => c.category === 'motivational').length
  
  if (businessCount > 2) score -= 1
  if (motivationalCount > 3) score -= 2
  
  return Math.max(1, score)
}

/**
 * Determine severity based on category and overall density
 */
function getSeverity(category: string, density: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (density > 2 || category === 'business') return 'HIGH'
  if (density > 1 || category === 'redundant') return 'MEDIUM'
  return 'LOW'
}

/**
 * Generate AI-powered rewrite suggestions for clichés
 */
async function generateRewriteSuggestions(
  cliches: any[], 
  text: string
): Promise<RewriteSuggestion[]> {
  const suggestions: RewriteSuggestion[] = []

  // Limit to top 5 most severe clichés for performance
  const prioritizedCliches = cliches
    .sort((a, b) => {
      const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
    .slice(0, 5)

  for (const cliche of prioritizedCliches) {
    try {
      const contextStart = Math.max(0, cliche.start - 50)
      const contextEnd = Math.min(text.length, cliche.end + 50)
      const context = text.substring(contextStart, contextEnd)

      const systemPrompt = `You are a skilled speech writer. Replace the highlighted cliché with fresh, original language that maintains the same meaning but is more engaging and specific.

Provide 3 alternative replacements that:
1. Preserve the original meaning
2. Match the tone and context
3. Are more specific and vivid
4. Avoid other clichés

Return JSON format:
{
  "alternatives": ["option 1", "option 2", "option 3"],
  "reasoning": "explanation of why these work better"
}`

      const { result } = await generateAICompletion({
        systemPrompt,
        userPrompt: `Replace the cliché "${cliche.phrase}" in this context:\n\n${context}\n\nThe cliché appears in: "${cliche.phrase}"`,
        temperature: 0.7,
        maxTokens: 300
      })

      const parsed = parseJSONSafely(result)
      if (parsed?.alternatives) {
        suggestions.push({
          originalText: cliche.phrase,
          start: cliche.start,
          end: cliche.end,
          alternatives: parsed.alternatives,
          reasoning: parsed.reasoning || 'AI-generated alternatives',
          confidence: 0.8
        })
      }
    } catch (error) {
      console.error('Error generating rewrite suggestion:', error)
    }
  }

  return suggestions
}

/**
 * Check for potential plagiarism using similarity analysis
 */
export async function checkPlagiarism(text: string): Promise<PlagiarismResult> {
  // This is a simplified version - real implementation would check against databases
  const commonSpeechPatterns = await detectCommonPatterns(text)
  
  return {
    similarityScore: commonSpeechPatterns.maxSimilarity,
    potentialMatches: commonSpeechPatterns.matches,
    overallRisk: commonSpeechPatterns.maxSimilarity > 0.8 ? 'HIGH' : 
                 commonSpeechPatterns.maxSimilarity > 0.6 ? 'MEDIUM' : 'LOW',
    needsRevision: commonSpeechPatterns.maxSimilarity > 0.7
  }
}

/**
 * Detect common speech patterns that might indicate plagiarism
 */
async function detectCommonPatterns(text: string) {
  const systemPrompt = `You are an expert at detecting common speech patterns and potentially plagiarized content. Look for:

1. Overly familiar phrases and structures
2. Common speech openings and closings
3. Well-known quote patterns
4. Frequently used transitions
5. Generic speech frameworks

Return JSON format:
{
  "maxSimilarity": 0.0-1.0,
  "matches": [
    {
      "text": "potentially plagiarized text",
      "source": "likely source type",
      "similarity": 0.0-1.0,
      "start": start_position,
      "end": end_position
    }
  ]
}

Be conservative - only flag clearly problematic content.`

  try {
    const { result } = await generateAICompletion({
      systemPrompt,
      userPrompt: `Analyze this speech for common patterns and potential plagiarism:\n\n${text}`,
      temperature: 0.1,
      maxTokens: 800
    })

    const parsed = parseJSONSafely(result)
    return {
      maxSimilarity: parsed?.maxSimilarity || 0,
      matches: parsed?.matches || []
    }
  } catch (error) {
    console.error('Plagiarism check error:', error)
    return { maxSimilarity: 0, matches: [] }
  }
}

/**
 * Get cliché statistics for reporting
 */
export function getClicheStatistics(text: string) {
  const matches = clicheTrie.searchInText(text)
  const tokens = text.split(/\s+/).length
  
  const categoryStats = matches.reduce((acc, match) => {
    acc[match.category] = (acc[match.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    totalDetected: matches.length,
    density: (matches.length / tokens) * 100,
    categoryCounts: categoryStats,
    mostCommonCategory: Object.keys(categoryStats).reduce((a, b) => 
      categoryStats[a] > categoryStats[b] ? a : b, 'none'
    )
  }
}

export { clicheTrie }