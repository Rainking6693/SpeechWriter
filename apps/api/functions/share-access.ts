import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { z } from 'zod';
import { verify } from 'jsonwebtoken';
import type { ApiResponse } from '@speechwriter/config';

// Request validation schema
const accessShareSchema = z.object({
  token: z.string(),
  signature: z.string().optional(),
});

// Verify JWT signature
const verifyShareJWT = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  try {
    return verify(token, secret);
  } catch (error) {
    throw new Error('Invalid signature');
  }
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
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
    const queryParams = event.queryStringParameters || {};
    const validatedData = accessShareSchema.parse({
      token: queryParams.token,
      signature: queryParams.sig,
    });

    // TODO: Fetch share link from database
    // const shareLink = await getShareLinkByToken(validatedData.token);
    
    // Mock share link data
    const mockShareLink = {
      id: 'share_123',
      speechId: 'speech-456',
      createdByUserId: 'user-123',
      token: validatedData.token,
      role: 'viewer',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      isActive: true,
      maxUses: 10,
      currentUses: 3,
      description: 'Shared for feedback',
      metadata: { requireAuth: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Verify share link exists and is valid
    if (!mockShareLink) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Share link not found',
            code: 'SHARE_NOT_FOUND',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse),
      };
    }

    // Check if share link is active
    if (!mockShareLink.isActive) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Share link has been deactivated',
            code: 'SHARE_DEACTIVATED',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse),
      };
    }

    // Check expiry
    if (mockShareLink.expiresAt && new Date(mockShareLink.expiresAt) < new Date()) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Share link has expired',
            code: 'SHARE_EXPIRED',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse),
      };
    }

    // Check usage limits
    if (mockShareLink.maxUses && mockShareLink.currentUses >= mockShareLink.maxUses) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Share link usage limit exceeded',
            code: 'SHARE_LIMIT_EXCEEDED',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse),
      };
    }

    // Verify signature if provided
    if (validatedData.signature) {
      try {
        const payload = verifyShareJWT(validatedData.signature);
        if (payload.token !== validatedData.token || payload.speechId !== mockShareLink.speechId) {
          throw new Error('Token mismatch');
        }
      } catch (error) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              message: 'Invalid share signature',
              code: 'INVALID_SIGNATURE',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse),
        };
      }
    }

    // TODO: Fetch speech data
    // const speech = await getSpeechWithSections(mockShareLink.speechId);
    
    // Mock speech data
    const mockSpeech = {
      id: mockShareLink.speechId,
      title: "Sample Keynote Speech",
      occasion: "Tech Conference 2025", 
      audience: "Software developers and tech leaders",
      targetDurationMinutes: 15,
      status: "published",
      sections: [
        {
          id: "1",
          title: "Opening Hook",
          content: "[PAUSE] Good morning, innovators and builders! [EMPHASIZE] Today, we're not just talking about the future of technology – we're living it.",
          allocatedTimeMinutes: 2,
          actualTimeMinutes: 2,
          orderIndex: 1
        },
        {
          id: "2",
          title: "Main Content",
          content: "The digital transformation isn't coming – it's here. [CALLBACK] Remember when we thought AI was science fiction? [PAUSE] Well, it's now writing our code, designing our interfaces, and revolutionizing how we solve problems.",
          allocatedTimeMinutes: 11,
          actualTimeMinutes: 10,
          orderIndex: 2
        },
        {
          id: "3",
          title: "Call to Action",
          content: "[EMPHASIZE] The question isn't whether you'll adapt to this new reality – it's how quickly you'll embrace it. [PAUSE] The future belongs to those who build it. Let's build it together.",
          allocatedTimeMinutes: 2,
          actualTimeMinutes: 3,
          orderIndex: 3
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // TODO: Increment usage counter
    // await incrementShareUsage(mockShareLink.id);

    // TODO: Log access for analytics
    // await logShareAccess(mockShareLink.id, {
    //   userAgent: event.headers['user-agent'],
    //   ip: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
    //   timestamp: new Date().toISOString()
    // });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: {
          speech: mockSpeech,
          shareInfo: {
            role: mockShareLink.role,
            canComment: mockShareLink.role === 'commenter',
            canEdit: false, // Share links don't allow editing
            description: mockShareLink.description,
            expiresAt: mockShareLink.expiresAt,
            remainingUses: mockShareLink.maxUses ? mockShareLink.maxUses - mockShareLink.currentUses : null
          }
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error accessing shared speech:', error);

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to access shared speech',
        code: 'SHARE_ACCESS_ERROR',
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