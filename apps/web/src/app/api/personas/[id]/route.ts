import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { personas, styleCards, stylometryData } from '@speechwriter/database/src/schema/personas'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const toneSliderSchema = z.object({
  formal: z.number().min(0).max(100),
  enthusiastic: z.number().min(0).max(100),
  conversational: z.number().min(0).max(100),
  authoritative: z.number().min(0).max(100),
  humorous: z.number().min(0).max(100),
  empathetic: z.number().min(0).max(100),
})

const updatePersonaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  toneSliders: toneSliderSchema,
  doList: z.string().max(1000),
  dontList: z.string().max(1000),
  sampleText: z.string().max(5000),
  isDefault: z.boolean(),
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

    const persona = await db
      .select()
      .from(personas)
      .where(
        and(
          eq(personas.id, params.id),
          eq(personas.userId, session.user.id).or(eq(personas.isPreset, true))
        )
      )
      .limit(1)

    if (persona.length === 0) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    // Get style card if it exists
    const styleCard = await db
      .select()
      .from(styleCards)
      .where(eq(styleCards.personaId, params.id))
      .limit(1)

    return NextResponse.json({
      ...persona[0],
      styleCard: styleCard[0] || null,
    })

  } catch (error) {
    console.error('Error fetching persona:', error)
    return NextResponse.json(
      { error: 'Failed to fetch persona' },
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
    const validatedData = updatePersonaSchema.parse(body)

    // Check if persona exists and belongs to user
    const existingPersona = await db
      .select()
      .from(personas)
      .where(
        and(
          eq(personas.id, params.id),
          eq(personas.userId, session.user.id)
        )
      )
      .limit(1)

    if (existingPersona.length === 0) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    // If setting as default, remove default from other personas
    if (validatedData.isDefault) {
      await db
        .update(personas)
        .set({ isDefault: false })
        .where(
          and(
            eq(personas.userId, session.user.id),
            eq(personas.id, params.id).not()
          )
        )
    }

    // Update persona
    const [updatedPersona] = await db
      .update(personas)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(personas.id, params.id))
      .returning()

    // If sample text or tone sliders changed, mark style card for reprocessing
    if (validatedData.sampleText || validatedData.toneSliders) {
      await db
        .update(styleCards)
        .set({
          isProcessed: false,
          processingError: null,
          updatedAt: new Date(),
        })
        .where(eq(styleCards.personaId, params.id))
    }

    return NextResponse.json(updatedPersona)

  } catch (error) {
    console.error('Error updating persona:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update persona' },
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

    // Check if persona exists and belongs to user
    const existingPersona = await db
      .select()
      .from(personas)
      .where(
        and(
          eq(personas.id, params.id),
          eq(personas.userId, session.user.id)
        )
      )
      .limit(1)

    if (existingPersona.length === 0) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    // Delete persona (cascades to style cards and stylometry data)
    await db
      .delete(personas)
      .where(eq(personas.id, params.id))

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting persona:', error)
    return NextResponse.json(
      { error: 'Failed to delete persona' },
      { status: 500 }
    )
  }
}