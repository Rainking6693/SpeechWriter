import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stories, storyEmbeddings } from '@speechwriter/database/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const createStorySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  summary: z.string().max(500).optional(),
  theme: z.string().max(100).optional(),
  emotion: z.string().max(50).optional(),
  audienceType: z.string().max(50).optional(),
  sensitivityLevel: z.enum(['low', 'medium', 'high']).default('low'),
  tags: z.string().max(200).optional(), // Comma-separated tags
  context: z.string().max(500).optional(),
  isPrivate: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
})

const updateStorySchema = createStorySchema.partial()

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createStorySchema.parse(body)

    // Create the story record
    const [story] = await db.insert(stories).values({
      userId: session.user.id,
      title: validatedData.title,
      content: validatedData.content,
      summary: validatedData.summary || null,
      theme: validatedData.theme || null,
      emotion: validatedData.emotion || null,
      audienceType: validatedData.audienceType || null,
      sensitivityLevel: validatedData.sensitivityLevel,
      tags: validatedData.tags || null,
      context: validatedData.context || null,
      isPrivate: validatedData.isPrivate,
      metadata: validatedData.metadata || {},
    }).returning()

    // Create empty embedding record for background processing
    // This will be populated by a background job
    await db.insert(storyEmbeddings).values({
      storyId: story.id,
      embedding: '', // Will be populated by background job
      model: 'text-embedding-ada-002',
      version: '1.0',
    })

    return NextResponse.json({
      id: story.id,
      title: story.title,
      summary: story.summary,
      theme: story.theme,
      emotion: story.emotion,
      audienceType: story.audienceType,
      sensitivityLevel: story.sensitivityLevel,
      tags: story.tags,
      isPrivate: story.isPrivate,
      createdAt: story.createdAt,
    })

  } catch (error) {
    console.error('Error creating story:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const theme = url.searchParams.get('theme')
    const emotion = url.searchParams.get('emotion')
    const audienceType = url.searchParams.get('audienceType')
    const sensitivityLevel = url.searchParams.get('sensitivityLevel')
    const tags = url.searchParams.get('tags')

    // Build query conditions
    let query = db
      .select({
        id: stories.id,
        title: stories.title,
        summary: stories.summary,
        theme: stories.theme,
        emotion: stories.emotion,
        audienceType: stories.audienceType,
        sensitivityLevel: stories.sensitivityLevel,
        tags: stories.tags,
        context: stories.context,
        isPrivate: stories.isPrivate,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
      })
      .from(stories)
      .where(eq(stories.userId, session.user.id))

    // TODO: Add filtering logic for theme, emotion, etc.
    // This would require building dynamic where conditions

    const userStories = await query.orderBy(stories.updatedAt)

    return NextResponse.json(userStories)

  } catch (error) {
    console.error('Error fetching stories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    )
  }
}