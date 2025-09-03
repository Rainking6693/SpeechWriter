import { Handler } from '@netlify/functions'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import {
  saveCriticFeedback,
  getUserPersona,
  getSpeechWithSections,
  generateAICompletion,
  parseJSONSafely
} from './lib/humanization-utils'

const critic2Schema = z.object({
  speechId: z.string().uuid(),
  humanizationPassId: z.string().uuid(),
  inputText: z.string().min(1)
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
    const { speechId, humanizationPassId, inputText } = critic2Schema.parse(body)

    // Get speech details for context
    const { speech, sections } = await getSpeechWithSections(speechId)
    if (!speech || speech.userId !== userId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Speech not found' })
      }
    }

    // Get user persona for context
    const userPersona = await getUserPersona(userId)

    // Critic 2 focuses on PERFORMABILITY and PERSONA-FIT with different perspective
    const systemPrompt = `You are Critic 2, a senior speechwriting expert specializing in AUDIENCE ENGAGEMENT and DELIVERY OPTIMIZATION. Your role is to critically analyze speech content from a performer's and audience's perspective.

Your evaluation criteria (different focus than Critic 1):
1. SPECIFICITY (0-10): Focus on audience relevance and connection
   - 9-10: Highly relatable examples, audience-specific details
   - 7-8: Good audience connection with relevant examples
   - 5-6: Some audience relevance but could be more targeted
   - 3-4: Generic examples, weak audience connection
   - 1-2: No audience specificity, completely generic

2. FRESHNESS (0-10): Focus on surprise and memorability
   - 9-10: Unexpected insights, surprising connections, memorable turns
   - 7-8: Some surprising elements, good memorable moments
   - 5-6: Predictable but competent, few surprises
   - 3-4: Very predictable, lacks memorable moments
   - 1-2: Boring, completely predictable, forgettable

3. PERFORMABILITY (0-10): Focus on vocal delivery and physical presence
   - 9-10: Perfect rhythm, natural breathing, strong emphasis opportunities
   - 7-8: Good vocal flow with clear delivery points
   - 5-6: Adequate for delivery but some challenging sections
   - 3-4: Difficult vocal delivery, awkward phrasing
   - 1-2: Very hard to deliver naturally, poor rhythm

4. PERSONA-FIT (0-10): Focus on authentic voice and consistency
   - 9-10: Completely authentic to persona, natural voice
   - 7-8: Mostly authentic with good consistency
   - 5-6: Generally fits persona with some off-notes
   - 3-4: Some authentic moments but inconsistent
   - 1-2: Feels forced, doesn't match persona

Return your analysis in this JSON format:
{
  "scores": {
    "specificity": 7.5,
    "freshness": 8.0,
    "performability": 6.5,
    "personaFit": 7.0,
    "overall": 7.25
  },
  "feedback": "Detailed paragraph explaining your assessment with specific examples from the text",
  "suggestions": [
    {
      "type": "audience_connection|surprise_factor|vocal_delivery|authenticity",
      "issue": "Description of the problem from delivery perspective",
      "original": "problematic phrase from text",
      "suggestion": "specific improvement for better delivery/engagement",
      "impact": "how this helps the speaker and audience experience",
      "priority": "high|medium|low",
      "startChar": 123,
      "endChar": 156,
      "deliveryNote": "specific guidance for how to perform this section"
    }
  ],
  "audienceEngagement": {
    "connectionPoints": ["moments that will resonate with audience"],
    "lostOpportunities": ["missed chances to connect with audience"],
    "energyFlow": "assessment of how energy builds and flows"
  },
  "deliveryGuidance": {
    "breathingPoints": ["natural places for speaker to breathe"],
    "emphasisOpportunities": ["words/phrases that need emphasis"],
    "gesturePrompts": ["moments that call for physical gestures"],
    "paceVariation": ["sections that need faster/slower delivery"]
  },
  "strengths": ["what works well from performance perspective"],
  "weaknesses": ["what hinders effective delivery"],
  "overallRecommendation": "high-level guidance focused on performance success"
}`

    const userPrompt = `Please evaluate this speech content as Critic 2, focusing on audience engagement and delivery optimization:

SPEECH CONTEXT:
Title: ${speech.title}
Occasion: ${speech.occasion}
Audience: ${speech.audience}
Duration: ${speech.targetDurationMinutes} minutes
Setting: Live speech delivery to ${speech.audience}
Thesis: ${speech.thesis}

${userPersona ? `
TARGET PERSONA:
Name: ${userPersona.persona.name}
Description: ${userPersona.persona.description || 'No specific description'}
Tone Preferences: ${Object.entries(userPersona.persona.toneSliders as any || {}).map(([key, value]) => `${key}: ${value}%`).join(', ')}
DO: ${userPersona.persona.doList || 'No specific guidelines'}
DON'T: ${userPersona.persona.dontList || 'No specific restrictions'}
` : ''}

TEXT TO EVALUATE:
${inputText}

EVALUATION FOCUS AREAS:
1. AUDIENCE CONNECTION: How well does this resonate with ${speech.audience}?
   - Look for audience-specific examples and references
   - Evaluate relevance to their experiences and concerns
   - Check for inclusive language and accessibility

2. SURPRISE & MEMORABILITY: What will stick with the audience?
   - Identify unexpected insights or connections
   - Look for quotable moments and memorable phrases
   - Assess emotional impact and engagement

3. VOCAL DELIVERY: How will this sound when spoken aloud?
   - Check for natural speech patterns and rhythm
   - Identify difficult-to-pronounce sections
   - Look for breathing points and vocal emphasis opportunities
   - Consider pace variations and energy flow

4. AUTHENTIC VOICE: How genuine does this sound for the persona?
   - Evaluate consistency with speaker's natural style
   - Check for forced or unnatural phrasing
   - Assess believability and authenticity

Consider this will be delivered live to ${speech.audience} at a ${speech.occasion}. Focus on what will help the speaker succeed and the audience connect.`

    // Generate critic evaluation
    const { result, processingTime } = await generateAICompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.3, // Lower temperature for consistent evaluation
      maxTokens: 2500,
      model: 'gpt-4'
    })

    // Parse the JSON response
    const evaluation = parseJSONSafely(result)
    if (!evaluation || !evaluation.scores) {
      throw new Error('Invalid response format from Critic 2')
    }

    // Validate scores are within range
    const scores = evaluation.scores
    Object.keys(scores).forEach(key => {
      if (scores[key] < 0 || scores[key] > 10) {
        scores[key] = Math.max(0, Math.min(10, scores[key]))
      }
    })

    // Save critic feedback to database
    const criticFeedback = await saveCriticFeedback({
      humanizationPassId,
      criticType: 'critic2',
      scores: {
        specificity: scores.specificity,
        freshness: scores.freshness,
        performability: scores.performability,
        personaFit: scores.personaFit,
        overall: scores.overall
      },
      suggestions: evaluation.suggestions || [],
      feedback: evaluation.feedback || '',
      acceptedEdits: [] // Will be populated by referee
    })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        criticId: criticFeedback.id,
        criticType: 'critic2',
        focus: ['audience_engagement', 'delivery_optimization'],
        scores,
        feedback: evaluation.feedback,
        suggestions: evaluation.suggestions || [],
        strengths: evaluation.strengths || [],
        weaknesses: evaluation.weaknesses || [],
        overallRecommendation: evaluation.overallRecommendation || '',
        audienceEngagement: evaluation.audienceEngagement || {},
        deliveryGuidance: evaluation.deliveryGuidance || {},
        processingTimeMs: processingTime,
        meta: {
          evaluationCriteria: {
            specificity: 'Audience relevance and connection points',
            freshness: 'Surprise factor and memorability',
            performability: 'Vocal delivery and physical presence',
            personaFit: 'Authentic voice and natural consistency'
          },
          deliveryFocus: 'This critic evaluates from a live performance perspective',
          audienceFocus: `Specifically considers ${speech.audience} at ${speech.occasion}`,
          prioritySuggestions: (evaluation.suggestions || []).filter(s => s.priority === 'high')
        }
      })
    }

  } catch (error) {
    console.error('Error in Critic 2:', error)
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to evaluate content with Critic 2',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

export { handler }