'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Reply, 
  Check, 
  MoreHorizontal,
  Quote,
  Trash2,
  Edit3,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  speechId: string;
  sectionId?: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  parentId?: string;
  content: string;
  selectionStart?: number;
  selectionEnd?: number;
  selectionText?: string;
  isResolved: boolean;
  resolvedByUserId?: string;
  resolvedAt?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

interface CommentsPanelProps {
  speechId: string;
  canComment?: boolean;
  currentUserId?: string;
  isAuthor?: boolean;
}

export function CommentsPanel({ speechId, canComment = false, currentUserId, isAuthor = false }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  // Load comments
  useEffect(() => {
    loadComments();
  }, [speechId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/.netlify/functions/comments?speechId=${speechId}`);
      const result = await response.json();

      if (result.success) {
        setComments(result.data.comments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitComment = async (content: string, parentId?: string) => {
    if (!content.trim() || !canComment) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/.netlify/functions/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth header
        },
        body: JSON.stringify({
          speechId,
          parentId,
          content: content.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Add the new comment to the list
        if (parentId) {
          // Add as reply
          setComments(prev => prev.map(comment => {
            if (comment.id === parentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), result.data]
              };
            }
            return comment;
          }));
          setReplyText('');
          setReplyingTo(null);
        } else {
          // Add as new comment
          setComments(prev => [result.data, ...prev]);
          setNewCommentText('');
        }

        toast({
          title: 'Comment added',
          description: 'Your comment has been posted.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveComment = async (commentId: string, isResolved: boolean) => {
    try {
      const response = await fetch(`/.netlify/functions/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth header
        },
        body: JSON.stringify({ isResolved }),
      });

      const result = await response.json();

      if (result.success) {
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, isResolved, resolvedAt: isResolved ? new Date().toISOString() : undefined }
            : comment
        ));

        toast({
          title: isResolved ? 'Comment resolved' : 'Comment reopened',
          description: isResolved ? 'The comment has been marked as resolved.' : 'The comment has been reopened.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update comment',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const CommentCard = ({ comment, isReply = false }: { comment: Comment, isReply?: boolean }) => (
    <Card className={`${isReply ? 'ml-8 border-l-2 border-blue-200' : ''} ${comment.isResolved ? 'opacity-60' : ''}`}>
      <CardContent className="pt-4">
        <div className="flex items-start space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" /> {/* TODO: Add user avatar */}
            <AvatarFallback className="text-xs">
              {getInitials(comment.authorName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-medium">{comment.authorName}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.createdAt)}
              </span>
              {comment.isResolved && (
                <Badge variant="secondary" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Resolved
                </Badge>
              )}
            </div>
            
            {comment.selectionText && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-2 text-sm">
                <Quote className="h-3 w-3 inline mr-1" />
                &quot;{comment.selectionText}&quot;
              </div>
            )}
            
            <p className="text-sm text-gray-700 mb-3">{comment.content}</p>
            
            <div className="flex items-center space-x-2">
              {canComment && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReplyingTo(comment.id)}
                  className="h-7 px-2 text-xs"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
              
              {(isAuthor || currentUserId === comment.authorId) && !comment.isResolved && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resolveComment(comment.id, true)}
                  className="h-7 px-2 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Resolve
                </Button>
              )}
              
              {(isAuthor || currentUserId === comment.authorId) && comment.isResolved && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resolveComment(comment.id, false)}
                  className="h-7 px-2 text-xs"
                >
                  Reopen
                </Button>
              )}
            </div>
            
            {/* Reply form */}
            {replyingTo === comment.id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => submitComment(replyText, comment.id)}
                    disabled={!replyText.trim() || isSubmitting}
                  >
                    Post Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4 space-y-3">
                {comment.replies.map((reply) => (
                  <CommentCard key={reply.id} comment={reply} isReply />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <MessageCircle className="h-5 w-5" />
        <h3 className="text-lg font-medium">
          Comments ({comments.filter(c => !c.isResolved).length})
        </h3>
      </div>
      
      {/* New comment form */}
      {canComment && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Add a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => submitComment(newCommentText)}
                  disabled={!newCommentText.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No comments yet</p>
            {canComment && <p className="text-sm">Be the first to leave feedback!</p>}
          </div>
        ) : (
          comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
}