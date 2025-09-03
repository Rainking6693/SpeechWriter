import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { z } from 'zod';
import type { ApiResponse } from '@speechwriter/config';

// Request validation schemas
const createSuggestedEditSchema = z.object({
  speechId: z.string().uuid(),
  sectionId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  originalText: z.string().min(1),
  suggestedText: z.string().min(1),
  selectionStart: z.number().min(0),
  selectionEnd: z.number().min(0),
});

const reviewSuggestedEditSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  reviewComment: z.string().max(500).optional(),
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
    const editId = path.includes('/suggested-edits/') ? path.split('/suggested-edits/')[1]?.split('/')[0] : null;
    const action = path.includes('/review') ? 'review' : path.includes('/apply') ? 'apply' : null;

    switch (method) {
      case 'GET':
        return await handleGetSuggestedEdits(event, headers);
      
      case 'POST':
        if (action === 'apply' && editId) {
          return await handleApplySuggestedEdit(event, headers, editId, mockUserId);
        } else {
          return await handleCreateSuggestedEdit(event, headers, mockUserId);
        }
      
      case 'PUT':
        if (action === 'review' && editId) {
          return await handleReviewSuggestedEdit(event, headers, editId, mockUserId);
        }
        break;
      
      case 'DELETE':
        if (editId) {
          return await handleDeleteSuggestedEdit(event, headers, editId, mockUserId);
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
    console.error('Error in suggested edits handler:', error);
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

// Get suggested edits for a speech
async function handleGetSuggestedEdits(event: HandlerEvent, headers: any) {
  const queryParams = event.queryStringParameters || {};
  const speechId = queryParams.speechId;
  const status = queryParams.status; // pending, accepted, rejected

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

  // TODO: Fetch suggested edits from database
  // const suggestedEdits = await getSuggestedEditsBySpeechId(speechId, status);

  // Mock suggested edits data
  const mockSuggestedEdits = [
    {
      id: 'edit-1',
      speechId,
      sectionId: 'section-1',
      authorId: 'user-456',
      authorName: 'Jane Reviewer',
      authorEmail: 'jane@example.com',
      title: 'Stronger opening statement',
      description: 'This opening could be more impactful with a question',
      originalText: '[PAUSE] Good morning, innovators and builders!',
      suggestedText: '[PAUSE] What if I told you that the future you\'ve been waiting for is already here?',
      selectionStart: 0,
      selectionEnd: 50,
      status: 'pending',
      reviewedByUserId: null,
      reviewedAt: null,
      reviewComment: null,
      appliedAt: null,
      metadata: {
        confidence: 0.8,
        category: 'engagement'
      },
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'edit-2',
      speechId,
      sectionId: 'section-2',
      authorId: 'user-456',
      authorName: 'Jane Reviewer',
      authorEmail: 'jane@example.com',
      title: 'Add specific example',
      description: 'Adding a concrete example would make this more relatable',
      originalText: 'The digital transformation isn\'t coming – it\'s here.',
      suggestedText: 'The digital transformation isn\'t coming – it\'s here. Just look at how ChatGPT went from zero to 100 million users in just 2 months.',
      selectionStart: 100,
      selectionEnd: 150,
      status: 'accepted',
      reviewedByUserId: 'user-123',
      reviewedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      reviewComment: 'Great suggestion! This adds concrete impact.',
      appliedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      metadata: {
        confidence: 0.9,
        category: 'specificity'
      },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 'edit-3',
      speechId,
      sectionId: 'section-3',
      authorId: 'user-456',
      authorName: 'Jane Reviewer',
      authorEmail: 'jane@example.com',
      title: 'Softer call to action',
      description: 'This feels a bit too forceful. Could we make it more inviting?',
      originalText: '[EMPHASIZE] The question isn\'t whether you\'ll adapt to this new reality – it\'s how quickly you\'ll embrace it.',
      suggestedText: '[EMPHASIZE] The opportunity before us isn\'t just about adapting to this new reality – it\'s about shaping it together.',
      selectionStart: 0,
      selectionEnd: 100,
      status: 'rejected',
      reviewedByUserId: 'user-123',
      reviewedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      reviewComment: 'I like the directness of the original. It matches the speech tone.',
      appliedAt: null,
      metadata: {
        confidence: 0.7,
        category: 'tone'
      },
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    }
  ];

  // Filter by status if provided
  const filteredEdits = status 
    ? mockSuggestedEdits.filter(edit => edit.status === status)
    : mockSuggestedEdits;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        suggestedEdits: filteredEdits,
        total: filteredEdits.length,
        speechId,
        stats: {
          pending: mockSuggestedEdits.filter(e => e.status === 'pending').length,
          accepted: mockSuggestedEdits.filter(e => e.status === 'accepted').length,
          rejected: mockSuggestedEdits.filter(e => e.status === 'rejected').length,
        }
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse),
  };
}

