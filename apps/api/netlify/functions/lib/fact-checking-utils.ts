import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import OpenAI from 'openai'
import { generateAICompletion, parseJSONSafely } from './humanization-utils'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Sensitive topics lexicon
export const SENSITIVE_TOPICS = {
  political: [
    'election', 'vote', 'republican', 'democrat', 'liberal', 'conservative',
    'politics', 'government', 'congress', 'senate', 'presidency', 'campaign',
    'ballot', 'candidate', 'political party', 'ideology', 'partisan'
  ],
  religious: [
    'god', 'jesus', 'allah', 'buddha', 'christian', 'muslim', 'jewish', 'hindu',
    'religion', 'faith', 'prayer', 'church', 'mosque', 'temple', 'bible',
    'quran', 'torah', 'religious', 'spiritual', 'divine'
  ],
  controversial: [
    'abortion', 'gun control', 'climate change', 'immigration', 'racism',
    'discrimination', 'lgbtq', 'gender', 'sexuality', 'controversial',
    'debate', 'polarizing', 'divisive', 'contentious'
  ],
  medical: [
    'vaccine', 'medication', 'treatment', 'diagnosis', 'medical advice',
    'health claim', 'cure', 'disease', 'illness', 'symptoms', 'therapy',
    'clinical', 'pharmaceutical', 'drug', 'medical research'
  ],
  financial: [
    'investment advice', 'stock tip', 'financial advice', 'guaranteed return',
    'risk-free', 'get rich', 'money back guarantee', 'financial planning',
    'investment strategy', 'market prediction'
  ],
  legal: [
    'legal advice', 'lawsuit', 'litigation', 'copyright', 'trademark',
    'patent', 'contract', 'legal opinion', 'attorney', 'lawyer',
    'court', 'judge', 'jury', 'legal proceedings'
  ]
}

// High-risk claim patterns
export const HIGH_RISK_PATTERNS = [
  // Absolute statements
  /\b(always|never|all|every|none|no one)\b.*\b(will|are|is|does|can|cannot)\b/i,
  
  // Unsubstantiated claims
  /\b(studies show|research proves|scientists agree|experts say)\b/i,
  
  // Statistics without sources
  /\b\d{1,3}%\s*of\b/i,
  
  // Medical/health claims
  /\b(cures?|prevents?|treats?|heals?|eliminates?)\b.*\b(cancer|disease|illness|condition)\b/i,
  
  // Financial guarantees
  /\b(guaranteed|risk-free|certain|sure)\b.*\b(profit|return|money|income)\b/i,
  
  // Superlatives
  /\b(best|worst|most|least|only|unique|revolutionary|breakthrough)\b/i
]

// Entity types for NER
export interface NamedEntity {
  text: string
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'DATE' | 'MONEY' | 'PERCENT' | 'TIME' | 'MISC'
  start: number
  end: number
  confidence: number
  suggestedLinks?: string[]
}

// Quote detection interface
export interface DetectedQuote {
  text: string
  start: number
  end: number
  confidence: number
  needsAttribution: boolean
  suggestedSources?: string[]
}

// Risk assessment result
export interface RiskAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  flaggedClaims: Array<{
    text: string
    start: number
    end: number
    riskType: string
    explanation: string
    suggestedRevision?: string
  }>
  sensitiveTopics: Array<{
    topic: string
    category: keyof typeof SENSITIVE_TOPICS
    instances: Array<{ text: string; start: number; end: number }>
  }>
  requiresAcknowledgment: boolean
}

/**
 * Perform Named Entity Recognition on text
 */
export async function performNER(text: string): Promise<NamedEntity[]> {
  const systemPrompt = `You are an expert named entity recognition system. Extract people, organizations, locations, dates, money amounts, percentages, and other important entities from the text.

Return a JSON array of entities with this structure:
{
  "entities": [
    {
      "text": "extracted entity text",
      "type": "PERSON|ORGANIZATION|LOCATION|DATE|MONEY|PERCENT|TIME|MISC",
      "start": start_position,
      "end": end_position,
      "confidence": 0.0-1.0
    }
  ]
}

Be precise with start/end positions and conservative with confidence scores.`

  const userPrompt = `Extract named entities from this speech text:

${text}`

  try {
    const { result } = await generateAICompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      maxTokens: 1500,
      model: 'gpt-4'
    })

    const parsed = parseJSONSafely(result)
    if (!parsed?.entities) {
      return []
    }

    // Generate suggested links for verification
    const entitiesWithLinks = await Promise.all(
      parsed.entities.map(async (entity: NamedEntity) => {
        const suggestedLinks = await generateVerificationLinks(entity)
        return { ...entity, suggestedLinks }
      })
    )

    return entitiesWithLinks
  } catch (error) {
    console.error('NER error:', error)
    return []
  }
}

