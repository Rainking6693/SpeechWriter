import { Handler } from '@netlify/functions'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import {
  getUserPersona,
  getSpeechWithSections,
  generateAICompletion,
  parseJSONSafely,
  db
} from './lib/humanization-utils'
import { speeches } from '@speechwriter/database/schema'

const abTestSchema = z.object({
  speechId: z.string().uuid(),
  originalText: z.string().min(1),
  humanizedText: z.string().min(1),
  userFeedback: z.object({
    preference: z.enum(['original', 'humanized', 'no_preference']),
    reasonForPreference: z.string().optional(),
    specificLikes: z.array(z.string()).optional().default([]),
    specificDislikes: z.array(z.string()).optional().default([]),
    overallRating: z.number().min(1).max(10).optional()
  }).optional()
})

// JWT verification for auth
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.NEXTAUTH_SECRET!)
  } catch {
    return null
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication
    const authHeader = event.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token) as any
    if (!decoded?.sub) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    const userId = decoded.sub
    
    // Parse request
    const body = JSON.parse(event.body || '{}')
    const { speechId, originalText, humanizedText, userFeedback } = abTestSchema.parse(body)

    // Verify speech ownership
    const { speech, sections } = await getSpeechWithSections(speechId)
    if (!speech || speech.userId !== userId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Speech not found' })
      }
    }

    // Get user persona for context
    const userPersona = await getUserPersona(userId)

    // If user feedback is provided, save it and return analysis
    if (userFeedback) {
      // Store the A/B test result
      const abTestResult = {
        speechId,
        userId,
        originalText,
        humanizedText,
        userPreference: userFeedback.preference,
        reasonForPreference: userFeedback.reasonForPreference,
        specificLikes: userFeedback.specificLikes,
        specificDislikes: userFeedback.specificDislikes,
        overallRating: userFeedback.overallRating,
        timestamp: new Date().toISOString()
      }

      // For now, we'll store in speech metadata. In production, you'd want a dedicated table
      const currentMetadata = speech.metadata as any || {}
      currentMetadata.abTestResults = currentMetadata.abTestResults || []
      currentMetadata.abTestResults.push(abTestResult)

      await db
        .update(speeches)
        .set({ 
          metadata: currentMetadata,
          updatedAt: new Date()
        })
        .where(eq(speeches.id, speechId))

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: JSON.stringify({
          success: true,
          message: 'A/B test feedback recorded',
          result: abTestResult,
          analysis: {
            improvementDetected: userFeedback.preference === 'humanized',
            userSatisfaction: userFeedback.overallRating || null,
            keyInsights: generateInsights(userFeedback)
          }
        })
      }
    }

    // If no user feedback provided, generate AI-based comparative analysis
    const systemPrompt = `You are an expert speech quality evaluator conducting an A/B test analysis. Compare two versions of the same speech content and provide detailed analysis of their relative strengths and weaknesses.

Evaluate these dimensions (score each 1-10):
1. ENGAGEMENT: Which version is more likely to capture and hold audience attention?
2. CLARITY: Which version communicates ideas more clearly and effectively?
3. MEMORABILITY: Which version contains more memorable phrases and concepts?
4. AUTHENTICITY: Which version sounds more natural and genuine?
5. PERSUASIVENESS: Which version is more likely to achieve the speech's goals?

Return your analysis in this JSON format:
{
  "comparison": {
    "original": {
      "engagement": 7.5,
      "clarity": 8.0,
      "memorability": 6.5,
      "authenticity": 8.5,
      "persuasiveness": 7.0,
      "overall": 7.5
    },
    "humanized": {
      "engagement": 8.2,
      "clarity": 8.5,
      "memorability": 8.8,
      "authenticity": 7.8,
      "persuasiveness": 8.3,
      "overall": 8.3
    }
  },
  "winner": "original|humanized|tie",
  "winningMargin": 0.8,
  "keyDifferences": [
    {
      "dimension": "memorability",
      "originalStrength": "what the original does well",
      "humanizedStrength": "what the humanized version does well",
      "recommendation": "which approach is better for this context"
    }
  ],
  "audienceImpact": {
    "originalVersion": "how the audience would likely respond",
    "humanizedVersion": "how the audience would likely respond",
    "contextConsiderations": "factors specific to this occasion and audience"
  },
  "recommendations": {
    "shouldUseHumanized": true,
    "reasoning": "detailed explanation of the recommendation",
    "furtherImprovements": ["suggestions for additional enhancements"],
    "potentialConcerns": ["any risks or downsides to consider"]
  },
  "qualityMetrics": {
    "improvementAreas": ["where humanization helped most"],
    "regressionAreas": ["where humanization may have hurt"],
    "netImprovement": 10.2
  }
}`

    const userPrompt = `Compare these two versions of speech content and determine which is more effective:

SPEECH CONTEXT:
Title: ${speech.title}
Occasion: ${speech.occasion}
Audience: ${speech.audience}
Duration: ${speech.targetDurationMinutes} minutes
Thesis: ${speech.thesis}

${userPersona ? `
SPEAKER PERSONA:
Name: ${userPersona.persona.name}
Description: ${userPersona.persona.description || 'No specific description'}
Target Tone: ${Object.entries(userPersona.persona.toneSliders as any || {}).map(([key, value]) => `${key}: ${value}%`).join(', ')}
` : ''}

ORIGINAL VERSION:
${originalText}

HUMANIZED VERSION:
${humanizedText}

EVALUATION CRITERIA:
Consider which version will be more effective for:
- A ${speech.occasion} setting
- An audience of ${speech.audience}
- Achieving the goal: ${speech.thesis}
${userPersona ? `- Matching the speaker's persona: ${userPersona.persona.name}` : ''}

