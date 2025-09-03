import { Handler } from '@netlify/functions'
import { 
  performNER, 
  detectQuotes, 
  assessRisk,
  saveFactCheckingAnalysis
} from './lib/fact-checking-utils'
import { 
  analyzeClichesAdvanced,
  checkPlagiarism 
} from './lib/cliche-detection-utils'

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

    console.log('Starting comprehensive fact check for:', speechId || 'anonymous')
    const startTime = Date.now()

    // Run all analyses in parallel for better performance
    const [entities, quotes, riskAssessment, clicheAnalysis, plagiarismResult] = await Promise.all([
      performNER(text),
      detectQuotes(text),
      assessRisk(text),
      analyzeClichesAdvanced(text),
      checkPlagiarism(text)
    ])

    console.log('All analyses complete:', {
      entities: entities.length,
      quotes: quotes.length,
      riskLevel: riskAssessment.riskLevel,
      clicheDensity: clicheAnalysis.density,
      plagiarismScore: plagiarismResult.similarityScore
    })

    const processingTime = Date.now() - startTime

    // Calculate overall quality and safety scores
    const qualityScore = calculateOverallQualityScore({
      clicheScore: clicheAnalysis.overallScore,
      originalityScore: (1 - plagiarismResult.similarityScore) * 10,
      factualRiskScore: getRiskScore(riskAssessment.riskLevel)
    })

    // Determine export readiness
    const exportReadiness = determineExportReadiness({
      riskAssessment,
      clicheAnalysis,
      plagiarismResult,
      entities,
      quotes
    })

    // Generate comprehensive verification panel
    const verificationPanel = generateComprehensiveVerificationPanel({
      riskAssessment,
      entities,
      quotes,
      clicheAnalysis,
      plagiarismResult
    })

    // Prepare comprehensive report
    const report = {
      overallAssessment: {
        qualityScore,
        readyForExport: exportReadiness.ready,
        exportBlocked: exportReadiness.blocked,
        blockedReason: exportReadiness.reason,
        requiresReview: exportReadiness.requiresReview
      },
      factChecking: {
        entities: entities.map(e => ({
          text: e.text,
          type: e.type,
          confidence: e.confidence,
          suggestedLinks: e.suggestedLinks,
          verificationPriority: e.confidence < 0.7 ? 'HIGH' : 'MEDIUM'
        })),
        quotes: quotes.map(q => ({
          text: q.text,
          needsAttribution: q.needsAttribution,
          suggestedSources: q.suggestedSources
        })),
        summary: {
          entitiesDetected: entities.length,
          quotesNeedingAttribution: quotes.filter(q => q.needsAttribution).length
        }
      },
      riskAssessment: {
        riskLevel: riskAssessment.riskLevel,
        flaggedClaims: riskAssessment.flaggedClaims,
        sensitiveTopics: riskAssessment.sensitiveTopics,
        requiresAcknowledgment: riskAssessment.requiresAcknowledgment
      },
      contentQuality: {
        clicheAnalysis: {
          density: clicheAnalysis.density,
          detectedCliches: clicheAnalysis.detectedCliches,
          needsRewrite: clicheAnalysis.needsRewrite,
          suggestions: clicheAnalysis.suggestions.slice(0, 5), // Top 5 suggestions
          passesThreshold: clicheAnalysis.density <= 0.8
        },
        plagiarismResult: {
          similarityScore: plagiarismResult.similarityScore,
          potentialMatches: plagiarismResult.potentialMatches,
          overallRisk: plagiarismResult.overallRisk,
          passesCheck: plagiarismResult.similarityScore < 0.7
        }
      },
      verificationPanel,
      actionPlan: generateComprehensiveActionPlan({
        riskAssessment,
        clicheAnalysis,
        plagiarismResult,
        entities,
        quotes
      }),
      metrics: {
        processingTimeMs: processingTime,
        textLength: text.length,
        wordsAnalyzed: text.split(/\s+/).length,
        totalIssuesFound: getTotalIssuesCount({
          riskAssessment,
          clicheAnalysis,
          plagiarismResult,
          entities,
          quotes
        })
      }
    }

    // Save comprehensive analysis to database
    if (speechId) {
      try {
        await saveFactCheckingAnalysis({
          speechId,
          entities,
          quotes,
          riskAssessment,
          analysisType: 'COMPREHENSIVE'
        })
        console.log('Comprehensive fact checking analysis saved to database')
      } catch (dbError) {
        console.error('Database save error:', dbError)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: report,
        metadata: {
          analysisType: 'COMPREHENSIVE_FACT_CHECK',
          timestamp: new Date().toISOString(),
          speechId: speechId || null,
          version: '1.0.0',
          processingTimeMs: processingTime
        }
      })
    }

  } catch (error) {
    console.error('Comprehensive fact check error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error during comprehensive fact checking',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

/**
 * Calculate overall quality score combining all analyses
 */
function calculateOverallQualityScore({
  clicheScore,
  originalityScore,
  factualRiskScore
}: {
  clicheScore: number
  originalityScore: number
  factualRiskScore: number
}): {
  overall: number
  breakdown: {
    freshness: number
    originality: number
    factualSafety: number
  }
  grade: string
} {
  // Weighted average: factual safety 40%, freshness 35%, originality 25%
  const overall = (factualRiskScore * 0.4 + clicheScore * 0.35 + originalityScore * 0.25)
  
  const grade = overall >= 9 ? 'A+' :
                overall >= 8.5 ? 'A' :
                overall >= 8 ? 'A-' :
                overall >= 7.5 ? 'B+' :
                overall >= 7 ? 'B' :
                overall >= 6.5 ? 'B-' :
                overall >= 6 ? 'C+' :
                overall >= 5.5 ? 'C' :
                overall >= 5 ? 'C-' :
                overall >= 4 ? 'D' : 'F'

  return {
    overall,
    breakdown: {
      freshness: clicheScore,
      originality: originalityScore,
      factualSafety: factualRiskScore
    },
    grade
  }
}

/**
 * Convert risk level to numerical score
 */
function getRiskScore(riskLevel: string): number {
  const scores = {
    'LOW': 10,
    'MEDIUM': 7,
    'HIGH': 4,
    'CRITICAL': 1
  }
  return scores[riskLevel] || 5
}

/**
 * Determine overall export readiness
 */
function determineExportReadiness({
  riskAssessment,
  clicheAnalysis,
  plagiarismResult,
  entities,
  quotes
}: any) {
  const criticalIssues = []
  const warningIssues = []

  // Check for blocking issues
  if (riskAssessment.riskLevel === 'CRITICAL') {
    criticalIssues.push('Critical risk content detected')
  }

  if (riskAssessment.requiresAcknowledgment) {
    criticalIssues.push('Risk assessment requires acknowledgment')
  }

  if (plagiarismResult.similarityScore > 0.8) {
    criticalIssues.push('High plagiarism risk detected')
  }

  // Check for warning issues
  if (clicheAnalysis.density > 0.8) {
    warningIssues.push('Cliché density above threshold')
  }

  if (plagiarismResult.similarityScore > 0.6) {
    warningIssues.push('Moderate plagiarism risk')
  }

  const quotesNeedingAttribution = quotes.filter(q => q.needsAttribution).length
  if (quotesNeedingAttribution > 2) {
    warningIssues.push(`${quotesNeedingAttribution} quotes need attribution`)
  }

  const blocked = criticalIssues.length > 0
  const requiresReview = warningIssues.length > 0

  return {
    ready: !blocked && !requiresReview,
    blocked,
    requiresReview,
    reason: blocked ? criticalIssues[0] : requiresReview ? warningIssues[0] : null,
    criticalIssues,
    warningIssues
  }
}

/**
 * Generate comprehensive verification panel
 */
function generateComprehensiveVerificationPanel({
  riskAssessment,
  entities,
  quotes,
  clicheAnalysis,
  plagiarismResult
}: any) {
  const panels = []

  // Risk assessment panel
  if (riskAssessment.flaggedClaims.length > 0 || riskAssessment.sensitiveTopics.length > 0) {
    panels.push({
      title: 'Content Risk Review',
      type: 'RISK_ASSESSMENT',
      priority: riskAssessment.riskLevel === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      items: [
        ...riskAssessment.flaggedClaims.map(claim => ({
          id: `claim_${claim.start}`,
          text: claim.text,
          issue: claim.explanation,
          suggestion: claim.suggestedRevision,
          acknowledged: false
        })),
        ...riskAssessment.sensitiveTopics.map(topic => ({
          id: `topic_${topic.category}`,
          text: `${topic.topic} (${topic.instances.length} references)`,
          issue: `Contains ${topic.category} content`,
          suggestion: 'Review for audience appropriateness',
          acknowledged: false
        }))
      ]
    })
  }

  // Fact checking panel
  const highPriorityEntities = entities.filter(e => e.confidence < 0.7)
  const quotesNeedingAttribution = quotes.filter(q => q.needsAttribution)
  
  if (highPriorityEntities.length > 0 || quotesNeedingAttribution.length > 0) {
    panels.push({
      title: 'Fact Verification',
      type: 'FACT_CHECK',
      priority: 'MEDIUM',
      items: [
        ...highPriorityEntities.map(entity => ({
          id: `entity_${entity.start}`,
          text: entity.text,
          issue: `Verify ${entity.type.toLowerCase()}: ${entity.text}`,
          suggestion: 'Check suggested links for verification',
          links: entity.suggestedLinks,
          acknowledged: false
        })),
        ...quotesNeedingAttribution.map(quote => ({
          id: `quote_${quote.start}`,
          text: quote.text,
          issue: 'Quote needs attribution',
          suggestion: 'Add source information',
          links: quote.suggestedSources,
          acknowledged: false
        }))
      ]
    })
  }

  // Content quality panel
  if (clicheAnalysis.needsRewrite || plagiarismResult.needsRevision) {
    panels.push({
      title: 'Content Quality',
      type: 'CONTENT_QUALITY',
      priority: 'LOW',
      items: [
        ...(clicheAnalysis.needsRewrite ? [{
          id: 'cliche_density',
          text: `Cliché density: ${clicheAnalysis.density.toFixed(2)}%`,
          issue: 'High cliché density detected',
          suggestion: `Use provided alternatives to reduce density below 0.8%`,
          acknowledged: false
        }] : []),
        ...(plagiarismResult.needsRevision ? [{
          id: 'plagiarism_risk',
          text: `Similarity score: ${(plagiarismResult.similarityScore * 100).toFixed(1)}%`,
          issue: 'Potential originality concerns',
          suggestion: 'Revise flagged sections for better originality',
          acknowledged: false
        }] : [])
      ]
    })
  }

  return panels
}

/**
 * Generate comprehensive action plan
 */
function generateComprehensiveActionPlan({ riskAssessment, clicheAnalysis, plagiarismResult, entities, quotes }: any) {
  const actions = []

  // Critical actions
  if (riskAssessment.riskLevel === 'CRITICAL') {
    actions.push({
      priority: 'CRITICAL',
      category: 'SAFETY',
      title: 'Address Critical Content Risks',
      description: 'Review and revise flagged content before proceeding',
      estimatedTime: 30,
      blocking: true
    })
  }

  // High priority actions
  const medicalLegalClaims = riskAssessment.flaggedClaims.filter(c => 
    ['MEDICAL', 'LEGAL', 'FINANCIAL'].includes(c.riskType)
  )
  
  if (medicalLegalClaims.length > 0) {
    actions.push({
      priority: 'HIGH',
      category: 'COMPLIANCE',
      title: 'Review High-Risk Claims',
      description: `Address ${medicalLegalClaims.length} claims requiring expert review`,
      estimatedTime: 20,
      blocking: true
    })
  }

  // Medium priority actions
  if (clicheAnalysis.density > 0.8) {
    actions.push({
      priority: 'MEDIUM',
      category: 'QUALITY',
      title: 'Reduce Cliché Density',
      description: `Replace clichés to achieve target density of 0.8% (currently ${clicheAnalysis.density.toFixed(2)}%)`,
      estimatedTime: 15,
      blocking: false
    })
  }

  const quotesNeedingAttribution = quotes.filter(q => q.needsAttribution)
  if (quotesNeedingAttribution.length > 0) {
    actions.push({
      priority: 'MEDIUM',
      category: 'ATTRIBUTION',
      title: 'Add Quote Attribution',
      description: `Provide sources for ${quotesNeedingAttribution.length} quotes`,
      estimatedTime: 10,
      blocking: false
    })
  }

  // Low priority actions
  if (plagiarismResult.similarityScore > 0.5) {
    actions.push({
      priority: 'LOW',
      category: 'ORIGINALITY',
      title: 'Improve Originality',
      description: 'Revise common patterns to increase uniqueness',
      estimatedTime: 10,
      blocking: false
    })
  }

  return {
    actions: actions.sort((a, b) => {
      const priorities = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      return priorities[b.priority] - priorities[a.priority]
    }),
    totalEstimatedTime: actions.reduce((sum, action) => sum + action.estimatedTime, 0),
    blockingActions: actions.filter(a => a.blocking).length,
    summary: `${actions.length} actions identified, ${actions.filter(a => a.blocking).length} blocking export`
  }
}

/**
 * Count total issues across all analyses
 */
function getTotalIssuesCount({ riskAssessment, clicheAnalysis, plagiarismResult, entities, quotes }: any): number {
  return riskAssessment.flaggedClaims.length +
         riskAssessment.sensitiveTopics.length +
         clicheAnalysis.detectedCliches.length +
         plagiarismResult.potentialMatches.length +
         entities.filter(e => e.confidence < 0.7).length +
         quotes.filter(q => q.needsAttribution).length
}