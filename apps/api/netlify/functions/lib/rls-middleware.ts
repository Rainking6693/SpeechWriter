/**
 * Row-Level Security Middleware
 * 
 * Automatically sets up RLS context for API functions to ensure
 * users can only access their own data.
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import { setRLSContext, clearRLSContext, verifyRLSSetup } from '@speechwriter/database/rls-context';

// Create a connection pool for RLS-enabled queries
const rlsClient = postgres(process.env.DATABASE_URL!, { 
  prepare: false,
  max: 10, // Connection pool size
});

const rlsDb = drizzle(rlsClient);

interface AuthenticatedRequest extends HandlerEvent {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

/**
 * Extract user information from JWT token
 */
function extractUserFromToken(authHeader?: string): { id: string; email: string; role?: string } | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;
    
    if (!decoded?.sub) {
      return null;
    }

    return {
      id: decoded.sub,
      email: decoded.email || '',
      role: decoded.role || 'user',
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * RLS Middleware Factory
 * 
 * Wraps API handlers to automatically set up RLS context
 */
export function withRLS(handler: (
  event: AuthenticatedRequest, 
  context: HandlerContext,
  db: typeof rlsDb
) => Promise<any>) {
  return async (event: HandlerEvent, context: HandlerContext) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    try {
      // Extract user from authentication
      const user = extractUserFromToken(event.headers.authorization);
      
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              message: 'Authentication required',
              code: 'UNAUTHORIZED',
            },
            timestamp: new Date().toISOString(),
          }),
        };
      }

      // Set up RLS context
      await setRLSContext(rlsDb, {
        userId: user.id,
        role: user.role as 'user' | 'admin',
      });

      // Add user to event for handler access
      const authenticatedEvent: AuthenticatedRequest = {
        ...event,
        user,
      };

      // Call the wrapped handler with RLS-enabled database
      const result = await handler(authenticatedEvent, context, rlsDb);

      return {
        ...result,
        headers: {
          ...headers,
          ...result.headers,
        },
      };

    } catch (error) {
      console.error('RLS middleware error:', error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    } finally {
      // Always clean up RLS context
      try {
        await clearRLSContext(rlsDb);
      } catch (cleanupError) {
        console.error('RLS cleanup failed:', cleanupError);
      }
    }
  };
}

/**
 * Admin RLS Middleware
 * 
 * Similar to withRLS but requires admin role and provides elevated access
 */
export function withAdminRLS(handler: (
  event: AuthenticatedRequest, 
  context: HandlerContext,
  db: typeof rlsDb
) => Promise<any>) {
  return async (event: HandlerEvent, context: HandlerContext) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    try {
      const user = extractUserFromToken(event.headers.authorization);
      
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              message: 'Authentication required',
              code: 'UNAUTHORIZED',
            },
          }),
        };
      }

      // Check for admin role
      if (user.role !== 'admin' && user.email !== process.env.ADMIN_EMAIL) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              message: 'Admin access required',
              code: 'FORBIDDEN',
            },
          }),
        };
      }

      // Set admin RLS context
      await setRLSContext(rlsDb, {
        userId: user.id,
        role: 'admin',
      });

      const authenticatedEvent: AuthenticatedRequest = {
        ...event,
        user,
      };

      const result = await handler(authenticatedEvent, context, rlsDb);

      return {
        ...result,
        headers: {
          ...headers,
          ...result.headers,
        },
      };

    } catch (error) {
      console.error('Admin RLS middleware error:', error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          },
        }),
      };
    } finally {
      try {
        await clearRLSContext(rlsDb);
      } catch (cleanupError) {
        console.error('Admin RLS cleanup failed:', cleanupError);
      }
    }
  };
}

/**
 * Health check for RLS setup
 * 
 * Should be called during application startup
 */
export async function checkRLSHealth(): Promise<boolean> {
  try {
    console.log('🔒 Verifying RLS setup...');
    
    const isHealthy = await verifyRLSSetup(rlsDb);
    
    if (isHealthy) {
      console.log('✅ RLS health check passed');
    } else {
      console.error('❌ RLS health check failed');
    }
    
    return isHealthy;
  } catch (error) {
    console.error('❌ RLS health check error:', error);
    return false;
  }
}

/**
 * Utility to create a test RLS context (for testing purposes)
 */
export function createTestRLSContext(userId: string = 'test-user-id') {
  return {
    userId,
    role: 'user' as const,
    sessionId: `test-session-${Date.now()}`,
  };
}

// Export the RLS-enabled database instance
export { rlsDb };