import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { z } from 'zod';
import type { SpeechRequest, ApiResponse, GeneratedSpeech } from '@speechwriter/config';

// Request validation schema
const generateSpeechSchema = z.object({
  type: z.string(),
  tone: z.string(),
  topic: z.string(),
  duration: z.number().min(1).max(60),
  audience: z.object({
    size: z.number(),
    demographics: z.string(),
    relationship: z.string(),
    context: z.string(),
  }),
  keyPoints: z.array(z.string()).optional(),
  personalDetails: z.record(z.string()).optional(),
});

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          message: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse),
    };
  }

  try {
    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = generateSpeechSchema.parse(body);

    // TODO: Implement AI speech generation logic
    // This is a placeholder implementation
    const generatedSpeech: GeneratedSpeech = {
      id: `speech_${Date.now()}`,
      content: `This is a placeholder ${validatedData.tone} ${validatedData.type} speech about ${validatedData.topic}. The actual AI integration will replace this content.`,
      metadata: {
        wordCount: 150,
        estimatedDuration: validatedData.duration,
        confidence: 0.85,
        suggestions: [
          'Consider adding a personal anecdote',
          'The opening could be more engaging',
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: generatedSpeech,
        timestamp: new Date().toISOString(),
      } as ApiResponse<GeneratedSpeech>),
    };
  } catch (error) {
    console.error('Error generating speech:', error);

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        code: 'GENERATION_ERROR',
        details: error instanceof z.ZodError ? error.errors : undefined,
      },
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: error instanceof z.ZodError ? 400 : 500,
      headers,
      body: JSON.stringify(errorResponse),
    };
  }
};

export { handler };