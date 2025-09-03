import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import OpenAI from 'openai'
import { z } from 'zod'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { speeches, speechSections, speechVersions } from '@speechwriter/database/schema'
import jwt from 'jsonwebtoken'
import { retrieveRelevantStories } from './lib/story-retrieval'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client, { schema: { speeches, speechSections, speechVersions } })

const generateOutlineSchema = z.object({
  speechId: z.string().uuid(),
  regenerate: z.boolean().optional().default(false)
})

// JWT verification for auth (simplified - in production use proper NextAuth token validation)
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.NEXTAUTH_SECRET!)
  } catch {
    return null
  }
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST requests
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

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}')
    const { speechId, regenerate } = generateOutlineSchema.parse(body)

    // Get the speech details
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

    // If not regenerating, check if outline already exists
    if (!regenerate) {
      const existingSections = await db
        .select()
        .from(speechSections)
        .where(eq(speechSections.speechId, speechId))

      if (existingSections.length > 0 && existingSections.some(s => s.content)) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            outline: existingSections.sort((a, b) => a.orderIndex - b.orderIndex),
            message: 'Existing outline found'
          })
        }
      }
    }

    // Retrieve relevant stories for this speech
    const storyQuery = `${speech.title} ${speech.thesis} ${speech.occasion} ${speech.audience}`
    const relevantStories = await retrieveRelevantStories({
      userId,
      query: storyQuery,
      audienceType: speech.occasion.toLowerCase(),
      maxSensitivityLevel: 'medium', // Conservative for outline generation
      limit: 3
    })

    // Generate outline using OpenAI
    const outlinePrompt = `
Create a detailed speech outline for the following brief:

Title: ${speech.title}
Occasion: ${speech.occasion}
Audience: ${speech.audience}
Target Duration: ${speech.targetDurationMinutes} minutes
Thesis/Main Message: ${speech.thesis}
${speech.constraints ? `Constraints: ${speech.constraints}` : ''}

${relevantStories.length > 0 ? `
AVAILABLE STORIES (consider incorporating these into the outline):
${relevantStories.map(story => `
- "${story.title}" (${story.theme || 'general'} theme, ${story.emotion || 'neutral'} tone)
  Summary: ${story.summary || story.content.substring(0, 200) + '...'}
  Context: ${story.context || 'General use'}
`).join('')}

When creating the outline, identify where these stories could be effectively used and mark those sections with story suggestions.
` : ''}

Please create a structured outline with:
1. 3-5 main sections (including opening and closing)
2. Time allocation for each section (should sum to target duration ±5%)
3. Brief description of what each section covers
4. Specific notes about callback opportunities and quotable moments
5. Ensure the closing has a strong, memorable conclusion
${relevantStories.length > 0 ? '6. Suggest which available stories would work well in each section' : ''}

Return a JSON object with this structure:
{
  "sections": [
    {
      "title": "Section Title",
      "description": "What this section covers",
      "allocatedTimeMinutes": 3,
      "sectionType": "opening|body|callback|close",
      "keyPoints": ["Point 1", "Point 2"],
      "notes": "Special instructions for this section",
      ${relevantStories.length > 0 ? '"suggestedStories": [{"storyId": "story-id", "reason": "why this story fits"}]' : ''}
    }
  ],
  "totalDuration": 15,
  "callbackOpportunities": ["Where callbacks can be placed"],
  "quotableMoments": ["Memorable lines for the close"],
  ${relevantStories.length > 0 ? '"availableStories": ' + JSON.stringify(relevantStories.map(s => ({ id: s.id, title: s.title, theme: s.theme, emotion: s.emotion }))) : ''}
}

Make it compelling and tailored to the specific audience and occasion.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert speechwriter and public speaking coach. Create detailed, compelling speech outlines that engage audiences and deliver clear messages.'
        },
        {
          role: 'user',
          content: outlinePrompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const outlineResult = JSON.parse(completion.choices[0].message.content || '{}')

    // Clear existing sections if regenerating
    if (regenerate) {
      await db
        .delete(speechSections)
        .where(eq(speechSections.speechId, speechId))
    }

    // Insert new sections
    const sectionsToInsert = outlineResult.sections.map((section: any, index: number) => ({
      speechId: speechId,
      title: section.title,
      content: null, // Will be filled during drafting
      orderIndex: index + 1,
      allocatedTimeMinutes: section.allocatedTimeMinutes,
      sectionType: section.sectionType,
      notes: JSON.stringify({
        description: section.description,
        keyPoints: section.keyPoints || [],
        notes: section.notes || '',
        callbackOpportunities: outlineResult.callbackOpportunities || [],
        quotableMoments: outlineResult.quotableMoments || []
      })
    }))

    const insertedSections = await db
      .insert(speechSections)
      .values(sectionsToInsert)
      .returning()

    // Create a version snapshot of the outline
    await db.insert(speechVersions).values({
      speechId: speechId,
      versionNumber: 1,
      label: 'Initial Outline',
      fullText: '', // Will be populated when sections are drafted
      outline: outlineResult,
      wordCount: 0,
      estimatedDurationMinutes: outlineResult.totalDuration,
      isAutomatic: true
    })

    // Update speech status
    await db
      .update(speeches)
      .set({ 
        status: 'outline',
        updatedAt: new Date()
      })
      .where(eq(speeches.id, speechId))

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        outline: insertedSections,
        metadata: {
          totalDuration: outlineResult.totalDuration,
          callbackOpportunities: outlineResult.callbackOpportunities,
          quotableMoments: outlineResult.quotableMoments
        },
        message: 'Outline generated successfully'
      })
    }

  } catch (error) {
    console.error('Error generating outline:', error)
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate outline',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

export { handler }