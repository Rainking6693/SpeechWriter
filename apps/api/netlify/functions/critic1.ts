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

const critic1Schema = z.object({
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
    const { speechId, humanizationPassId, inputText } = critic1Schema.parse(body)

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

    // Critic 1 focuses on SPECIFICITY and FRESHNESS
    const systemPrompt = `You are Critic 1, a senior speechwriting expert specializing in SPECIFICITY and FRESHNESS evaluation. Your role is to critically analyze speech content and provide detailed feedback with specific improvement suggestions.

Your evaluation criteria:
1. SPECIFICITY (0-10): How concrete and detailed is the content?
   - 9-10: Rich with specific examples, names, numbers, scenarios
   - 7-8: Good mix of specific and general content
   - 5-6: Some specifics but mostly general statements
   - 3-4: Mostly vague, few concrete details
   - 1-2: Very abstract, lacks concrete examples

2. FRESHNESS (0-10): How original and engaging is the language?
   - 9-10: Highly original metaphors, unexpected turns, memorable phrases
   - 7-8: Good mix of fresh and familiar language
   - 5-6: Some creative elements but mostly conventional
   - 3-4: Mostly predictable, some clichéd language
   - 1-2: Heavy use of clichés, very predictable phrasing

3. PERFORMABILITY (0-10): How well does this work for live delivery?
   - 9-10: Natural rhythm, clear breaks, powerful emphasis points
   - 7-8: Generally flows well with good delivery cues
   - 5-6: Adequate for reading but some awkward phrases
   - 3-4: Difficult to deliver naturally, unclear rhythm
   - 1-2: Very difficult to speak, poor flow

4. PERSONA-FIT (0-10): How well does this align with the intended persona?
   - 9-10: Perfect alignment with tone, style, and personality
   - 7-8: Good fit with minor inconsistencies
   - 5-6: Adequate but some misalignment
   - 3-4: Noticeable conflicts with persona
   - 1-2: Strong conflicts with intended persona

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
      "type": "specificity|freshness|performability|persona",
      "issue": "Description of the problem",
      "original": "problematic phrase from text",
      "suggestion": "specific improvement",
      "impact": "why this change would help",
      "priority": "high|medium|low",
      "startChar": 123,
      "endChar": 156
    }
  ],
  "strengths": ["list of what works well in the current text"],
  "weaknesses": ["list of what needs improvement"],
  "overallRecommendation": "high-level guidance for improvement"
}`

    const userPrompt = `Please evaluate this speech content as Critic 1, focusing on specificity and freshness:

SPEECH CONTEXT:
Title: ${speech.title}
Occasion: ${speech.occasion}
Audience: ${speech.audience}
Duration: ${speech.targetDurationMinutes} minutes
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
1. SPECIFICITY: Look for vague statements that could be made more concrete
   - Check for abstract concepts that need specific examples
   - Identify claims that need supporting details
   - Flag generalizations that could be more precise

2. FRESHNESS: Evaluate language originality and engagement
   - Identify any clichéd phrases or overused expressions
   - Look for opportunities to create more memorable language
   - Assess metaphor quality and originality

3. PERFORMABILITY: Consider live delivery aspects
   - Check sentence length and complexity for speaking
   - Evaluate natural rhythm and flow
   - Look for emphasis opportunities and pause points

4. PERSONA FIT: Assess alignment with target persona
   - Check tone consistency with persona preferences
   - Evaluate style alignment
   - Look for conflicts with DO/DON'T constraints

Provide specific, actionable feedback with character positions for edits. Be thorough but constructive.`

    // Generate critic evaluation
    const { result, processingTime } = await generateAICompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.3, // Lower temperature for more consistent evaluation
      maxTokens: 2500,
      model: 'gpt-4'
    })

    // Parse the JSON response
    const evaluation = parseJSONSafely(result)
    if (!evaluation || !evaluation.scores) {
      throw new Error('Invalid response format from Critic 1')
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
      criticType: 'critic1',
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
        criticType: 'critic1',
        focus: ['specificity', 'freshness'],
        scores,
        feedback: evaluation.feedback,
        suggestions: evaluation.suggestions || [],
        strengths: evaluation.strengths || [],
        weaknesses: evaluation.weaknesses || [],
        overallRecommendation: evaluation.overallRecommendation || '',
        processingTimeMs: processingTime,
        meta: {
          evaluationCriteria: {
            specificity: 'Concrete details, examples, and supporting evidence',
            freshness: 'Original language, memorable phrases, avoiding clichés',
            performability: 'Natural delivery, rhythm, and emphasis points',
            personaFit: 'Alignment with target persona and style preferences'
          },
          prioritySuggestions: (evaluation.suggestions || []).filter(s => s.priority === 'high')
        }
      })
    }

  } catch (error) {
    console.error('Error in Critic 1:', error)
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to evaluate content with Critic 1',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

export { handler }