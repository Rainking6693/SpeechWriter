import { Handler, HandlerEvent } from '@netlify/functions'
import OpenAI from 'openai'
import { z } from 'zod'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, and } from 'drizzle-orm'
import postgres from 'postgres'
import { speeches, speechSections, personas, styleCards, modelRuns } from '@speechwriter/database/schema'
import jwt from 'jsonwebtoken'
import { retrieveRelevantStories, insertCallbackAnchor, getStoryByCallback } from './lib/story-retrieval'
import { trackOpenAICall, estimateTokenCount, trackSpeechEvent } from './lib/analytics-utils'
import { ANALYTICS_EVENTS } from '@speechwriter/analytics'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client, { schema: { speeches, speechSections, personas, styleCards, modelRuns } })

const generateDraftSchema = z.object({
  speechId: z.string().uuid(),
  sectionId: z.string().uuid(),
  regenerate: z.boolean().optional().default(false)
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
    const { speechId, sectionId, regenerate } = generateDraftSchema.parse(body)

    // Get speech and section details
    const [speech] = await db
      .select()
      .from(speeches)
      .where(eq(speeches.id, speechId))
      .limit(1)

    if (!speech || speech.userId !== userId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Speech not found' })
      }
    }

    const [section] = await db
      .select()
      .from(speechSections)
      .where(eq(speechSections.id, sectionId))
      .limit(1)

    if (!section || section.speechId !== speechId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Section not found' })
      }
    }

    // Get all sections for context
    const allSections = await db
      .select()
      .from(speechSections)
      .where(eq(speechSections.speechId, speechId))

    const sectionNotes = section.notes ? JSON.parse(section.notes) : null

    // Get user's default persona and style preferences
    const [userPersona] = await db
      .select({
        persona: personas,
        styleCard: styleCards
      })
      .from(personas)
      .leftJoin(styleCards, eq(personas.id, styleCards.personaId))
      .where(
        and(
          eq(personas.userId, userId),
          eq(personas.isDefault, true)
        )
      )
      .limit(1)

    // Get relevant stories for this section
    const sectionQuery = `${section.title} ${sectionNotes?.description || ''} ${speech.thesis}`
    const relevantStories = await retrieveRelevantStories({
      userId,
      query: sectionQuery,
      audienceType: speech.occasion.toLowerCase(),
      maxSensitivityLevel: 'medium',
      limit: 2 // Fewer stories for individual sections
    })

    // Check if section notes suggest specific stories
    const suggestedStoryIds = sectionNotes?.suggestedStories?.map((s: any) => s.storyId) || []
    const suggestedStories = await Promise.all(
      suggestedStoryIds.map((id: string) => getStoryByCallback(userId, id))
    )
    const validSuggestedStories = suggestedStories.filter(Boolean)

    // Combine relevant and suggested stories, remove duplicates
    const allStories = [...validSuggestedStories, ...relevantStories.filter(
      story => !suggestedStoryIds.includes(story.id)
    )].slice(0, 3) // Limit to 3 stories max

    // Build context-aware prompt
    const sectionContext = allSections
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(s => `${s.orderIndex}. ${s.title} (${s.allocatedTimeMinutes} min)`)
      .join('\n')

    const draftPrompt = `
Generate content for section "${section.title}" of this speech:

SPEECH CONTEXT:
Title: ${speech.title}
Occasion: ${speech.occasion}
Audience: ${speech.audience}
Total Duration: ${speech.targetDurationMinutes} minutes
Main Message: ${speech.thesis}

FULL OUTLINE:
${sectionContext}

CURRENT SECTION:
Title: ${section.title}
Type: ${section.sectionType}
Allocated Time: ${section.allocatedTimeMinutes} minutes
Target Word Count: ~${section.allocatedTimeMinutes * 180} words (assuming 180 WPM speaking rate)

${sectionNotes?.description ? `Description: ${sectionNotes.description}` : ''}
${sectionNotes?.keyPoints ? `Key Points to Cover:\n${sectionNotes.keyPoints.map((p: string) => `- ${p}`).join('\n')}` : ''}

${userPersona ? `
PERSONA & STYLE PREFERENCES:
Name: ${userPersona.persona.name}
${userPersona.persona.description ? `Description: ${userPersona.persona.description}` : ''}
Tone Settings:
${Object.entries(userPersona.persona.toneSliders as any || {}).map(([key, value]) => `- ${key}: ${value}%`).join('\n')}
${userPersona.persona.doList ? `\nDO: ${userPersona.persona.doList}` : ''}
${userPersona.persona.dontList ? `\nDON'T: ${userPersona.persona.dontList}` : ''}
${userPersona.styleCard?.avgSentenceLength ? `\nPreferred sentence length: ~${userPersona.styleCard.avgSentenceLength} words` : ''}
` : ''}

${allStories.length > 0 ? `
AVAILABLE STORIES (incorporate if relevant):
${allStories.map(story => `
Story: "${story.title}"
Content: ${story.content}
Context: ${story.context || 'General use'}
Theme: ${story.theme || 'general'} | Emotion: ${story.emotion || 'neutral'}

To reference this story in the speech, use: ${insertCallbackAnchor(story.id, story.title)}
`).join('')}