/**
 * Generate verification links for an entity
 */
export async function generateVerificationLinks(entity: NamedEntity): Promise<string[]> {
  const searchQuery = encodeURIComponent(entity.text)
  const links: string[] = []

  switch (entity.type) {
    case 'PERSON':
      links.push(
        `https://en.wikipedia.org/wiki/Special:Search?search=${searchQuery}`,
        `https://www.google.com/search?q="${searchQuery}"+biography`,
        `https://www.imdb.com/find?q=${searchQuery}&s=nm`
      )
      break
    
    case 'ORGANIZATION':
      links.push(
        `https://en.wikipedia.org/wiki/Special:Search?search=${searchQuery}`,
        `https://www.google.com/search?q="${searchQuery}"+official+website`,
        `https://www.crunchbase.com/search?query=${searchQuery}`
      )
      break
    
    case 'LOCATION':
      links.push(
        `https://en.wikipedia.org/wiki/Special:Search?search=${searchQuery}`,
        `https://www.google.com/maps/search/${searchQuery}`,
        `https://www.google.com/search?q="${searchQuery}"+location`
      )
      break
    
    default:
      links.push(
        `https://www.google.com/search?q="${searchQuery}"`,
        `https://en.wikipedia.org/wiki/Special:Search?search=${searchQuery}`
      )
  }

  return links.slice(0, 3) // Limit to top 3 suggestions
}

/**
 * Detect quotes in text that need attribution
 */
export async function detectQuotes(text: string): Promise<DetectedQuote[]> {
  const systemPrompt = `You are an expert at detecting quotes and statements that require attribution in speeches. Look for:

1. Direct quotes (text in quotation marks)
2. Attributed statements ("As X said...")
3. Statistics or facts that need sources
4. Expert opinions or studies mentioned
5. Historical statements or famous sayings

Return a JSON array of detected quotes:
{
  "quotes": [
    {
      "text": "quoted text",
      "start": start_position,
      "end": end_position,
      "confidence": 0.0-1.0,
      "needsAttribution": true|false
    }
  ]
}

Be conservative - only flag content that clearly needs verification or attribution.`

  const userPrompt = `Detect quotes and statements requiring attribution in this text:

${text}`

  try {
    const { result } = await generateAICompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      maxTokens: 1000,
      model: 'gpt-4'
    })

    const parsed = parseJSONSafely(result)
    if (!parsed?.quotes) {
      return []
    }

    // Generate suggested sources for quotes needing attribution
    const quotesWithSources = await Promise.all(
      parsed.quotes.map(async (quote: DetectedQuote) => {
        if (quote.needsAttribution) {
          const suggestedSources = await generateSourceSuggestions(quote.text)
          return { ...quote, suggestedSources }
        }
        return quote
      })
    )

    return quotesWithSources
  } catch (error) {
    console.error('Quote detection error:', error)
    return []
  }
}

/**
 * Generate source suggestions for a quote
 */
export async function generateSourceSuggestions(quoteText: string): Promise<string[]> {
  const searchQuery = encodeURIComponent(quoteText)
  
  return [
    `https://www.google.com/search?q="${searchQuery}"+source`,
    `https://quoteinvestigator.com/search/${searchQuery}`,
    `https://www.goodreads.com/quotes/search?q=${searchQuery}`,
    `https://scholar.google.com/scholar?q="${searchQuery}"`
  ].slice(0, 3)
}

/**
 * Assess text for high-risk claims and sensitive topics
 */
