import { Handler } from '@netlify/functions'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import {
  saveHumanizationPass,
  getUserPersona,
  getSpeechWithSections,
  generateAICompletion,
  parseJSONSafely,
  mergeTextEdits,
  db
} from './lib/humanization-utils'
import { criticFeedback } from '@speechwriter/database/schema'

const refereeSchema = z.object({
  speechId: z.string().uuid(),
  inputText: z.string().min(1),
  critic1Id: z.string().uuid(),
  critic2Id: z.string().uuid(),
  timeBudgetSeconds: z.number().int().positive().optional().default(120), // 2 minutes default
  passOrder: z.number().int().positive().optional().default(3)
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
    const { speechId, inputText, critic1Id, critic2Id, timeBudgetSeconds, passOrder } = refereeSchema.parse(body)

    // Get speech details for context
    const { speech, sections } = await getSpeechWithSections(speechId)
    if (!speech || speech.userId !== userId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Speech not found' })
      }
    }

    // Get critic feedback from database
    const [critic1Feedback] = await db
      .select()
      .from(criticFeedback)
      .where(eq(criticFeedback.id, critic1Id))
      .limit(1)

    const [critic2Feedback] = await db
      .select()
      .from(criticFeedback)
      .where(eq(criticFeedback.id, critic2Id))
      .limit(1)

    if (!critic1Feedback || !critic2Feedback) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Critic feedback not found' })
      }
    }

    // Get user persona for context
    const userPersona = await getUserPersona(userId)

    // Build comprehensive referee prompt
    const systemPrompt = `You are the Referee, an expert speechwriting arbitrator who synthesizes feedback from multiple critics to create optimal improvements. Your role is to:

1. ANALYZE CONFLICTS: Identify where critics disagree and resolve conflicts intelligently
2. PRIORITIZE EDITS: Choose the most impactful improvements within time/budget constraints
3. MERGE SUGGESTIONS: Combine complementary suggestions into coherent edits
4. MAINTAIN COHERENCE: Ensure all changes work together harmoniously
5. RESPECT CONSTRAINTS: Stay within the time budget and preserve speech flow

Your decision-making framework:
- High-impact, low-effort changes get priority
- Conflicting suggestions are resolved based on speech context and goals
- Maintain the speaker's authentic voice throughout
- Preserve the speech's core message and structure
- Consider the audience and occasion in all decisions

Return your analysis in this JSON format:
{
  "finalText": "The improved version incorporating selected edits",
  "editsApplied": [
    {
      "source": "critic1|critic2|referee_synthesis",
      "type": "specificity|freshness|performability|persona|conflict_resolution",
      "original": "original text",
      "replacement": "new text",
      "rationale": "why this edit was chosen over alternatives",
      "impact": "expected improvement",
      "startChar": 123,
      "endChar": 156,
      "conflictResolution": "if this resolved a disagreement between critics"
    }
  ],
  "editsRejected": [
    {
      "source": "critic1|critic2",
      "original": "text that would have been changed",
      "suggestion": "suggestion that was rejected",
      "reason": "why this edit was not applied"
    }
  ],
  "conflictResolutions": [
    {
      "issue": "description of the disagreement",
      "critic1Position": "what critic 1 wanted",
      "critic2Position": "what critic 2 wanted", 
      "resolution": "how the referee resolved it",
      "rationale": "reasoning behind the resolution"
    }
  ],
  "synthesizedImprovements": [
    {
      "combinedFrom": ["critic1_suggestion_id", "critic2_suggestion_id"],
      "newSuggestion": "how the suggestions were combined",
      "synergy": "why combining these suggestions is better than either alone"
    }
  ],
  "timeUsed": 95,
  "prioritizationStrategy": "explanation of how edits were prioritized",
  "qualityMetrics": {
    "specificityImprovement": 1.2,
    "freshnessImprovement": 0.8,
    "performabilityImprovement": 1.5,
    "personaAlignmentImprovement": 0.9,
    "overallImprovement": 1.1
  }
}`

    const userPrompt = `As the Referee, synthesize the feedback from both critics to create the optimal improved version:

SPEECH CONTEXT:
Title: ${speech.title}
Occasion: ${speech.occasion}
Audience: ${speech.audience}
Duration: ${speech.targetDurationMinutes} minutes
Thesis: ${speech.thesis}

TIME BUDGET: ${timeBudgetSeconds} seconds for improvements

${userPersona ? `
TARGET PERSONA:
Name: ${userPersona.persona.name}
Description: ${userPersona.persona.description || 'No specific description'}
Tone Preferences: ${Object.entries(userPersona.persona.toneSliders as any || {}).map(([key, value]) => `${key}: ${value}%`).join(', ')}
` : ''}

CRITIC 1 FEEDBACK (Specificity & Freshness Focus):
Overall Score: ${critic1Feedback.overallScore}/10
Scores: Specificity: ${critic1Feedback.specificityScore}, Freshness: ${critic1Feedback.freshnessScore}, Performability: ${critic1Feedback.performabilityScore}, Persona-Fit: ${critic1Feedback.personaFitScore}
Feedback: ${critic1Feedback.feedback}
Suggestions: ${JSON.stringify(critic1Feedback.suggestions, null, 2)}

CRITIC 2 FEEDBACK (Audience Engagement & Delivery Focus):
Overall Score: ${critic2Feedback.overallScore}/10
Scores: Specificity: ${critic2Feedback.specificityScore}, Freshness: ${critic2Feedback.freshnessScore}, Performability: ${critic2Feedback.performabilityScore}, Persona-Fit: ${critic2Feedback.personaFitScore}
Feedback: ${critic2Feedback.feedback}
Suggestions: ${JSON.stringify(critic2Feedback.suggestions, null, 2)}

ORIGINAL TEXT:
${inputText}

REFEREE INSTRUCTIONS:
1. Compare both critics' suggestions and identify conflicts or overlaps
2. Prioritize edits that both critics would appreciate or that address major weaknesses
3. Resolve conflicts by considering: audience needs, speech context, persona fit, and delivery requirements
4. Within the ${timeBudgetSeconds}-second time budget, apply the most impactful improvements
5. Create a cohesive final version that feels natural and maintains the speaker's voice
6. Explain your reasoning for each major decision

Focus on changes that will have the biggest positive impact on the speech's effectiveness for ${speech.audience} at this ${speech.occasion}.`

    // Generate referee decision
    const { result, processingTime } = await generateAICompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.4, // Balanced temperature for creative but consistent decisions
      maxTokens: 4000, // More tokens for comprehensive analysis
      model: 'gpt-4'
    })

    // Parse the JSON response
    const refereeDecision = parseJSONSafely(result)
    if (!refereeDecision || !refereeDecision.finalText) {
      throw new Error('Invalid response format from Referee')
    }

    const finalText = refereeDecision.finalText
    const editsApplied = refereeDecision.editsApplied || []
    const editsRejected = refereeDecision.editsRejected || []

    // Update critic feedback with accepted edits
    if (editsApplied.length > 0) {
      const critic1AcceptedEdits = editsApplied.filter(edit => 
        edit.source === 'critic1' || edit.source === 'referee_synthesis'
      )
      const critic2AcceptedEdits = editsApplied.filter(edit => 
        edit.source === 'critic2' || edit.source === 'referee_synthesis'
      )

      if (critic1AcceptedEdits.length > 0) {
        await db
          .update(criticFeedback)
          .set({ acceptedEdits: critic1AcceptedEdits })
          .where(eq(criticFeedback.id, critic1Id))
      }

      if (critic2AcceptedEdits.length > 0) {
        await db
          .update(criticFeedback)
          .set({ acceptedEdits: critic2AcceptedEdits })
          .where(eq(criticFeedback.id, critic2Id))
      }
    }

    // Calculate improvement metrics
    const improvementMetrics = {
      totalEditsConsidered: (critic1Feedback.suggestions as any[]).length + (critic2Feedback.suggestions as any[]).length,
      editsApplied: editsApplied.length,
      editsRejected: editsRejected.length,
      conflictsResolved: refereeDecision.conflictResolutions?.length || 0,
      synthesizedImprovements: refereeDecision.synthesizedImprovements?.length || 0,
      timeUsed: refereeDecision.timeUsed || processingTime,
      timeBudget: timeBudgetSeconds * 1000, // Convert to ms
      efficiency: refereeDecision.timeUsed ? (editsApplied.length / refereeDecision.timeUsed) * 100 : 0,
      qualityMetrics: refereeDecision.qualityMetrics || {}
    }

    // Save referee pass to database
    const humanizationPass = await saveHumanizationPass({
      speechId,
      passType: 'referee',
      inputText,
      outputText: finalText,
      passOrder,
      changes: {
        editsApplied,
        editsRejected,
        conflictResolutions: refereeDecision.conflictResolutions,
        synthesizedImprovements: refereeDecision.synthesizedImprovements
      },
      metrics: improvementMetrics,
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
        finalText,
        originalText: inputText,
        editsApplied,
        editsRejected,
        conflictResolutions: refereeDecision.conflictResolutions || [],
        synthesizedImprovements: refereeDecision.synthesizedImprovements || [],
        metrics: {
          ...improvementMetrics,
          processingTimeMs: totalProcessingTime
        },
        analysis: {
          prioritizationStrategy: refereeDecision.prioritizationStrategy,
          qualityMetrics: refereeDecision.qualityMetrics,
          efficientChanges: editsApplied.filter(edit => edit.rationale?.includes('high-impact')),
          criticsConsensus: editsApplied.filter(edit => edit.source === 'referee_synthesis'),
          timeManagement: {
            budgetSeconds: timeBudgetSeconds,
            usedSeconds: refereeDecision.timeUsed || Math.round(totalProcessingTime / 1000),
            efficiency: improvementMetrics.efficiency
          }
        },
        meta: {
          critic1Summary: {
            overallScore: critic1Feedback.overallScore,
            totalSuggestions: (critic1Feedback.suggestions as any[]).length,
            acceptedSuggestions: editsApplied.filter(e => e.source === 'critic1').length
          },
          critic2Summary: {
            overallScore: critic2Feedback.overallScore,
            totalSuggestions: (critic2Feedback.suggestions as any[]).length,
            acceptedSuggestions: editsApplied.filter(e => e.source === 'critic2').length
          }
        }
      })
    }

  } catch (error) {
    console.error('Error in Referee:', error)
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to referee critic feedback',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

export { handler }