Use callback anchors [CALLBACK:story-id:story-title] to reference stories. The actual story content will be inserted at speech delivery time.
` : ''}

REQUIREMENTS:
1. Write compelling, audience-appropriate content for this section
2. Target approximately ${section.allocatedTimeMinutes * 180} words for proper timing
3. Include natural pause points marked with [PAUSE]
4. Mark emphasis points with [EMPHASIZE] tags
5. Make it flow naturally with the overall speech structure
6. Keep the tone consistent with the occasion and audience
${userPersona ? '7. Follow the persona preferences and tone settings above' : ''}
${allStories.length > 0 ? '8. Consider incorporating relevant stories using callback anchors' : ''}
${section.sectionType === 'close' ? '9. Include a memorable, quotable conclusion' : ''}
${section.sectionType === 'opening' ? '9. Create a strong hook to engage the audience' : ''}

Generate only the content for this section, nothing else.`

    // Track analytics for draft generation
    await trackSpeechEvent(userId, speechId, ANALYTICS_EVENTS.DRAFT_GENERATED, {
      section_id: sectionId,
      section_type: section.sectionType,
      allocated_time_minutes: section.allocatedTimeMinutes,
    });

    // Estimate input tokens for analytics
    const systemPrompt = 'You are an expert speechwriter. Create compelling, well-timed speech content that engages audiences. Include [PAUSE] and [EMPHASIZE] tags for delivery guidance. Write in a natural, conversational style appropriate for public speaking.';
    const estimatedInputTokens = estimateTokenCount(systemPrompt + draftPrompt);

    // Set up streaming response with analytics tracking
    const { result: stream, modelRunId } = await trackOpenAICall(
      () => openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: draftPrompt
          }
        ],
        temperature: 0.7,
        stream: true,
        max_tokens: section.allocatedTimeMinutes * 200, // Allow for slightly more content
      }),
      {
        userId,
        speechId,
        stage: 'draft',
        model: 'gpt-4',
        promptTemplate: 'section-draft-v1',
        estimatedInputTokens,
      }
    )

    // Return streaming response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let fullContent = ''
        
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullContent += content
              controller.enqueue(encoder.encode(content))
            }
          }
          
          // Calculate output tokens for analytics
          const outputTokens = estimateTokenCount(fullContent);
          const wordCount = fullContent.split(/\s+/).length;

          // Update model run with actual token usage
          try {
            await db
              .update(modelRuns)
              .set({
                outputTokens,
                totalTokens: estimatedInputTokens + outputTokens,
                metadata: {
                  word_count: wordCount,
                  estimated_speaking_time: Math.round(wordCount / 180),
                  section_type: section.sectionType,
                  completed_at: new Date().toISOString(),
                }
              })
              .where(eq(modelRuns.id, modelRunId));
          } catch (error) {
            console.error('Failed to update model run analytics:', error);
          }

          // Save the completed content to database
          await db
            .update(speechSections)
            .set({ 
              content: fullContent,
              actualTimeMinutes: Math.round(wordCount / 180),
              updatedAt: new Date()
            })
            .where(eq(speechSections.id, sectionId))

          // Update speech status if all sections are complete
          const updatedSections = await db
            .select()
            .from(speechSections)
            .where(eq(speechSections.speechId, speechId))

          const allComplete = updatedSections.every(s => s.content)
          if (allComplete) {
            await db
              .update(speeches)
              .set({ 
                status: 'complete',
                updatedAt: new Date()
              })
              .where(eq(speeches.id, speechId))
          }

          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }
    })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: readable,
    }

  } catch (error) {
    console.error('Error generating draft:', error)
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate draft',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

export { handler }