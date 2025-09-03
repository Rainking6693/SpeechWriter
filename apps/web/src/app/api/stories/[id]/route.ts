import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stories, storyEmbeddings } from '@speechwriter/database/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const updateStorySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  summary: z.string().max(500),
  theme: z.string().max(100),
  emotion: z.string().max(50),
  audienceType: z.string().max(50),
  sensitivityLevel: z.enum(['low', 'medium', 'high']),
  tags: z.string().max(200),
  context: z.string().max(500),
  isPrivate: z.boolean(),
  metadata: z.record(z.any()),
}).partial()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const story = await db
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.id, params.id),
          eq(stories.userId, session.user.id)
        )
      )
      .limit(1)

    if (story.length === 0) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    // Get embedding status if it exists
    const embedding = await db
      .select({
        id: storyEmbeddings.id,
        model: storyEmbeddings.model,
        version: storyEmbeddings.version,
        createdAt: storyEmbeddings.createdAt,
      })
      .from(storyEmbeddings)
      .where(eq(storyEmbeddings.storyId, params.id))
      .limit(1)

    return NextResponse.json({
      ...story[0],
      embedding: embedding[0] || null,
    })

  } catch (error) {
    console.error('Error fetching story:', error)
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateStorySchema.parse(body)

    // Check if story exists and belongs to user
    const existingStory = await db
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.id, params.id),
          eq(stories.userId, session.user.id)
        )
      )
      .limit(1)

    if (existingStory.length === 0) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    // Update story
    const [updatedStory] = await db
      .update(stories)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(stories.id, params.id))
      .returning()

    // If content changed, regenerate embeddings
    if (validatedData.content) {
      await db
        .update(storyEmbeddings)
        .set({
          embedding: '', // Reset embedding to trigger regeneration
          version: '1.0',
        })
        .where(eq(storyEmbeddings.storyId, params.id))
    }

    return NextResponse.json(updatedStory)

  } catch (error) {
    console.error('Error updating story:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update story' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if story exists and belongs to user
    const existingStory = await db
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.id, params.id),
          eq(stories.userId, session.user.id)
        )
      )
      .limit(1)

    if (existingStory.length === 0) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    // Delete story (cascades to embeddings)
    await db
      .delete(stories)
      .where(eq(stories.id, params.id))

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting story:', error)
    return NextResponse.json(
      { error: 'Failed to delete story' },
      { status: 500 }
    )
  }
}