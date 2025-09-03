import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { db } from '@speechwriter/database'
import { stories, storyEmbeddings } from '@speechwriter/database/schema'
import { eq, and } from 'drizzle-orm'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function generateStoryEmbedding(content: string, metadata: any): Promise<number[]> {
  try {
    // Combine story content with metadata for richer embeddings
    const embeddingText = `
      ${content}
      
      Theme: ${metadata.theme || 'general'}
      Emotion: ${metadata.emotion || 'neutral'}
      Audience: ${metadata.audienceType || 'general'}
      Context: ${metadata.context || ''}
    `.trim()

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: embeddingText,
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating story embedding:', error)
    throw new Error('Failed to generate story embedding')
  }
}

async function generateStorySummary(content: string): Promise<string> {
  try {
    if (content.length < 100) {
      return content // Return original if too short to summarize
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a story summarization expert. Create concise, compelling summaries that capture the key elements and emotional core of stories.',
        },
        {
          role: 'user',
          content: `Summarize this story in 1-2 sentences, focusing on the key narrative elements and emotional impact:\n\n${content}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    })

    return response.choices[0]?.message?.content || 'Story summary unavailable'
  } catch (error) {
    console.error('Error generating story summary:', error)
    return 'Story summary generation failed'
  }
}

async function processStoryEmbedding(storyId: string) {
  console.log(`Processing embedding for story ${storyId}`)

  try {
    // Get story data
    const story = await db
      .select()
      .from(stories)
      .where(eq(stories.id, storyId))
      .limit(1)

    if (story.length === 0) {
      throw new Error(`Story ${storyId} not found`)
    }

    const storyData = story[0]
    
    // Get existing embedding record
    const embeddingRecord = await db
      .select()
      .from(storyEmbeddings)
      .where(eq(storyEmbeddings.storyId, storyId))
      .limit(1)

    if (embeddingRecord.length === 0) {
      throw new Error(`Embedding record for story ${storyId} not found`)
    }

    // Generate embedding
    const embedding = await generateStoryEmbedding(storyData.content, {
      theme: storyData.theme,
      emotion: storyData.emotion,
      audienceType: storyData.audienceType,
      context: storyData.context,
    })

    // Update embedding record
    await db
      .update(storyEmbeddings)
      .set({
        embedding: JSON.stringify(embedding),
        model: 'text-embedding-ada-002',
        version: '1.0',
      })
      .where(eq(storyEmbeddings.storyId, storyId))

    // Generate summary if not exists
    if (!storyData.summary && storyData.content.length > 100) {
      const summary = await generateStorySummary(storyData.content)
      
      await db
        .update(stories)
        .set({
          summary: summary,
          updatedAt: new Date(),
        })
        .where(eq(stories.id, storyId))
    }

    console.log(`Successfully processed embedding for story ${storyId}`)
    return { success: true }

  } catch (error) {
    console.error(`Error processing embedding for story ${storyId}:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('Story embedding processing function called')

  try {
    // Parse the request body to get story ID
    let storyId: string

    if (event.body) {
      const body = JSON.parse(event.body)
      storyId = body.storyId
    } else {
      // For scheduled runs, process all stories with empty embeddings
      const unprocessedEmbeddings = await db
        .select({ 
          storyId: storyEmbeddings.storyId,
          embedding: storyEmbeddings.embedding 
        })
        .from(storyEmbeddings)
        .where(eq(storyEmbeddings.embedding, ''))
        .limit(10) // Process in batches

      const results = await Promise.all(
        unprocessedEmbeddings.map(record => processStoryEmbedding(record.storyId))
      )

      return {
        statusCode: 200,
        body: JSON.stringify({
          processed: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results,
        }),
      }
    }

    if (!storyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'storyId is required' }),
      }
    }

    const result = await processStoryEmbedding(storyId)

    return {
      statusCode: result.success ? 200 : 500,
      body: JSON.stringify(result),
    }

  } catch (error) {
    console.error('Error in story embedding processing function:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}