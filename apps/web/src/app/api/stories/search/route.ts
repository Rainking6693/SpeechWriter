import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stories, storyEmbeddings } from '@speechwriter/database/schema'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const searchSchema = z.object({
  query: z.string().min(1).max(1000),
  theme: z.string().optional(),
  emotion: z.string().optional(),
  audienceType: z.string().optional(),
  maxSensitivityLevel: z.enum(['low', 'medium', 'high']).default('high'),
  limit: z.number().min(1).max(20).default(5),
})

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    })
    
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw new Error('Failed to generate embedding')
  }
}

function vectorToString(vector: number[]): string {
  return `[${vector.join(',')}]`
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = searchSchema.parse(body)

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(validatedData.query)
    const queryEmbeddingStr = vectorToString(queryEmbedding)

    // Build sensitivity level filter
    const sensitivityLevels = ['low']
    if (validatedData.maxSensitivityLevel === 'medium' || validatedData.maxSensitivityLevel === 'high') {
      sensitivityLevels.push('medium')
    }
    if (validatedData.maxSensitivityLevel === 'high') {
      sensitivityLevels.push('high')
    }

    // Perform vector similarity search using pgvector
    // Note: In a real implementation, you'd use pgvector's <-> operator
    // For now, we'll do a simplified search and return stories with basic filtering
    
    let query = db
      .select({
        id: stories.id,
        title: stories.title,
        content: stories.content,
        summary: stories.summary,
        theme: stories.theme,
        emotion: stories.emotion,
        audienceType: stories.audienceType,
        sensitivityLevel: stories.sensitivityLevel,
        tags: stories.tags,
        context: stories.context,
        // distance: sql<number>`${storyEmbeddings.embedding} <-> ${queryEmbeddingStr}::vector`.as('distance'),
      })
      .from(stories)
      .innerJoin(storyEmbeddings, eq(stories.id, storyEmbeddings.storyId))
      .where(
        and(
          eq(stories.userId, session.user.id),
          sql`${stories.sensitivityLevel} = ANY(${sensitivityLevels})`
        )
      )
      .limit(validatedData.limit)

    // Add optional filters
    if (validatedData.theme) {
      query = query.where(eq(stories.theme, validatedData.theme))
    }
    if (validatedData.emotion) {
      query = query.where(eq(stories.emotion, validatedData.emotion))
    }
    if (validatedData.audienceType) {
      query = query.where(eq(stories.audienceType, validatedData.audienceType))
    }

    // For now, order by updated time until we have proper vector search
    const relevantStories = await query.orderBy(stories.updatedAt)

    // TODO: Implement proper pgvector similarity search
    // This would require:
    // 1. Converting embedding column to vector type
    // 2. Using <-> or <=> operators for similarity
    // 3. Creating proper vector indices

    return NextResponse.json({
      query: validatedData.query,
      stories: relevantStories,
      totalFound: relevantStories.length,
    })

  } catch (error) {
    console.error('Error searching stories:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to search stories' },
      { status: 500 }
    )
  }
}