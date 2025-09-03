import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { speeches, speechSections } from '@speechwriter/database/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const createSpeechSchema = z.object({
  title: z.string().min(1).max(200),
  occasion: z.string().min(1).max(100),
  audience: z.string().min(1).max(500),
  targetDurationMinutes: z.number().min(1).max(120),
  constraints: z.string().max(1000).optional(),
  thesis: z.string().min(1).max(500),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createSpeechSchema.parse(body)

    // Create the speech record
    const [speech] = await db.insert(speeches).values({
      userId: session.user.id,
      title: validatedData.title,
      occasion: validatedData.occasion,
      audience: validatedData.audience,
      targetDurationMinutes: validatedData.targetDurationMinutes,
      constraints: validatedData.constraints || null,
      thesis: validatedData.thesis,
      status: 'draft',
      metadata: {
        briefCreatedAt: new Date().toISOString(),
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    }).returning()

    // Create initial empty sections for the speech outline
    // This gives us a structure to work with when building the outline
    const initialSections = [
      { title: 'Opening', sectionType: 'opening', orderIndex: 1 },
      { title: 'Main Content', sectionType: 'body', orderIndex: 2 },
      { title: 'Closing', sectionType: 'close', orderIndex: 3 },
    ]

    // Calculate rough time allocation based on target duration
    const totalMinutes = validatedData.targetDurationMinutes
    const allocations = [
      Math.ceil(totalMinutes * 0.15), // Opening: ~15%
      Math.ceil(totalMinutes * 0.7),  // Body: ~70%
      Math.ceil(totalMinutes * 0.15)  // Closing: ~15%
    ]

    const sectionInserts = initialSections.map((section, index) => ({
      speechId: speech.id,
      title: section.title,
      sectionType: section.sectionType,
      orderIndex: section.orderIndex,
      allocatedTimeMinutes: allocations[index],
      content: null, // Will be filled when outline is generated
    }))

    await db.insert(speechSections).values(sectionInserts)

    return NextResponse.json({
      id: speech.id,
      title: speech.title,
      status: speech.status,
      createdAt: speech.createdAt,
      targetDurationMinutes: speech.targetDurationMinutes
    })

  } catch (error) {
    console.error('Error creating speech:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create speech' },
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

    const userSpeeches = await db
      .select()
      .from(speeches)
      .where(eq(speeches.userId, session.user.id))
      .orderBy(speeches.updatedAt)

    return NextResponse.json(userSpeeches)

  } catch (error) {
    console.error('Error fetching speeches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch speeches' },
      { status: 500 }
    )
  }
}