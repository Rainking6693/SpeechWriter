import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { z } from 'zod';
import { sign, verify } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import type { ApiResponse } from '@speechwriter/config';

// Request validation schema
const createShareSchema = z.object({
  speechId: z.string().uuid(),
  role: z.enum(['viewer', 'commenter']).default('viewer'),
  expiresIn: z.enum(['1h', '24h', '7d', '30d', 'never']).default('7d'),
  maxUses: z.number().min(1).max(1000).optional(),
  description: z.string().max(200).optional(),
  requireAuth: z.boolean().default(false),
});

// Generate secure token
const generateShareToken = (): string => {
  return randomBytes(32).toString('base64url');
};

// Calculate expiry date
const calculateExpiry = (expiresIn: string): Date | null => {
  const now = new Date();
  switch (expiresIn) {
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case 'never':
      return null;
    default:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
  }
};

// Generate signed JWT for additional security
const generateShareJWT = (payload: any): string => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return sign(payload, secret, { expiresIn: '30d' });
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // TODO: Add authentication check
    // const authToken = event.headers.authorization?.replace('Bearer ', '');
    // const user = await validateToken(authToken);
    const mockUserId = 'user-123'; // Mock user ID
    
    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = createShareSchema.parse(body);

    // TODO: Verify user owns the speech
    // const speech = await getSpeech(validatedData.speechId);
    // if (speech.userId !== user.id) {
    //   throw new Error('Unauthorized');
    // }

    // Generate secure token
    const token = generateShareToken();
    const expiresAt = calculateExpiry(validatedData.expiresIn);

    // Create share link record
    const shareLink = {
      id: `share_${Date.now()}`,
      speechId: validatedData.speechId,
      createdByUserId: mockUserId,
      token,
      role: validatedData.role,
      expiresAt: expiresAt?.toISOString() || null,
      isActive: true,
      maxUses: validatedData.maxUses || null,
      currentUses: 0,
      description: validatedData.description || null,
      metadata: {
        requireAuth: validatedData.requireAuth,
        createdAt: new Date().toISOString(),
        userAgent: event.headers['user-agent'] || 'unknown'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // TODO: Save to database
    // await db.insert(shareLinks).values(shareLink);

    // Generate signed JWT for additional verification
    const signedToken = generateShareJWT({
      shareId: shareLink.id,
      speechId: validatedData.speechId,
      role: validatedData.role,
      token
    });

    // Construct share URL
    const baseUrl = process.env.SITE_URL || 'https://aispeechwriter.netlify.app';
    const shareUrl = `${baseUrl}/shared/${token}?sig=${signedToken}`;

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: {
          shareLink: {
            id: shareLink.id,
            url: shareUrl,
            token,
            role: shareLink.role,
            expiresAt: shareLink.expiresAt,
            maxUses: shareLink.maxUses,
            description: shareLink.description,
            isActive: shareLink.isActive,
            createdAt: shareLink.createdAt
          }
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error creating share link:', error);

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to create share link',
        code: 'SHARE_CREATION_ERROR',
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