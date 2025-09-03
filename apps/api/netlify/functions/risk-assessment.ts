import { Handler } from '@netlify/functions'
import { 
  assessRisk, 
  saveFactCheckingAnalysis,
  RiskAssessment
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

    console.log('Starting risk assessment for:', speechId || 'anonymous')
    const startTime = Date.now()

    // Perform comprehensive risk assessment
    const riskAssessment = await assessRisk(text)
    console.log(`Risk assessment complete: ${riskAssessment.riskLevel}`)

    // Calculate processing metrics
    const processingTime = Date.now() - startTime

    // Generate verification panel data
    const verificationPanel = generateVerificationPanel(riskAssessment)
    
    // Determine if export should be blocked
    const exportBlocked = shouldBlockExport(riskAssessment)

    // Prepare comprehensive report
    const report = {
      riskAssessment: {
        ...riskAssessment,
        overallScore: calculateRiskScore(riskAssessment),
        exportBlocked
      },
      verificationPanel,
      flaggedContent: organizeFlaggedContent(riskAssessment),
      sensitiveTopicsAnalysis: analyzeSensitiveTopics(riskAssessment.sensitiveTopics),
      claimsAnalysis: analyzeRiskyClaims(riskAssessment.flaggedClaims),
      actionRequired: generateActionItems(riskAssessment),
      summary: {
        totalFlaggedClaims: riskAssessment.flaggedClaims.length,
        sensitiveTopicsDetected: riskAssessment.sensitiveTopics.length,
        requiresAcknowledgment: riskAssessment.requiresAcknowledgment,
        exportBlocked,
        riskLevel: riskAssessment.riskLevel,
        processingTimeMs: processingTime
      },
      compliance: generateComplianceReport(riskAssessment)
    }

    // Save analysis to database if speechId provided
    if (speechId) {
      try {
        await saveFactCheckingAnalysis({
          speechId,
          entities: [],
          quotes: [],
          riskAssessment,
          analysisType: 'RISK_ASSESSMENT'
        })
        console.log('Risk assessment saved to database')
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
          analysisType: 'RISK_ASSESSMENT',
          timestamp: new Date().toISOString(),
          speechId: speechId || null,
          textLength: text.length,
          processingTimeMs: processingTime
        }
      })
    }

  } catch (error) {
    console.error('Risk assessment error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error during risk assessment',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

/**
 * Generate verification panel data for UI
 */
function generateVerificationPanel(riskAssessment: RiskAssessment) {
  return {
    title: `Risk Assessment: ${riskAssessment.riskLevel} Level`,
    requiresAction: riskAssessment.requiresAcknowledgment,
    sections: [
      {
        name: 'High-Risk Claims',
        items: riskAssessment.flaggedClaims.map(claim => ({
          id: `claim_${claim.start}_${claim.end}`,
          text: claim.text,
          issue: claim.explanation,
          suggestion: claim.suggestedRevision || 'Consider revising or adding sources',
          severity: getClarifiedSeverity(claim.riskType),
          acknowledged: false,
          position: { start: claim.start, end: claim.end }
        }))
      },
      {
        name: 'Sensitive Topics',
        items: riskAssessment.sensitiveTopics.map(topic => ({
          id: `topic_${topic.category}_${Date.now()}`,
          text: `${topic.topic} (${topic.instances.length} instances)`,
          issue: `Contains references to ${topic.category} topics`,
          suggestion: 'Review for potential audience sensitivity',
          severity: getSensitivitySeverity(topic.category),
          acknowledged: false,
          instances: topic.instances
        }))
      }
    ]
  }
}

/**
 * Determine if export should be blocked
 */
function shouldBlockExport(riskAssessment: RiskAssessment): boolean {
  if (riskAssessment.riskLevel === 'CRITICAL') return true
  
  const medicalClaims = riskAssessment.flaggedClaims.filter(c => c.riskType === 'MEDICAL')
  const legalClaims = riskAssessment.flaggedClaims.filter(c => c.riskType === 'LEGAL')
  const financialClaims = riskAssessment.flaggedClaims.filter(c => c.riskType === 'FINANCIAL')
  
  return medicalClaims.length > 0 || legalClaims.length > 0 || financialClaims.length > 0
}

/**
 * Calculate overall risk score (1-10, lower is riskier)
 */
function calculateRiskScore(riskAssessment: RiskAssessment): number {
  let score = 10

  // Risk level penalties
  const riskPenalties = {
    CRITICAL: 8,
    HIGH: 5,
    MEDIUM: 2,
    LOW: 0
  }
  
  score -= riskPenalties[riskAssessment.riskLevel]
  
  // Additional penalties for specific risk types
  const criticalClaims = riskAssessment.flaggedClaims.filter(c => 
    ['MEDICAL', 'LEGAL', 'FINANCIAL'].includes(c.riskType)
  )
  
  score -= criticalClaims.length * 2
  
  // Sensitive topics penalty
  score -= Math.min(riskAssessment.sensitiveTopics.length, 3)
  
  return Math.max(1, score)
}

/**
 * Organize flagged content by severity
 */
function organizeFlaggedContent(riskAssessment: RiskAssessment) {
  const organized = {
    critical: [],
    high: [],
    medium: [],
    low: []
  }

  riskAssessment.flaggedClaims.forEach(claim => {
    const severity = getClarifiedSeverity(claim.riskType)
    organized[severity].push({
      text: claim.text,
      position: { start: claim.start, end: claim.end },
      type: claim.riskType,
      explanation: claim.explanation,
      suggestedRevision: claim.suggestedRevision
    })
  })

  return organized
}

/**
 * Get clarified severity for risk types
 */
function getClarifiedSeverity(riskType: string): 'critical' | 'high' | 'medium' | 'low' {
  const severityMap = {
    'MEDICAL': 'critical',
    'LEGAL': 'critical', 
    'FINANCIAL': 'critical',
    'UNSUBSTANTIATED': 'high',
    'ABSOLUTE': 'medium',
    'DEFAULT': 'low'
  }
  
  return severityMap[riskType] || severityMap['DEFAULT']
}

/**
 * Analyze sensitive topics in detail
 */
function analyzeSensitiveTopics(sensitiveTopics: RiskAssessment['sensitiveTopics']) {
  return {
    totalTopics: sensitiveTopics.length,
    categoryCounts: sensitiveTopics.reduce((acc, topic) => {
      acc[topic.category] = (acc[topic.category] || 0) + topic.instances.length
      return acc
    }, {} as Record<string, number>),
    mostFrequentCategory: sensitiveTopics.length > 0 
      ? sensitiveTopics.reduce((prev, current) => 
          prev.instances.length > current.instances.length ? prev : current
        ).category
      : null,
    recommendations: generateSensitivityRecommendations(sensitiveTopics)
  }
}

/**
 * Generate recommendations for sensitive topics
 */
function generateSensitivityRecommendations(sensitiveTopics: RiskAssessment['sensitiveTopics']): string[] {
  const recommendations: string[] = []
  
  sensitiveTopics.forEach(topic => {
    switch (topic.category) {
      case 'political':
        recommendations.push('Consider your audience\'s political diversity - use inclusive language')
        break
      case 'religious':
        recommendations.push('Ensure religious references are respectful and inclusive')
        break
      case 'medical':
        recommendations.push('Add disclaimers for medical information - consider legal implications')
        break
      case 'financial':
        recommendations.push('Include appropriate disclaimers for financial content')
        break
      default:
        recommendations.push(`Review ${topic.category} content for potential sensitivity`)
    }
  })
  
  return [...new Set(recommendations)] // Remove duplicates
}

/**
 * Get severity level for sensitive topic categories
 */
function getSensitivitySeverity(category: string): 'critical' | 'high' | 'medium' | 'low' {
  const severityMap = {
    'medical': 'critical',
    'legal': 'critical',
    'financial': 'high',
    'political': 'high', 
    'religious': 'medium',
    'controversial': 'medium',
    'default': 'low'
  }
  
  return severityMap[category] || severityMap['default']
}

/**
 * Analyze risky claims in detail
 */
function analyzeRiskyClaims(flaggedClaims: RiskAssessment['flaggedClaims']) {
  const riskTypeAnalysis = flaggedClaims.reduce((acc, claim) => {
    acc[claim.riskType] = (acc[claim.riskType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    totalClaims: flaggedClaims.length,
    riskTypeBreakdown: riskTypeAnalysis,
    mostCommonRiskType: Object.keys(riskTypeAnalysis).length > 0
      ? Object.keys(riskTypeAnalysis).reduce((a, b) => 
          riskTypeAnalysis[a] > riskTypeAnalysis[b] ? a : b
        )
      : null,
    hasRevisionSuggestions: flaggedClaims.filter(c => c.suggestedRevision).length
  }
}

/**
 * Generate actionable items for addressing risks
 */
function generateActionItems(riskAssessment: RiskAssessment) {
  const actions: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    action: string
    type: 'REVISION' | 'VERIFICATION' | 'DISCLAIMER' | 'REMOVAL'
  }> = []

  // Critical claims need immediate attention
  const criticalClaims = riskAssessment.flaggedClaims.filter(c => 
    ['MEDICAL', 'LEGAL', 'FINANCIAL'].includes(c.riskType)
  )
  
  if (criticalClaims.length > 0) {
    actions.push({
      priority: 'HIGH',
      action: `Review and revise ${criticalClaims.length} critical claims`,
      type: 'REVISION'
    })
  }

  // Unsubstantiated claims need sources
  const unsubstantiated = riskAssessment.flaggedClaims.filter(c => 
    c.riskType === 'UNSUBSTANTIATED'
  )
  
  if (unsubstantiated.length > 0) {
    actions.push({
      priority: 'MEDIUM',
      action: `Add sources for ${unsubstantiated.length} unsubstantiated claims`,
      type: 'VERIFICATION'
    })
  }

  // Sensitive topics may need disclaimers
  const sensitiveCategories = riskAssessment.sensitiveTopics.map(t => t.category)
  if (sensitiveCategories.includes('medical') || sensitiveCategories.includes('financial')) {
    actions.push({
      priority: 'HIGH',
      action: 'Add appropriate disclaimers for sensitive content',
      type: 'DISCLAIMER'
    })
  }

  return actions.sort((a, b) => {
    const priorities = { HIGH: 3, MEDIUM: 2, LOW: 1 }
    return priorities[b.priority] - priorities[a.priority]
  })
}

/**
 * Generate compliance report
 */
function generateComplianceReport(riskAssessment: RiskAssessment) {
  const hasLegalRisks = riskAssessment.flaggedClaims.some(c => c.riskType === 'LEGAL')
  const hasMedicalRisks = riskAssessment.flaggedClaims.some(c => c.riskType === 'MEDICAL')  
  const hasFinancialRisks = riskAssessment.flaggedClaims.some(c => c.riskType === 'FINANCIAL')

  return {
    readyForExport: !riskAssessment.requiresAcknowledgment,
    complianceIssues: [
      ...(hasLegalRisks ? ['Legal claims require review'] : []),
      ...(hasMedicalRisks ? ['Medical information needs disclaimers'] : []),
      ...(hasFinancialRisks ? ['Financial advice requires compliance review'] : [])
    ],
    recommendedDisclaimers: [
      ...(hasMedicalRisks ? ['This speech contains general information and is not medical advice'] : []),
      ...(hasFinancialRisks ? ['This speech contains general information and is not financial advice'] : [])
    ]
  }
}