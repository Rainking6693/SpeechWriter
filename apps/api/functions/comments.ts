import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import type { ApiResponse } from '@speechwriter/config';
import { z } from 'zod';

// Request validation schemas
const createCommentSchema = z.object({
  speechId: z.string().uuid(),
  sectionId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  content: z.string().min(1).max(2000),
  selectionStart: z.number().min(0).optional(),
  selectionEnd: z.number().min(0).optional(),
  selectionText: z.string().max(500).optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

const resolveCommentSchema = z.object({
  isResolved: z.boolean(),
});

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
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
    // TODO: Add authentication/share link validation
    // const authToken = event.headers.authorization?.replace('Bearer ', '');
    // const user = await validateTokenOrShareAccess(authToken);
    const mockUserId = 'user-456'; // Mock commenter user ID

    const path = event.path;
    const method = event.httpMethod;
    const commentId = path.includes('/comments/') ? path.split('/comments/')[1] : null;

    switch (method) {
      case 'GET':
        return await handleGetComments(event, headers);
      
      case 'POST':
        return await handleCreateComment(event, headers, mockUserId);
      
      case 'PUT':
        if (commentId) {
          if (event.body?.includes('isResolved')) {
            return await handleResolveComment(event, headers, commentId, mockUserId);
          } else {
            return await handleUpdateComment(event, headers, commentId, mockUserId);
          }
        }
        break;
      
      case 'DELETE':
        if (commentId) {
          return await handleDeleteComment(event, headers, commentId, mockUserId);
        }
        break;
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          message: 'Endpoint not found',
          code: 'NOT_FOUND',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error in comments handler:', error);
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
      } as ApiResponse),
    };
  }
};

// Get comments for a speech
async function handleGetComments(event: HandlerEvent, headers: any) {
  const queryParams = event.queryStringParameters || {};
  const speechId = queryParams['speechId'];

  if (!speechId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          message: 'Speech ID is required',
          code: 'MISSING_SPEECH_ID',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse),
    };
  }

  // TODO: Fetch comments from database
  // const comments = await getCommentsBySpeechId(speechId);

  // Mock comments data
  const mockComments = [
    {
      id: 'comment-1',
      speechId,
      sectionId: 'section-1',
      authorId: 'user-456',
      authorName: 'Jane Reviewer',
      authorEmail: 'jane@example.com',
      parentId: null,
      content: 'This opening is really strong! Love the energy.',
      selectionStart: 0,
      selectionEnd: 50,
      selectionText: '[PAUSE] Good morning, innovators and builders!',
      isResolved: false,
      resolvedByUserId: null,
      resolvedAt: null,
      metadata: {},
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      replies: [
        {
          id: 'comment-2',
          speechId,
          sectionId: 'section-1',
          authorId: 'user-123',
          authorName: 'Speech Author',
          authorEmail: 'author@example.com',
          parentId: 'comment-1',
          content: 'Thanks! I was trying to grab attention right away.',
          selectionStart: null,
          selectionEnd: null,
          selectionText: null,
          isResolved: false,
          resolvedByUserId: null,
          resolvedAt: null,
          metadata: {},
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          replies: []
        }
      ]
    },
    {
      id: 'comment-3',
      speechId,
      sectionId: 'section-2',
      authorId: 'user-456',
      authorName: 'Jane Reviewer',
      authorEmail: 'jane@example.com',
      parentId: null,
      content: 'Could we add a specific example here? Maybe mention a particular AI tool or breakthrough?',
      selectionStart: 100,
      selectionEnd: 200,
      selectionText: 'The digital transformation isn\'t coming – it\'s here.',
      isResolved: false,
      resolvedByUserId: null,
      resolvedAt: null,
      metadata: {},
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      replies: []
    }
  ];

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        comments: mockComments,
        total: mockComments.length,
        speechId
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse),
  };
}

// Create a new comment
async function handleCreateComment(event: HandlerEvent, headers: any, userId: string) {
  const body = JSON.parse(event.body || '{}');
  const validatedData = createCommentSchema.parse(body);

  // TODO: Validate user has comment permission on this speech
  // TODO: Validate section exists if sectionId provided
  // TODO: Validate parent comment exists if parentId provided

  const newComment = {
    id: `comment_${Date.now()}`,
    speechId: validatedData.speechId,
    sectionId: validatedData.sectionId || null,
    authorId: userId,
    authorName: 'Current User', // TODO: Get from user data
    authorEmail: 'user@example.com', // TODO: Get from user data
    parentId: validatedData.parentId || null,
    content: validatedData.content,
    selectionStart: validatedData.selectionStart || null,
    selectionEnd: validatedData.selectionEnd || null,
    selectionText: validatedData.selectionText || null,
    isResolved: false,
    resolvedByUserId: null,
    resolvedAt: null,
    metadata: {
      userAgent: event.headers['user-agent'] || 'unknown',
      ip: event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: []
  };

  // TODO: Save to database
  // await db.insert(comments).values(newComment);

  // TODO: Send notification to speech author
  // await notifyCommentCreated(newComment);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      success: true,
      data: newComment,
      timestamp: new Date().toISOString(),
    } as ApiResponse),
  };
}

// Update a comment
async function handleUpdateComment(event: HandlerEvent, headers: any, commentId: string, userId: string) {
  const body = JSON.parse(event.body || '{}');
  const validatedData = updateCommentSchema.parse(body);

  // TODO: Validate user owns this comment
  // const comment = await getCommentById(commentId);
  // if (comment.authorId !== userId) {
  //   return unauthorized response
  // }

  const updatedComment = {
    id: commentId,
    content: validatedData.content,
    updatedAt: new Date().toISOString(),
    // ... other fields would come from database
  };

  // TODO: Update in database
  // await db.update(comments).set({ content: validatedData.content, updatedAt: new Date() }).where(eq(comments.id, commentId));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: updatedComment,
      timestamp: new Date().toISOString(),
    } as ApiResponse),
  };
}

// Resolve/unresolve a comment
async function handleResolveComment(event: HandlerEvent, headers: any, commentId: string, userId: string) {
  const body = JSON.parse(event.body || '{}');
  const validatedData = resolveCommentSchema.parse(body);

  // TODO: Validate user has permission to resolve (usually speech author or commenter)
  
  const resolvedComment = {
    id: commentId,
    isResolved: validatedData.isResolved,
    resolvedByUserId: validatedData.isResolved ? userId : null,
    resolvedAt: validatedData.isResolved ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
    // ... other fields would come from database
  };

  // TODO: Update in database
  // await db.update(comments).set(resolvedComment).where(eq(comments.id, commentId));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: resolvedComment,
      timestamp: new Date().toISOString(),
    } as ApiResponse),
  };
}

// Delete a comment
async function handleDeleteComment(event: HandlerEvent, headers: any, commentId: string, userId: string) {
  // TODO: Validate user owns this comment or is speech author
  // TODO: Consider soft delete vs hard delete
  // TODO: Handle cascade delete for replies

  // TODO: Delete from database
  // await db.delete(comments).where(eq(comments.id, commentId));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        id: commentId,
        deleted: true
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse),
  };
}

export { handler };