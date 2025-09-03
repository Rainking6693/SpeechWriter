import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { 
  speeches, 
  speechSections, 
  personas, 
  styleCards, 
  humanizationPasses,
  criticFeedback,
  clicheAnalysis 
} from '@speechwriter/database/schema'
import OpenAI from 'openai'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client, { 
  schema: { 
    speeches, 
    speechSections, 
    personas, 
    styleCards, 
    humanizationPasses,
    criticFeedback,
    clicheAnalysis 
  } 
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Common clichés for density scoring
const COMMON_CLICHES = [
  'at the end of the day',
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
  'move forward',
  'at this point in time',
  'each and every',
  'in order to',
  'for all intents and purposes',
  'last but not least',
  'needless to say',
  'it goes without saying',
  'when all is said and done'
]

// Rhetorical devices patterns
export const RHETORICAL_PATTERNS = {
  anaphora: [
    'We must {action}. We must {action}. We must {action}.',
    'It is {quality}. It is {quality}. It is {quality}.',
    'Today we {verb}. Today we {verb}. Today we {verb}.'
  ],
  triads: [
    '{concept}, {concept}, and {concept}',
    'We need {quality}, {quality}, and {quality}',
    'The path forward requires {action}, {action}, and {action}'
  ],
  callbacks: [
    'Remember when I mentioned {reference}? This is why.',
    'This brings us back to {reference}.',
    'As I said about {reference}, this proves the point.'
  ]
}

/**
 * Calculate cliché density in text
 */
export function calculateClicheDensity(text: string): {
  density: number
  detectedCliches: string[]
  totalTokens: number
} {
  const tokens = text.toLowerCase().split(/\s+/)
  const detectedCliches: string[] = []
  
  // Check for each cliché phrase
  const textLower = text.toLowerCase()
  COMMON_CLICHES.forEach(cliche => {
    if (textLower.includes(cliche)) {
      detectedCliches.push(cliche)
    }
  })
  
  // Calculate density per 100 tokens
  const density = detectedCliches.length > 0 
    ? (detectedCliches.length / tokens.length) * 100 
    : 0
    
  return {
    density,
    detectedCliches,
    totalTokens: tokens.length
  }
}

/**
 * Calculate stylometry distance between text and persona
 */
export function calculateStylometry(text: string, styleCard: any): {
  distance: number
  metrics: {
    avgSentenceLength: number
    targetSentenceLength: number
    sentenceLengthDiff: number
    punctuationDensity: number
    complexityScore: number
  }
} {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  
  // Calculate current metrics
  const avgSentenceLength = words.length / sentences.length
  const punctuationDensity = (text.match(/[,.;:()]/g)?.length || 0) / words.length
  const complexityScore = words.filter(w => w.length > 6).length / words.length
  
  // Compare with target style card
  const targetSentenceLength = styleCard?.avgSentenceLength || 15
  const sentenceLengthDiff = Math.abs(avgSentenceLength - targetSentenceLength)
  
  // Simple distance calculation (can be made more sophisticated)
  const distance = (sentenceLengthDiff / targetSentenceLength) * 0.7 + 
                  (Math.abs(punctuationDensity - 0.1) / 0.1) * 0.3
  
  return {
    distance,
    metrics: {
      avgSentenceLength,
      targetSentenceLength,
      sentenceLengthDiff,
      punctuationDensity,
      complexityScore
    }
  }
}

/**
 * Save humanization pass to database
 */
export async function saveHumanizationPass({
  speechId,
  passType,
  inputText,
  outputText,
  passOrder,
  changes,
  metrics,
  processingTimeMs,
  modelUsed = 'gpt-4',
  promptVersion = '1.0'
}: {
  speechId: string
  passType: string
  inputText: string
  outputText: string
  passOrder: number
  changes?: any
  metrics?: any
  processingTimeMs: number
  modelUsed?: string
  promptVersion?: string
}) {
  const [pass] = await db
    .insert(humanizationPasses)
    .values({
      speechId,
      passType,
      inputText,
      outputText,
      passOrder,
      changes,
      metrics,
      processingTimeMs,
      modelUsed,
      promptVersion
    })
    .returning()
  
  return pass
}

/**
 * Save critic feedback to database
 */
export async function saveCriticFeedback({
  humanizationPassId,
  criticType,
  scores,
  suggestions,
  feedback,
  acceptedEdits
}: {
  humanizationPassId: string
  criticType: string
  scores: {
    specificity: number
    freshness: number
    performability: number
    personaFit: number
    overall: number
  }
  suggestions: any[]
  feedback: string
  acceptedEdits?: any[]
}) {
  const [critic] = await db
    .insert(criticFeedback)
    .values({
      humanizationPassId,
      criticType,
      specificityScore: scores.specificity,
      freshnessScore: scores.freshness,
      performabilityScore: scores.performability,
      personaFitScore: scores.personaFit,
      overallScore: scores.overall,
      suggestions,
      feedback,
      acceptedEdits
    })
    .returning()
  
  return critic
}

/**
 * Save cliché analysis to database
 */
export async function saveClicheAnalysis({
  speechId,
  textSample,
  detectedCliches,
  clicheDensity,
  replacementSuggestions,
  overallScore
}: {
  speechId: string
  textSample: string
  detectedCliches: string[]
  clicheDensity: number
  replacementSuggestions: any[]
  overallScore: number
}) {
  const [analysis] = await db
    .insert(clicheAnalysis)
    .values({
      speechId,
      textSample,
      detectedCliches,
      clicheDensity,
      replacementSuggestions,
      overallScore
    })
    .returning()
  
  return analysis
}

/**
 * Get user's persona and style card
 */
export async function getUserPersona(userId: string) {
  const [userPersona] = await db
    .select({
      persona: personas,
      styleCard: styleCards
    })
    .from(personas)
    .leftJoin(styleCards, eq(personas.id, styleCards.personaId))
    .where(eq(personas.userId, userId))
    .limit(1)
  
  return userPersona
}

/**
 * Get speech with sections
 */
export async function getSpeechWithSections(speechId: string) {
  const [speech] = await db
    .select()
    .from(speeches)
    .where(eq(speeches.id, speechId))
    .limit(1)
    
  const sections = await db
    .select()
    .from(speechSections)
    .where(eq(speechSections.speechId, speechId))
    
  return { speech, sections }
}

/**
 * Generate AI completion using OpenAI
 */
export async function generateAICompletion({
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  maxTokens = 2000,
  model = 'gpt-4'
}: {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
  model?: string
}) {
  const startTime = Date.now()
  
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature,
    max_tokens: maxTokens
  })
  
  const processingTime = Date.now() - startTime
  const result = completion.choices[0]?.message?.content || ''
  
  return {
    result,
    processingTime,
    usage: completion.usage
  }
}