Provide specific examples from both texts to support your analysis. Focus on practical impact for live delivery.`

    // Generate AI comparison
    const { result, processingTime } = await generateAICompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 3000,
      model: 'gpt-4'
    })

    const comparison = parseJSONSafely(result)
    if (!comparison || !comparison.comparison) {
      throw new Error('Invalid response format from A/B test evaluator')
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        comparison: comparison.comparison,
        recommendation: {
          winner: comparison.winner,
          shouldUseHumanized: comparison.recommendations?.shouldUseHumanized,
          reasoning: comparison.recommendations?.reasoning,
          confidence: comparison.winningMargin ? `${(comparison.winningMargin * 10).toFixed(1)}%` : 'moderate'
        },
        analysis: {
          keyDifferences: comparison.keyDifferences || [],
          audienceImpact: comparison.audienceImpact || {},
          qualityMetrics: comparison.qualityMetrics || {},
          furtherImprovements: comparison.recommendations?.furtherImprovements || [],
          potentialConcerns: comparison.recommendations?.potentialConcerns || []
        },
        meta: {
          processingTimeMs: processingTime,
          evaluationMethod: 'ai_comparative_analysis',
          speechContext: {
            occasion: speech.occasion,
            audience: speech.audience,
            duration: speech.targetDurationMinutes
          }
        },
        userFeedbackForm: {
          instructions: "After reviewing this analysis, please provide your own preference",
          options: ['original', 'humanized', 'no_preference'],
          additionalQuestions: [
            "What specific aspects do you prefer in your chosen version?",
            "Are there any concerns about the recommended version?",
            "How would you rate the overall quality improvement? (1-10)"
          ]
        }
      })
    }

  } catch (error) {
    console.error('Error in A/B test:', error)
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to run A/B test analysis',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

function generateInsights(userFeedback: any): string[] {
  const insights: string[] = []
  
  if (userFeedback.preference === 'humanized') {
    insights.push('User prefers the humanized version, indicating successful improvement')
  } else if (userFeedback.preference === 'original') {
    insights.push('User prefers the original, suggesting humanization may have been too aggressive')
  } else {
    insights.push('User shows no clear preference, indicating subtle improvements')
  }
  
  if (userFeedback.overallRating) {
    if (userFeedback.overallRating >= 8) {
      insights.push('High user satisfaction with the results')
    } else if (userFeedback.overallRating >= 6) {
      insights.push('Moderate user satisfaction, room for improvement')
    } else {
      insights.push('Low user satisfaction, humanization approach needs revision')
    }
  }
  
  if (userFeedback.specificLikes?.length > 0) {
    insights.push(`User particularly appreciated: ${userFeedback.specificLikes.join(', ')}`)
  }
  
  if (userFeedback.specificDislikes?.length > 0) {
    insights.push(`User had concerns about: ${userFeedback.specificDislikes.join(', ')}`)
  }
  
  return insights
}

export { handler }