export async function assessRisk(text: string): Promise<RiskAssessment> {
  const flaggedClaims = await identifyHighRiskClaims(text)
  const sensitiveTopics = identifySensitiveTopics(text)
  
  // Determine overall risk level
  const criticalClaims = flaggedClaims.filter(claim => 
    claim.riskType === 'MEDICAL' || claim.riskType === 'LEGAL' || claim.riskType === 'FINANCIAL'
  )
  
  let riskLevel: RiskAssessment['riskLevel'] = 'LOW'
  let requiresAcknowledgment = false
  
  if (criticalClaims.length > 0) {
    riskLevel = 'CRITICAL'
    requiresAcknowledgment = true
  } else if (flaggedClaims.length > 2 || sensitiveTopics.length > 1) {
    riskLevel = 'HIGH'
    requiresAcknowledgment = true
  } else if (flaggedClaims.length > 0 || sensitiveTopics.length > 0) {
    riskLevel = 'MEDIUM'
  }

  return {
    riskLevel,
    flaggedClaims,
    sensitiveTopics,
    requiresAcknowledgment
  }
}

/**
 * Identify high-risk claims in text using pattern matching and AI
 */
async function identifyHighRiskClaims(text: string) {
  const claims: RiskAssessment['flaggedClaims'] = []
  
  // Pattern-based detection
  HIGH_RISK_PATTERNS.forEach((pattern, index) => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      claims.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        riskType: 'UNSUBSTANTIATED_CLAIM',
        explanation: 'This statement may require verification or sources'
      })
      
      // Reset regex lastIndex to avoid infinite loops
      if (!pattern.global) break
    }
  })

  // AI-based claim detection
  try {
    const systemPrompt = `You are a fact-checking expert. Identify claims in the text that are:
1. Medical or health claims requiring evidence
2. Financial advice or guarantees
3. Legal statements or advice
4. Unsubstantiated statistics or research claims
5. Absolute statements without evidence

Return JSON format:
{
  "claims": [
    {
      "text": "flagged claim text",
      "start": start_position,
      "end": end_position,
      "riskType": "MEDICAL|FINANCIAL|LEGAL|UNSUBSTANTIATED|ABSOLUTE",
      "explanation": "why this needs verification",
      "suggestedRevision": "optional safer alternative"
    }
  ]
}`

    const { result } = await generateAICompletion({
      systemPrompt,
      userPrompt: `Analyze this text for high-risk claims:\n\n${text}`,
      temperature: 0.1,
      maxTokens: 1500
    })

    const parsed = parseJSONSafely(result)
    if (parsed?.claims) {
      claims.push(...parsed.claims)
    }
  } catch (error) {
    console.error('AI claim detection error:', error)
  }

  return claims
}

/**
 * Identify sensitive topics using lexicon matching
 */
function identifySensitiveTopics(text: string): RiskAssessment['sensitiveTopics'] {
  const textLower = text.toLowerCase()
  const topics: RiskAssessment['sensitiveTopics'] = []

  Object.entries(SENSITIVE_TOPICS).forEach(([category, keywords]) => {
    const instances: Array<{ text: string; start: number; end: number }> = []
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      let match
      
      while ((match = regex.exec(text)) !== null) {
        instances.push({
          text: match[0],
          start: match.index,
          end: match.index + match[0].length
        })
        
        if (!regex.global) break
      }
    })

    if (instances.length > 0) {
      topics.push({
        topic: category,
        category: category as keyof typeof SENSITIVE_TOPICS,
        instances
      })
    }
  })

  return topics
}

/**
 * Save fact checking analysis to database
 */
export async function saveFactCheckingAnalysis({
  speechId,
  entities,
  quotes,
  riskAssessment,
  analysisType = 'COMPREHENSIVE'
}: {
  speechId: string
  entities: NamedEntity[]
  quotes: DetectedQuote[]
  riskAssessment: RiskAssessment
  analysisType?: string
}) {
  // This would need the actual database schema for fact checking
  // For now, we'll log the data and return a mock ID
  console.log('Fact checking analysis saved:', {
    speechId,
    entities: entities.length,
    quotes: quotes.length,
    riskLevel: riskAssessment.riskLevel,
    analysisType
  })
  
  return {
    id: `fact_check_${Date.now()}`,
    speechId,
    entities,
    quotes,
    riskAssessment,
    analysisType,
    createdAt: new Date().toISOString()
  }
}

export { db, openai }