/**
 * Parse JSON response safely
 */
export function parseJSONSafely(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    // Try to extract JSON from markdown code blocks
    const match = text.match(/```(?:json)?\s*(\{.*?\})\s*```/s)
    if (match) {
      try {
        return JSON.parse(match[1])
      } catch {
        return null
      }
    }
    return null
  }
}

/**
 * Merge text edits from multiple sources
 */
export function mergeTextEdits(
  originalText: string, 
  edits: Array<{
    start: number
    end: number
    replacement: string
    score: number
    source: string
  }>
): {
  mergedText: string
  appliedEdits: any[]
  conflicts: any[]
} {
  // Sort edits by start position (reverse order for safe application)
  const sortedEdits = edits
    .sort((a, b) => b.start - a.start)
    .filter((edit, index, arr) => {
      // Remove overlapping edits, keeping highest scored
      return !arr.some((other, otherIndex) => 
        otherIndex < index && 
        other.start < edit.end && 
        other.end > edit.start &&
        other.score > edit.score
      )
    })
  
  let mergedText = originalText
  const appliedEdits: any[] = []
  const conflicts: any[] = []
  
  // Apply edits from end to beginning
  sortedEdits.forEach(edit => {
    if (edit.start >= 0 && edit.end <= mergedText.length && edit.start <= edit.end) {
      const before = mergedText.substring(0, edit.start)
      const after = mergedText.substring(edit.end)
      mergedText = before + edit.replacement + after
      appliedEdits.push(edit)
    } else {
      conflicts.push(edit)
    }
  })
  
  return {
    mergedText,
    appliedEdits,
    conflicts
  }
}

export { db, openai }