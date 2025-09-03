import { personas, styleCards } from '@speechwriter/database/schema';
import { eq, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const toneSliderSchema = z.object({
  formal: z.number().min(0).max(100),
  enthusiastic: z.number().min(0).max(100),
  conversational: z.number().min(0).max(100),
  authoritative: z.number().min(0).max(100),
  humorous: z.number().min(0).max(100),
  empathetic: z.number().min(0).max(100),
});

const createPersonaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  toneSliders: toneSliderSchema,
  doList: z.string().max(1000).optional(),
  dontList: z.string().max(1000).optional(),
  sampleText: z.string().max(5000).optional(),
  isDefault: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
});

// Removed unused updatePersonaSchema to fix ESLint error
// const updatePersonaSchema = createPersonaSchema.partial()

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createPersonaSchema.parse(body);

    // If this is set as default, remove default from other personas
    if (validatedData.isDefault) {
      await db
        .update(personas)
        .set({ isDefault: false })
        .where(eq(personas.userId, session.user.id));
    }

    // Create the persona record
    const [persona] = await db
      .insert(personas)
      .values({
        userId: session.user.id,
        name: validatedData.name,
        description: validatedData.description || null,
        toneSliders: validatedData.toneSliders,
        doList: validatedData.doList || null,
        dontList: validatedData.dontList || null,
        sampleText: validatedData.sampleText || null,
        isDefault: validatedData.isDefault,
        isPreset: false,
        metadata: validatedData.metadata || {},
      })
      .returning();

    // Create empty style card for background processing
    await db.insert(styleCards).values({
      personaId: persona.id,
      isProcessed: false,
    });

    return NextResponse.json({
      id: persona.id,
      name: persona.name,
      description: persona.description,
      toneSliders: persona.toneSliders,
      isDefault: persona.isDefault,
      createdAt: persona.createdAt,
    });
  } catch (error) {
    // Error creating persona - handled below

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create persona' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const includePresets = url.searchParams.get('includePresets') === 'true';

    let query = db
      .select()
      .from(personas)
      .where(eq(personas.userId, session.user.id));

    // Include system presets if requested
    if (includePresets) {
      query = db
        .select()
        .from(personas)
        .where(
          or(eq(personas.userId, session.user.id), eq(personas.isPreset, true))
        );
    }

    const userPersonas = await query.orderBy(personas.updatedAt);

    return NextResponse.json(userPersonas);
  } catch (error) {
    // Error fetching personas - handled below
    return NextResponse.json(
      { error: 'Failed to fetch personas' },
      { status: 500 }
    );
  }
}
