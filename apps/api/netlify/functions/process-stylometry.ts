import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'
import { db } from '@speechwriter/database'
import { personas, styleCards, stylometryData } from '@speechwriter/database/schema'
import { eq, and } from 'drizzle-orm'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface StylometryFeatures {
  avgSentenceLength: number
  vocabularyComplexity: number
  posRhythm: Record<string, number>
  rhetoricalDevices: Record<string, number>
  lexicalDiversity: number
  syntacticComplexity: number
  sentimentScores: Record<string, number>
  readabilityScores: Record<string, number>
}

async function analyzeTextStyle(text: string): Promise<StylometryFeatures> {
  try {
    // Use OpenAI to analyze the text for stylometric features
    const prompt = `Analyze the following text and provide a JSON response with stylometric features:

Text: "${text}"

Please analyze and return JSON with these fields:
- avgSentenceLength: average sentence length in words
- vocabularyComplexity: score 0-1 based on word difficulty
- posRhythm: object with part-of-speech distribution percentages
- rhetoricalDevices: object with detected devices and frequencies
- lexicalDiversity: type-token ratio (0-1)
- syntacticComplexity: average parse tree depth (approximate)
- sentimentScores: object with positive, negative, neutral scores
- readabilityScores: object with fleschKincaid, gunningFog scores

Return only valid JSON, no explanation.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a linguistic analysis expert. Return only valid JSON with the requested stylometric features.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    })

    const analysisResult = response.choices[0]?.message?.content
    if (!analysisResult) {
      throw new Error('No analysis result from OpenAI')
    }

    return JSON.parse(analysisResult)
  } catch (error) {
    console.error('Error analyzing text style:', error)
    
    // Return default values if AI analysis fails
    return {
      avgSentenceLength: 15,
      vocabularyComplexity: 0.5,
      posRhythm: { noun: 25, verb: 20, adjective: 15, adverb: 10, other: 30 },
      rhetoricalDevices: { metaphor: 0.1, repetition: 0.05, alliteration: 0.02 },
      lexicalDiversity: 0.7,
      syntacticComplexity: 4.5,
      sentimentScores: { positive: 0.3, negative: 0.2, neutral: 0.5 },
      readabilityScores: { fleschKincaid: 8.5, gunningFog: 10.2 },
    }
  }
}

async function generateStyleEmbedding(features: StylometryFeatures, toneSliders: any): Promise<number[]> {
  try {
    // Create a text representation of the style for embedding
    const styleDescription = `
      Writing style with ${features.avgSentenceLength} word sentences,
      vocabulary complexity ${features.vocabularyComplexity},
      ${features.lexicalDiversity} lexical diversity,
      tone settings: formal ${toneSliders.formal}, enthusiastic ${toneSliders.enthusiastic},
      conversational ${toneSliders.conversational}, authoritative ${toneSliders.authoritative},
      humorous ${toneSliders.humorous}, empathetic ${toneSliders.empathetic}
    `

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: styleDescription.trim(),
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating style embedding:', error)
    // Return zero vector if embedding fails
    return new Array(1536).fill(0)
  }
}

async function processPersonaStyleCard(personaId: string) {
  console.log(`Processing style card for persona ${personaId}`)

  try {
    // Get persona data
    const persona = await db
      .select()
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1)

    if (persona.length === 0) {
      throw new Error(`Persona ${personaId} not found`)
    }

    const personaData = persona[0]
    
    // Get existing style card
    const styleCard = await db
      .select()
      .from(styleCards)
      .where(eq(styleCards.personaId, personaId))
      .limit(1)

    if (styleCard.length === 0) {
      throw new Error(`Style card for persona ${personaId} not found`)
    }

    // Analyze sample text if available
    let features: StylometryFeatures
    
    if (personaData.sampleText && personaData.sampleText.trim().length > 50) {
      features = await analyzeTextStyle(personaData.sampleText)
    } else {
      // Generate features based on tone sliders if no sample text
      const toneSliders = personaData.toneSliders as any || {}
      features = {
        avgSentenceLength: toneSliders.formal > 50 ? 18 : 12,
        vocabularyComplexity: toneSliders.authoritative > 50 ? 0.7 : 0.5,
        posRhythm: { noun: 25, verb: 20, adjective: 15, adverb: 10, other: 30 },
        rhetoricalDevices: { 
          metaphor: toneSliders.humorous > 50 ? 0.15 : 0.05,
          repetition: toneSliders.enthusiastic > 50 ? 0.1 : 0.03,
          alliteration: 0.02 
        },
        lexicalDiversity: toneSliders.conversational > 50 ? 0.8 : 0.6,
        syntacticComplexity: toneSliders.formal > 50 ? 6 : 4,
        sentimentScores: { 
          positive: toneSliders.enthusiastic / 100,
          negative: 0.1,
          neutral: 1 - (toneSliders.enthusiastic / 100) - 0.1
        },
        readabilityScores: { 
          fleschKincaid: toneSliders.formal > 50 ? 12 : 8,
          gunningFog: toneSliders.authoritative > 50 ? 14 : 10
        },
      }
    }

    // Generate style embedding
    const embedding = await generateStyleEmbedding(features, personaData.toneSliders)

    // Update style card
    await db
      .update(styleCards)
      .set({
        avgSentenceLength: features.avgSentenceLength,
        posRhythm: features.posRhythm,
        metaphorDomains: { preferred: ['general'] }, // Default metaphor domains
        vocabularyComplexity: features.vocabularyComplexity,
        rhetoricalDevices: features.rhetoricalDevices,
        embedding: JSON.stringify(embedding),
        isProcessed: true,
        processingError: null,
        updatedAt: new Date(),
      })
      .where(eq(styleCards.personaId, personaId))

    // Store detailed stylometry data
    await db.insert(stylometryData).values({
      personaId: personaId,
      textSample: personaData.sampleText || 'Generated from tone settings',
      features: features,
      lexicalDiversity: features.lexicalDiversity,
      syntacticComplexity: features.syntacticComplexity,
      sentimentScores: features.sentimentScores,
      readabilityScores: features.readabilityScores,
      distance: 0, // Initial distance
      analysisVersion: '1.0',
    })

    console.log(`Successfully processed style card for persona ${personaId}`)
    return { success: true }

  } catch (error) {
    console.error(`Error processing style card for persona ${personaId}:`, error)
    
    // Update style card with error
    await db
      .update(styleCards)
      .set({
        processingError: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      })
      .where(eq(styleCards.personaId, personaId))

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('Stylometry processing function called')

  try {
    // Parse the request body to get persona ID
    let personaId: string

    if (event.body) {
      const body = JSON.parse(event.body)
      personaId = body.personaId
    } else {
      // For scheduled runs, process all unprocessed style cards
      const unprocessedStyleCards = await db
        .select({ personaId: styleCards.personaId })
        .from(styleCards)
        .where(eq(styleCards.isProcessed, false))
        .limit(10) // Process in batches

      const results = await Promise.all(
        unprocessedStyleCards.map(card => processPersonaStyleCard(card.personaId))
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

    if (!personaId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'personaId is required' }),
      }
    }

    const result = await processPersonaStyleCard(personaId)

    return {
      statusCode: result.success ? 200 : 500,
      body: JSON.stringify(result),
    }

  } catch (error) {
    console.error('Error in stylometry processing function:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}