import { Handler } from '@netlify/functions'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import {
  calculateClicheDensity,
  saveHumanizationPass,
  saveClicheAnalysis,
  getUserPersona,
  getSpeechWithSections,
  generateAICompletion,
  parseJSONSafely,
  RHETORICAL_PATTERNS
} from './lib/humanization-utils'

const passASchema = z.object({
  speechId: z.string().uuid(),
  inputText: z.string().min(1),
  passOrder: z.number().int().positive().optional().default(1)
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
    const { speechId, inputText, passOrder } = passASchema.parse(body)

    // Get speech details for context
    const { speech, sections } = await getSpeechWithSections(speechId)
    if (!speech || speech.userId !== userId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Speech not found' })
      }
    }

    // Get user persona for style preferences
    const userPersona = await getUserPersona(userId)

    // Calculate initial cliché density
    const initialCliches = calculateClicheDensity(inputText)

    // Build comprehensive prompt for Pass A
    const systemPrompt = `You are an expert speech rhetorician and content enhancer. Your role is to enhance speech content by:

1. ADDING RHETORICAL DEVICES:
   - Anaphora (repetition of opening phrases): "We must... We must... We must..."
   - Triads (rule of three): "X, Y, and Z" 
   - Powerful callbacks to earlier sections or stories

2. SPECIFICITY UPGRADE:
   - Replace vague claims with concrete examples
   - Add specific numbers, names, dates, and details
   - Transform abstract concepts into tangible scenarios

3. CLICHÉ REDUCTION:
   - Identify and replace overused phrases
   - Create fresh, memorable language
   - Generate quotable, original expressions

Return your response in this JSON format:
{
  "enhancedText": "The improved version of the text",
  "changes": [
    {
      "type": "anaphora|triad|callback|specificity|cliche_replacement",
      "original": "original phrase",
      "replacement": "new phrase", 
      "explanation": "why this change improves the text",
      "position": "approximate position in text"
    }
  ],
  "rhetoricalDevices": {
    "anaphora": ["list of anaphora patterns added"],
    "triads": ["list of triads added"],
    "callbacks": ["list of callback references added"]
  },
  "clicheReductions": [
    {
      "original": "cliche phrase",
      "replacement": "fresh alternative",
      "reason": "why this is an improvement"
    }
  ],
  "quotableLines": ["memorable lines suitable for quotes"],
  "specificityUpgrades": [
    {
      "vague": "original vague statement",
      "specific": "concrete, detailed version",
      "impact": "why this is more compelling"
    }
  ]
}`

    const userPrompt = `Enhance this speech section using rhetorical devices, specificity, and cliché reduction:

SPEECH CONTEXT:
Title: ${speech.title}
Occasion: ${speech.occasion}
Audience: ${speech.audience}
Duration: ${speech.targetDurationMinutes} minutes
Thesis: ${speech.thesis}

${userPersona ? `
PERSONA PREFERENCES:
Name: ${userPersona.persona.name}
Description: ${userPersona.persona.description || 'No specific description'}
Tone: ${Object.entries(userPersona.persona.toneSliders as any || {}).map(([key, value]) => `${key}: ${value}%`).join(', ')}
DO: ${userPersona.persona.doList || 'No specific guidelines'}
DON'T: ${userPersona.persona.dontList || 'No specific restrictions'}
` : ''}

CURRENT CLICHÉ ANALYSIS:
- Density: ${initialCliches.density.toFixed(2)} clichés per 100 tokens
- Detected clichés: ${initialCliches.detectedCliches.join(', ') || 'None detected'}

TEXT TO ENHANCE:
${inputText}

REQUIREMENTS:
1. Significantly reduce cliché density from ${initialCliches.density.toFixed(2)} 
2. Add at least one rhetorical device (anaphora, triad, or callback)
3. Replace at least 2 vague statements with specific examples
4. Create at least one quotable line
5. Maintain the original length and flow
6. Keep the tone appropriate for ${speech.occasion} and ${speech.audience}

Generate the enhanced version now:`

    // Generate enhanced content
    const { result, processingTime } = await generateAICompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 3000,
      model: 'gpt-4'
    })

    // Parse the JSON response
    const enhancement = parseJSONSafely(result)
    if (!enhancement || !enhancement.enhancedText) {
      throw new Error('Invalid response format from AI')
    }

    const enhancedText = enhancement.enhancedText
    const changes = enhancement.changes || []

    // Calculate final cliché density
    const finalCliches = calculateClicheDensity(enhancedText)

    // Calculate improvement metrics
    const clicheImprovement = initialCliches.density - finalCliches.density
    const specificityScore = (enhancement.specificityUpgrades?.length || 0) * 0.25
    const rhetoricalScore = Object.values(enhancement.rhetoricalDevices || {})
      .flat().length * 0.2
    const quotabilityScore = (enhancement.quotableLines?.length || 0) * 0.3

    const metrics = {
      clicheDensityBefore: initialCliches.density,
      clicheDensityAfter: finalCliches.density,
      clicheImprovement,
      specificityUpgrades: enhancement.specificityUpgrades?.length || 0,
      rhetoricalDevicesAdded: Object.values(enhancement.rhetoricalDevices || {}).flat().length,
      quotableLinesCreated: enhancement.quotableLines?.length || 0,
      overallScore: Math.min(1.0, (
        (clicheImprovement > 0 ? 0.3 : 0) +
        specificityScore +
        rhetoricalScore +
        quotabilityScore
      ))
    }

    // Save humanization pass to database
    const humanizationPass = await saveHumanizationPass({
      speechId,
      passType: 'rhetoric',
      inputText,
      outputText: enhancedText,
      passOrder,
      changes: enhancement.changes,
      metrics,
      processingTimeMs: Date.now() - startTime
    })

    // Save detailed cliché analysis
    await saveClicheAnalysis({
      speechId,
      textSample: enhancedText,
      detectedCliches: finalCliches.detectedCliches,
      clicheDensity: finalCliches.density,
      replacementSuggestions: enhancement.clicheReductions || [],
      overallScore: 1 - (finalCliches.density / 5) // Score based on cliché density
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
        enhancedText,
        originalText: inputText,
        changes,
        metrics: {
          ...metrics,
          processingTimeMs: totalProcessingTime
        },
        analysis: {
          clicheAnalysis: {
            before: {
              density: initialCliches.density,
              detected: initialCliches.detectedCliches
            },
            after: {
              density: finalCliches.density,
              detected: finalCliches.detectedCliches
            },
            improvement: clicheImprovement
          },
          rhetoricalDevices: enhancement.rhetoricalDevices,
          specificityUpgrades: enhancement.specificityUpgrades,
          quotableLines: enhancement.quotableLines,
          clicheReductions: enhancement.clicheReductions
        }
      })
    }

  } catch (error) {
    console.error('Error in Pass A:', error)
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to enhance content with Pass A',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

export { handler }