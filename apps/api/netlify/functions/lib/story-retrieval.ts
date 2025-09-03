import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, and, sql } from 'drizzle-orm'
import postgres from 'postgres'
import { stories, storyEmbeddings } from '@speechwriter/database/schema'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client, { schema: { stories, storyEmbeddings } })

interface StoryRetrievalOptions {
  userId: string
  query: string
  theme?: string
  emotion?: string
  audienceType?: string
  maxSensitivityLevel?: 'low' | 'medium' | 'high'
  limit?: number
}

interface RetrievedStory {
  id: string
  title: string
  content: string
  summary?: string
  theme?: string
  emotion?: string
  audienceType?: string
  sensitivityLevel: string
  context?: string
  relevanceScore?: number
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating query embedding:', error)
    throw new Error('Failed to generate query embedding')
  }
}

export async function retrieveRelevantStories(options: StoryRetrievalOptions): Promise<RetrievedStory[]> {
  try {
    const {
      userId,
      query,
      theme,
      emotion,
      audienceType,
      maxSensitivityLevel = 'high',
      limit = 5
    } = options

    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query)

    // Build sensitivity level filter
    const sensitivityLevels = ['low']
    if (maxSensitivityLevel === 'medium' || maxSensitivityLevel === 'high') {
      sensitivityLevels.push('medium')
    }
    if (maxSensitivityLevel === 'high') {
      sensitivityLevels.push('high')
    }

    // Build the base query
    let storyQuery = db
      .select({
        id: stories.id,
        title: stories.title,
        content: stories.content,
        summary: stories.summary,
        theme: stories.theme,
        emotion: stories.emotion,
        audienceType: stories.audienceType,
        sensitivityLevel: stories.sensitivityLevel,
        context: stories.context,
        embedding: storyEmbeddings.embedding,
      })
      .from(stories)
      .innerJoin(storyEmbeddings, eq(stories.id, storyEmbeddings.storyId))
      .where(
        and(
          eq(stories.userId, userId),
          sql`${stories.sensitivityLevel} = ANY(${sensitivityLevels})`,
          sql`${storyEmbeddings.embedding} != ''` // Only include stories with embeddings
        )
      )

    // Add optional filters
    if (theme) {
      storyQuery = storyQuery.where(eq(stories.theme, theme))
    }
    if (emotion) {
      storyQuery = storyQuery.where(eq(stories.emotion, emotion))
    }
    if (audienceType) {
      storyQuery = storyQuery.where(eq(stories.audienceType, audienceType))
    }

    // Execute query
    const storiesWithEmbeddings = await storyQuery.limit(limit * 2) // Get more for filtering

    // Calculate similarity scores (simplified - in production use pgvector)
    const scoredStories = storiesWithEmbeddings
      .map(story => {
        try {
          const storyEmbedding = JSON.parse(story.embedding)
          const similarity = calculateCosineSimilarity(queryEmbedding, storyEmbedding)
          
          return {
            id: story.id,
            title: story.title,
            content: story.content,
            summary: story.summary,
            theme: story.theme,
            emotion: story.emotion,
            audienceType: story.audienceType,
            sensitivityLevel: story.sensitivityLevel,
            context: story.context,
            relevanceScore: similarity,
          }
        } catch (error) {
          console.error('Error parsing embedding for story:', story.id, error)
          return null
        }
      })
      .filter((story): story is RetrievedStory => story !== null)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, limit)

    return scoredStories

  } catch (error) {
    console.error('Error retrieving relevant stories:', error)
    return []
  }
}

// Simplified cosine similarity calculation
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function getStoryByCallback(userId: string, callbackId: string): Promise<RetrievedStory | null> {
  try {
    const [story] = await db
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.userId, userId),
          eq(stories.id, callbackId)
        )
      )
      .limit(1)

    if (!story) {
      return null
    }

    return {
      id: story.id,
      title: story.title,
      content: story.content,
      summary: story.summary || undefined,
      theme: story.theme || undefined,
      emotion: story.emotion || undefined,
      audienceType: story.audienceType || undefined,
      sensitivityLevel: story.sensitivityLevel,
      context: story.context || undefined,
    }
  } catch (error) {
    console.error('Error getting story by callback:', error)
    return null
  }
}

// Helper function to create callback anchors for stories in speech content
export function insertCallbackAnchor(storyId: string, storyTitle: string): string {
  return `[CALLBACK:${storyId}:${storyTitle}]`
}

// Helper function to extract callback references from content
export function extractCallbacks(content: string): Array<{ id: string; title: string; position: number }> {
  const callbackRegex = /\[CALLBACK:([^:]+):([^\]]+)\]/g
  const callbacks: Array<{ id: string; title: string; position: number }> = []
  let match

  while ((match = callbackRegex.exec(content)) !== null) {
    callbacks.push({
      id: match[1],
      title: match[2],
      position: match.index,
    })
  }

  return callbacks
}