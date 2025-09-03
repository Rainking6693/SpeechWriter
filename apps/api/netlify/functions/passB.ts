import { Handler } from '@netlify/functions'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import {
  calculateStylometry,
  saveHumanizationPass,
  getUserPersona,
  getSpeechWithSections,
  generateAICompletion,
  parseJSONSafely
} from './lib/humanization-utils'

const passBSchema = z.object({
  speechId: z.string().uuid(),
  inputText: z.string().min(1),
  passOrder: z.number().int().positive().optional().default(2)
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

  const startTime = Date.now()

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
    const { speechId, inputText, passOrder } = passBSchema.parse(body)

    // Get speech details for context
    const { speech, sections } = await getSpeechWithSections(speechId)
    if (!speech || speech.userId !== userId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Speech not found' })
      }
    }

    // Get user persona - this is critical for Pass B
    const userPersona = await getUserPersona(userId)
    if (!userPersona) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No persona found. Pass B requires a persona to harmonize style.' })
      }
    }

    // Calculate initial stylometry
    const initialStylometry = calculateStylometry(inputText, userPersona.styleCard)

    // Extract tone preferences and constraints
    const toneSliders = userPersona.persona.toneSliders as any || {}
    const doList = userPersona.persona.doList || ''
    const dontList = userPersona.persona.dontList || ''
    const styleCard = userPersona.styleCard

    // Build comprehensive persona harmonization prompt
    const systemPrompt = `You are an expert speech style harmonizer. Your role is to modify speech content to match a specific persona's style constraints while preserving meaning and impact.

Your tasks:
1. SENTENCE LENGTH ADJUSTMENT: Match the target average sentence length
2. RHYTHM & PACE: Adjust punctuation and flow patterns
3. TONE ALIGNMENT: Apply specific tone slider preferences
4. STYLE CONSTRAINTS: Follow persona DO/DON'T guidelines
5. METAPHOR DOMAIN: Use metaphors from preferred domains
6. POS RHYTHM: Maintain consistent part-of-speech patterns

Return your response in this JSON format:
{
  "harmonizedText": "The style-adjusted version of the text",
  "changes": [
    {
      "type": "sentence_length|tone|rhythm|constraint|metaphor",
      "original": "original phrase",
      "replacement": "harmonized phrase",
      "explanation": "how this aligns with persona",
      "constraint": "which persona constraint this addresses"
    }
  ],
  "stylometryAdjustments": {
    "sentenceLengthChanges": [
      {
        "original": "long original sentence",
        "split": ["shorter", "sentences"],
        "targetLength": 15
      }
    ],
    "toneAdjustments": [
      {
        "dimension": "formality|energy|warmth|etc",
        "direction": "increased|decreased",
        "examples": ["specific changes made"]
      }
    ],
    "rhythmImprovement": {
      "punctuationAdded": ["locations where punctuation was added"],
      "flowEnhancements": ["rhythm improvements made"]
    }
  },
  "personaAlignment": {
    "doConstraintsFollowed": ["constraints from DO list that were applied"],
    "dontConstraintsAvoided": ["constraints from DON'T list that were avoided"],
    "toneSliderAlignment": {
      "dimension": "how well aligned (0-1 score)"
    }
  }
}`

    const userPrompt = `Harmonize this speech content to match the user's persona and style preferences:

SPEECH CONTEXT:
Title: ${speech.title}
Occasion: ${speech.occasion}
Audience: ${speech.audience}

PERSONA TO MATCH:
Name: ${userPersona.persona.name}
Description: ${userPersona.persona.description || 'No specific description'}

TONE SLIDERS (adjust content to match these preferences):
${Object.entries(toneSliders).map(([key, value]) => `- ${key}: ${value}% (${value > 70 ? 'high' : value > 30 ? 'medium' : 'low'})`).join('\n')}

STYLE CONSTRAINTS:
DO: ${doList || 'No specific guidelines'}
DON'T: ${dontList || 'No specific restrictions'}

STYLE CARD TARGETS:
${styleCard ? `
- Target sentence length: ${styleCard.avgSentenceLength || 15} words
- Preferred punctuation density: ${styleCard.punctuationDensity || 'moderate'}
- Complexity level: ${styleCard.complexityLevel || 'moderate'}
- Metaphor domains: ${styleCard.metaphorDomains || 'general'}
` : 'No specific style card available'}

CURRENT STYLOMETRY ANALYSIS:
- Average sentence length: ${initialStylometry.metrics.avgSentenceLength.toFixed(1)} words (target: ${initialStylometry.metrics.targetSentenceLength})
- Sentence length difference: ${initialStylometry.metrics.sentenceLengthDiff.toFixed(1)} words
- Punctuation density: ${(initialStylometry.metrics.punctuationDensity * 100).toFixed(1)}%
- Complexity score: ${(initialStylometry.metrics.complexityScore * 100).toFixed(1)}%
- Current distance from target: ${initialStylometry.distance.toFixed(3)}

TEXT TO HARMONIZE:
${inputText}

REQUIREMENTS:
1. Adjust sentence lengths to target ${styleCard?.avgSentenceLength || 15} words average
2. Apply tone slider preferences (especially those > 70% or < 30%)
3. Follow ALL constraints in the DO list
4. Avoid ALL constraints in the DON'T list
5. Reduce stylometry distance by at least 30%
6. Maintain original meaning and impact
7. Keep appropriate for ${speech.occasion} audience

Generate the harmonized version now:`

    // Generate harmonized content
    const { result, processingTime } = await generateAICompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.6, // Slightly lower for consistency
      maxTokens: 3000,
      model: 'gpt-4'
    })

    // Parse the JSON response
    const harmonization = parseJSONSafely(result)
    if (!harmonization || !harmonization.harmonizedText) {
      throw new Error('Invalid response format from AI')
    }

    const harmonizedText = harmonization.harmonizedText
    const changes = harmonization.changes || []

    // Calculate final stylometry
    const finalStylometry = calculateStylometry(harmonizedText, userPersona.styleCard)

    // Calculate improvement metrics
    const stylometryImprovement = initialStylometry.distance - finalStylometry.distance
    const sentenceLengthImprovement = Math.abs(initialStylometry.metrics.sentenceLengthDiff) - 
                                     Math.abs(finalStylometry.metrics.sentenceLengthDiff)

    const metrics = {
      stylometry: {
        before: {
          distance: initialStylometry.distance,
          avgSentenceLength: initialStylometry.metrics.avgSentenceLength,
          punctuationDensity: initialStylometry.metrics.punctuationDensity,
          complexityScore: initialStylometry.metrics.complexityScore
        },
        after: {
          distance: finalStylometry.distance,
          avgSentenceLength: finalStylometry.metrics.avgSentenceLength,
          punctuationDensity: finalStylometry.metrics.punctuationDensity,
          complexityScore: finalStylometry.metrics.complexityScore
        },
        improvement: stylometryImprovement
      },
      personaAlignment: {
        sentenceLengthImprovement,
        toneSliderAlignment: harmonization.personaAlignment?.toneSliderAlignment || {},
        constraintsFollowed: harmonization.personaAlignment?.doConstraintsFollowed?.length || 0,
        constraintsAvoided: harmonization.personaAlignment?.dontConstraintsAvoided?.length || 0
      },
      overallScore: Math.min(1.0, Math.max(0, (
        (stylometryImprovement > 0 ? 0.4 : 0) +
        (sentenceLengthImprovement > 0 ? 0.3 : 0) +
        ((harmonization.personaAlignment?.doConstraintsFollowed?.length || 0) * 0.1) +
        ((harmonization.personaAlignment?.dontConstraintsAvoided?.length || 0) * 0.1) +
        0.1 // Base score for attempting harmonization
      )))
    }

    // Save harmonization pass to database
    const humanizationPass = await saveHumanizationPass({
      speechId,
      passType: 'persona',
      inputText,
      outputText: harmonizedText,
      passOrder,
      changes: harmonization.changes,
      metrics,
      processingTimeMs: Date.now() - startTime
    })

    const totalProcessingTime = Date.now() - startTime

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        success: true,
        passId: humanizationPass.id,
        harmonizedText,
        originalText: inputText,
        changes,
        metrics: {
          ...metrics,
          processingTimeMs: totalProcessingTime
        },
        analysis: {
          stylometryAnalysis: {
            before: initialStylometry,
            after: finalStylometry,
            improvement: stylometryImprovement,
            targetMet: finalStylometry.distance < 0.3 // Threshold for "good" alignment
          },
          personaHarmonization: harmonization.personaAlignment,
          styleAdjustments: harmonization.stylometryAdjustments,
          toneAlignment: Object.entries(toneSliders).map(([key, value]) => ({
            dimension: key,
            target: value,
            achieved: harmonization.personaAlignment?.toneSliderAlignment?.[key] || 0
          }))
        }
      })
    }

  } catch (error) {
    console.error('Error in Pass B:', error)
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to harmonize content with persona',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

export { handler }