import { Handler } from '@netlify/functions'
import { 
  analyzeClichesAdvanced,
  checkPlagiarism,
  getClicheStatistics,
  ClicheAnalysis,
  PlagiarismResult
} from './lib/cliche-detection-utils'
import { saveClicheAnalysis } from './lib/humanization-utils'

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

    console.log('Starting cliché and plagiarism scan for:', speechId || 'anonymous')
    const startTime = Date.now()

    // Perform advanced cliché analysis
    const clicheAnalysis = await analyzeClichesAdvanced(text)
    console.log(`Detected ${clicheAnalysis.detectedCliches.length} clichés (density: ${clicheAnalysis.density.toFixed(2)}%)`)

    // Perform plagiarism check
    const plagiarismResult = await checkPlagiarism(text)
    console.log(`Plagiarism similarity score: ${plagiarismResult.similarityScore.toFixed(2)}`)

    // Get additional statistics
    const statistics = getClicheStatistics(text)

    // Calculate processing metrics
    const processingTime = Date.now() - startTime

    // Determine if rewrite is needed (density > 0.8/100 tokens)
    const densityThreshold = 0.8
    const needsRewrite = clicheAnalysis.density > densityThreshold || 
                        clicheAnalysis.overallScore < 7.0 ||
                        plagiarismResult.similarityScore > 0.7

    // Generate quality improvement plan
    const improvementPlan = generateImprovementPlan(clicheAnalysis, plagiarismResult)
    
    // Prepare comprehensive report
    const report = {
      clicheAnalysis: {
        ...clicheAnalysis,
        passesThreshold: clicheAnalysis.density <= densityThreshold,
        threshold: densityThreshold,
        improvementNeeded: clicheAnalysis.density - densityThreshold
      },
      plagiarismResult: {
        ...plagiarismResult,
        passesCheck: plagiarismResult.similarityScore < 0.7,
        threshold: 0.7
      },
      qualityMetrics: {
        originalityScore: Math.max(0, 10 - (clicheAnalysis.density + plagiarismResult.similarityScore * 10)),
        freshnessScore: clicheAnalysis.overallScore,
        combinedScore: calculateCombinedScore(clicheAnalysis, plagiarismResult),
        passesQualityGate: !needsRewrite
      },
      statistics: {
        ...statistics,
        textLength: text.length,
        wordsAnalyzed: text.split(/\s+/).length
      },
      improvementPlan,
      rewriteSuggestions: organizeSuggestionsByPriority(clicheAnalysis.suggestions),
      summary: {
        needsRewrite,
        clicheDensity: clicheAnalysis.density,
        plagiarismScore: plagiarismResult.similarityScore,
        totalSuggestions: clicheAnalysis.suggestions.length,
        processingTimeMs: processingTime
      },
      compliance: {
        meetsDensityThreshold: clicheAnalysis.density <= densityThreshold,
        meetsPlagiarismThreshold: plagiarismResult.similarityScore < 0.7,
        readyForExport: !needsRewrite,
        qualityGrade: getQualityGrade(clicheAnalysis, plagiarismResult)
      }
    }

    // Save analysis to database if speechId provided
    if (speechId) {
      try {
        await saveClicheAnalysis({
          speechId,
          textSample: text.substring(0, 1000), // Store sample for reference
          detectedCliches: clicheAnalysis.detectedCliches.map(c => c.phrase),
          clicheDensity: clicheAnalysis.density,
          replacementSuggestions: clicheAnalysis.suggestions,
          overallScore: clicheAnalysis.overallScore
        })
        console.log('Cliché analysis saved to database')
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
          analysisType: 'CLICHE_PLAGIARISM_SCAN',
          timestamp: new Date().toISOString(),
          speechId: speechId || null,
          textLength: text.length,
          processingTimeMs: processingTime
        }
      })
    }

  } catch (error) {
    console.error('Cliché/plagiarism scan error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error during content analysis',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

/**
 * Calculate combined quality score
 */
function calculateCombinedScore(clicheAnalysis: ClicheAnalysis, plagiarismResult: PlagiarismResult): number {
  const clicheScore = Math.max(0, 10 - clicheAnalysis.density) // Lower density = higher score
  const originalityScore = Math.max(0, 10 - (plagiarismResult.similarityScore * 10))
  const freshnessScore = clicheAnalysis.overallScore
  
  // Weighted average: freshness 40%, originality 35%, cliché avoidance 25%
  return (freshnessScore * 0.4 + originalityScore * 0.35 + clicheScore * 0.25)
}

/**
 * Generate improvement plan based on analysis results
 */
function generateImprovementPlan(clicheAnalysis: ClicheAnalysis, plagiarismResult: PlagiarismResult) {
  const plan = {
    priority: 'LOW' as 'HIGH' | 'MEDIUM' | 'LOW',
    actions: [] as Array<{
      type: 'REWRITE_CLICHES' | 'INCREASE_ORIGINALITY' | 'IMPROVE_FRESHNESS' | 'GENERAL_POLISH'
      description: string
      impact: 'HIGH' | 'MEDIUM' | 'LOW'
      effort: 'HIGH' | 'MEDIUM' | 'LOW'
    }>,
    estimatedImprovementTime: 0,
    targetMetrics: {
      clicheDensity: Math.max(0.5, clicheAnalysis.density - 1),
      originalityScore: Math.min(10, (1 - plagiarismResult.similarityScore) * 10 + 1),
      freshnessScore: Math.min(10, clicheAnalysis.overallScore + 1)
    }
  }

  // Determine priority and actions
  if (clicheAnalysis.density > 1.5 || plagiarismResult.similarityScore > 0.7) {
    plan.priority = 'HIGH'
    plan.estimatedImprovementTime = 30
  } else if (clicheAnalysis.density > 0.8 || plagiarismResult.similarityScore > 0.5) {
    plan.priority = 'MEDIUM'
    plan.estimatedImprovementTime = 15
  } else {
    plan.priority = 'LOW'
    plan.estimatedImprovementTime = 5
  }

  // Add specific actions
  if (clicheAnalysis.detectedCliches.length > 0) {
    plan.actions.push({
      type: 'REWRITE_CLICHES',
      description: `Replace ${clicheAnalysis.detectedCliches.length} clichéd phrases with fresh alternatives`,
      impact: clicheAnalysis.detectedCliches.length > 3 ? 'HIGH' : 'MEDIUM',
      effort: clicheAnalysis.detectedCliches.length > 5 ? 'HIGH' : 'MEDIUM'
    })
  }

  if (plagiarismResult.similarityScore > 0.5) {
    plan.actions.push({
      type: 'INCREASE_ORIGINALITY',
      description: 'Revise sections with common patterns to increase originality',
      impact: 'HIGH',
      effort: plagiarismResult.potentialMatches.length > 2 ? 'HIGH' : 'MEDIUM'
    })
  }

  if (clicheAnalysis.overallScore < 7) {
    plan.actions.push({
      type: 'IMPROVE_FRESHNESS',
      description: 'Add more specific examples and vivid language',
      impact: 'MEDIUM',
      effort: 'MEDIUM'
    })
  }

  if (plan.actions.length === 0) {
    plan.actions.push({
      type: 'GENERAL_POLISH',
      description: 'Minor refinements to enhance overall quality',
      impact: 'LOW',
      effort: 'LOW'
    })
  }

  return plan
}

/**
 * Organize suggestions by priority for easier implementation
 */
function organizeSuggestionsByPriority(suggestions: ClicheAnalysis['suggestions']) {
  return {
    high: suggestions.filter(s => s.confidence > 0.8).slice(0, 3),
    medium: suggestions.filter(s => s.confidence > 0.6 && s.confidence <= 0.8).slice(0, 5),
    low: suggestions.filter(s => s.confidence <= 0.6).slice(0, 3),
    implementationOrder: suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .map((suggestion, index) => ({
        order: index + 1,
        suggestion: suggestion.originalText,
        alternatives: suggestion.alternatives,
        reasoning: suggestion.reasoning,
        estimatedTimeMinutes: Math.ceil(suggestion.alternatives.length * 2)
      }))
  }
}

/**
 * Get quality grade based on analysis results
 */
function getQualityGrade(clicheAnalysis: ClicheAnalysis, plagiarismResult: PlagiarismResult): string {
  const combinedScore = calculateCombinedScore(clicheAnalysis, plagiarismResult)
  
  if (combinedScore >= 9) return 'A+'
  if (combinedScore >= 8.5) return 'A'
  if (combinedScore >= 8) return 'A-'
  if (combinedScore >= 7.5) return 'B+'
  if (combinedScore >= 7) return 'B'
  if (combinedScore >= 6.5) return 'B-'
  if (combinedScore >= 6) return 'C+'
  if (combinedScore >= 5.5) return 'C'
  if (combinedScore >= 5) return 'C-'
  if (combinedScore >= 4) return 'D'
  return 'F'
}

/**
 * Generate detailed performance report
 */
function generatePerformanceReport(
  clicheAnalysis: ClicheAnalysis, 
  plagiarismResult: PlagiarismResult,
  processingTime: number
) {
  return {
    analysisEfficiency: {
      processingTimeMs: processingTime,
      tokensPerSecond: Math.round((clicheAnalysis.totalTokens / processingTime) * 1000),
      clichesDetectedPerSecond: Math.round((clicheAnalysis.detectedCliches.length / processingTime) * 1000)
    },
    detectionAccuracy: {
      clicheConfidenceAverage: clicheAnalysis.detectedCliches.length > 0
        ? clicheAnalysis.detectedCliches.reduce((sum, c) => sum + (c.severity === 'HIGH' ? 1 : 0.5), 0) / clicheAnalysis.detectedCliches.length
        : 1,
      plagiarismConfidence: Math.min(1, plagiarismResult.similarityScore + 0.2)
    },
    recommendations: {
      prioritizeRewrites: clicheAnalysis.density > 1,
      focusOnOriginality: plagiarismResult.similarityScore > 0.6,
      overallAction: clicheAnalysis.needsRewrite ? 'REWRITE_REQUIRED' : 'MINOR_POLISH'
    }
  }
}