// Create a new suggested edit
async function handleCreateSuggestedEdit(event: HandlerEvent, headers: any, userId: string) {
  const body = JSON.parse(event.body || '{}');
  const validatedData = createSuggestedEditSchema.parse(body);

  // TODO: Validate user has comment permission on this speech
  // TODO: Validate section exists if sectionId provided
  // TODO: Validate selection range is within the text

  const newSuggestedEdit = {
    id: `edit_${Date.now()}`,
    speechId: validatedData.speechId,
    sectionId: validatedData.sectionId || null,
    authorId: userId,
    authorName: 'Current User', // TODO: Get from user data
    authorEmail: 'user@example.com', // TODO: Get from user data
    title: validatedData.title,
    description: validatedData.description || null,
    originalText: validatedData.originalText,
    suggestedText: validatedData.suggestedText,
    selectionStart: validatedData.selectionStart,
    selectionEnd: validatedData.selectionEnd,
    status: 'pending',
    reviewedByUserId: null,
    reviewedAt: null,
    reviewComment: null,
    appliedAt: null,
    metadata: {
      userAgent: event.headers['user-agent'] || 'unknown',
      ip: event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown',
      confidence: 0.8, // Could be calculated based on edit type
      category: 'general' // Could be auto-categorized
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // TODO: Save to database
  // await db.insert(suggestedEdits).values(newSuggestedEdit);

  // TODO: Send notification to speech author
  // await notifySuggestedEditCreated(newSuggestedEdit);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      success: true,
      data: newSuggestedEdit,
      timestamp: new Date().toISOString(),
    } as ApiResponse),
  };
}

// Review a suggested edit (accept/reject)
async function handleReviewSuggestedEdit(event: HandlerEvent, headers: any, editId: string, userId: string) {
  const body = JSON.parse(event.body || '{}');
  const validatedData = reviewSuggestedEditSchema.parse(body);

  // TODO: Validate user is speech author or has review permissions
  // TODO: Validate suggested edit exists and is in pending status

  const reviewedEdit = {
    id: editId,
    status: validatedData.status,
    reviewedByUserId: userId,
    reviewedAt: new Date().toISOString(),
    reviewComment: validatedData.reviewComment || null,
    updatedAt: new Date().toISOString(),
    // ... other fields would come from database
  };

  // TODO: Update in database
  // await db.update(suggestedEdits).set(reviewedEdit).where(eq(suggestedEdits.id, editId));

  // TODO: Send notification to edit author
  // await notifySuggestedEditReviewed(reviewedEdit);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: reviewedEdit,
      timestamp: new Date().toISOString(),
    } as ApiResponse),
  };
}

// Apply an accepted suggested edit to the speech content
async function handleApplySuggestedEdit(event: HandlerEvent, headers: any, editId: string, userId: string) {
  // TODO: Validate user is speech author
  // TODO: Validate suggested edit exists and is accepted
  // TODO: Get the suggested edit and apply it to the speech content
  // TODO: Create a version snapshot before applying
  // TODO: Update the speech section content
  // TODO: Mark the edit as applied

  const appliedEdit = {
    id: editId,
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // ... other fields would come from database
  };

  // TODO: Update in database
  // await db.update(suggestedEdits).set({ appliedAt: new Date() }).where(eq(suggestedEdits.id, editId));
  
  // TODO: Apply the change to speech content
  // await applySuggestedEditToSpeech(editId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: appliedEdit,
      timestamp: new Date().toISOString(),
    } as ApiResponse),
  };
}

// Delete a suggested edit
async function handleDeleteSuggestedEdit(event: HandlerEvent, headers: any, editId: string, userId: string) {
  // TODO: Validate user owns this suggested edit or is speech author
  // TODO: Only allow deletion of pending edits

  // TODO: Delete from database
  // await db.delete(suggestedEdits).where(eq(suggestedEdits.id, editId));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        id: editId,
        deleted: true
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse),
  };
}

export { handler };