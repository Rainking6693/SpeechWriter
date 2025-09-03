import { Handler } from '@netlify/functions'
import { 
  performNER, 
  detectQuotes, 
  saveFactCheckingAnalysis,
  NamedEntity,
  DetectedQuote
} from './lib/fact-checking-utils'

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { text, speechId, options = {} } = JSON.parse(event.body || '{}')

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text is required' })
      }
    }

    console.log('Starting fact check NER analysis for:', speechId || 'anonymous')
    const startTime = Date.now()

    // Perform Named Entity Recognition
    const entities = await performNER(text)
    console.log(`Detected ${entities.length} named entities`)

    // Detect quotes needing attribution
    const quotes = await detectQuotes(text)
    console.log(`Detected ${quotes.length} quotes needing attribution`)

    // Calculate processing metrics
    const processingTime = Date.now() - startTime

    // Prepare comprehensive report
    const report = {
      entities: entities.map(entity => ({
        text: entity.text,
        type: entity.type,
        start: entity.start,
        end: entity.end,
        confidence: entity.confidence,
        suggestedLinks: entity.suggestedLinks,
        category: getEntityCategory(entity.type),
        verificationPriority: getVerificationPriority(entity)
      })),
      quotes: quotes.map(quote => ({
        text: quote.text,
        start: quote.start,
        end: quote.end,
        confidence: quote.confidence,
        needsAttribution: quote.needsAttribution,
        suggestedSources: quote.suggestedSources,
        attributionType: getAttributionType(quote.text)
      })),
      summary: {
        totalEntities: entities.length,
        entitiesByType: getEntityTypeBreakdown(entities),
        totalQuotes: quotes.length,
        quotesNeedingAttribution: quotes.filter(q => q.needsAttribution).length,
        verificationRequired: entities.filter(e => e.confidence < 0.8).length + 
                             quotes.filter(q => q.needsAttribution).length > 0,
        processingTimeMs: processingTime
      },
      recommendations: generateRecommendations(entities, quotes),
      verificationChecklist: generateVerificationChecklist(entities, quotes)
    }

    // Save analysis to database if speechId provided
    if (speechId) {
      try {
        await saveFactCheckingAnalysis({
          speechId,
          entities,
          quotes,
          riskAssessment: {
            riskLevel: 'LOW',
            flaggedClaims: [],
            sensitiveTopics: [],
            requiresAcknowledgment: false
          }
        })
        console.log('Fact checking analysis saved to database')
      } catch (dbError) {
        console.error('Database save error:', dbError)
        // Continue without failing the request
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: report,
        metadata: {
          analysisType: 'NER_QUOTE_DETECTION',
          timestamp: new Date().toISOString(),
          speechId: speechId || null,
          textLength: text.length,
          processingTimeMs: processingTime
        }
      })
    }

  } catch (error) {
    console.error('Fact check NER error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error during fact checking analysis',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

/**
 * Categorize entities for better organization
 */
function getEntityCategory(type: NamedEntity['type']): string {
  const categories = {
    'PERSON': 'People & Attribution',
    'ORGANIZATION': 'Organizations & Institutions', 
    'LOCATION': 'Places & Geography',
    'DATE': 'Dates & Timeline',
    'MONEY': 'Financial & Statistics',
    'PERCENT': 'Statistics & Data',
    'TIME': 'Timeline & Schedule',
    'MISC': 'Other'
  }
  
  return categories[type] || 'Other'
}

/**
 * Determine verification priority for entities
 */
function getVerificationPriority(entity: NamedEntity): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (entity.confidence < 0.6) return 'HIGH'
  if (entity.confidence < 0.8) return 'MEDIUM'
  if (entity.type === 'PERSON' || entity.type === 'ORGANIZATION') return 'MEDIUM'
  return 'LOW'
}

/**
 * Get breakdown of entities by type
 */
function getEntityTypeBreakdown(entities: NamedEntity[]) {
  return entities.reduce((acc, entity) => {
    acc[entity.type] = (acc[entity.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

/**
 * Determine attribution type for quotes
 */
function getAttributionType(text: string): 'DIRECT_QUOTE' | 'PARAPHRASE' | 'REFERENCE' | 'STATISTIC' {
  if (text.includes('"') || text.includes("'")) return 'DIRECT_QUOTE'
  if (text.match(/\b\d+%|\bpercent\b/i)) return 'STATISTIC' 
  if (text.match(/\b(studies?|research|according to)\b/i)) return 'REFERENCE'
  return 'PARAPHRASE'
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(entities: NamedEntity[], quotes: DetectedQuote[]) {
  const recommendations: string[] = []

  const highConfidenceEntities = entities.filter(e => e.confidence < 0.7)
  const quotesNeedingAttribution = quotes.filter(q => q.needsAttribution)

  if (highConfidenceEntities.length > 0) {
    recommendations.push(`Verify ${highConfidenceEntities.length} entities with low confidence scores`)
  }

  if (quotesNeedingAttribution.length > 0) {
    recommendations.push(`Add attribution for ${quotesNeedingAttribution.length} quotes or statements`)
  }

  const organizations = entities.filter(e => e.type === 'ORGANIZATION')
  if (organizations.length > 2) {
    recommendations.push('Consider adding context for mentioned organizations')
  }

  const statistics = quotes.filter(q => q.text.match(/\b\d+%|\bpercent\b/i))
  if (statistics.length > 0) {
    recommendations.push('Provide sources for statistical claims')
  }

  if (recommendations.length === 0) {
    recommendations.push('Good job! No major fact-checking concerns detected')
  }

  return recommendations
}

/**
 * Generate verification checklist for manual review
 */
function generateVerificationChecklist(entities: NamedEntity[], quotes: DetectedQuote[]) {
  const checklist: Array<{
    item: string
    type: 'ENTITY' | 'QUOTE'
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    links?: string[]
  }> = []

  // Add entity verification items
  entities.forEach(entity => {
    if (entity.confidence < 0.8 || entity.type === 'PERSON' || entity.type === 'ORGANIZATION') {
      checklist.push({
        item: `Verify "${entity.text}" (${entity.type.toLowerCase()})`,
        type: 'ENTITY',
        priority: getVerificationPriority(entity),
        links: entity.suggestedLinks
      })
    }
  })

  // Add quote verification items
  quotes.forEach(quote => {
    if (quote.needsAttribution) {
      checklist.push({
        item: `Find source for: "${quote.text.length > 50 ? quote.text.substring(0, 50) + '...' : quote.text}"`,
        type: 'QUOTE',
        priority: quote.text.match(/\b(studies?|research|statistics)\b/i) ? 'HIGH' : 'MEDIUM',
        links: quote.suggestedSources
      })
    }
  })

  return checklist.sort((a, b) => {
    const priorities = { HIGH: 3, MEDIUM: 2, LOW: 1 }
    return priorities[b.priority] - priorities[a.priority]
  })
}