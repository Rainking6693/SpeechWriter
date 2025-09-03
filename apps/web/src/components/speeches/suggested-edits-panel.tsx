'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Edit3, 
  Check, 
  X, 
  MessageCircle,
  Plus,
  Clock,
  User,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SuggestedEdit {
  id: string;
  speechId: string;
  sectionId?: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  title: string;
  description?: string;
  originalText: string;
  suggestedText: string;
  selectionStart: number;
  selectionEnd: number;
  status: 'pending' | 'accepted' | 'rejected';
  reviewedByUserId?: string;
  reviewedAt?: string;
  reviewComment?: string;
  appliedAt?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface SuggestedEditsPanelProps {
  speechId: string;
  canSuggestEdits?: boolean;
  isAuthor?: boolean;
  currentUserId?: string;
}

export function SuggestedEditsPanel({ 
  speechId, 
  canSuggestEdits = false, 
  isAuthor = false, 
  currentUserId 
}: SuggestedEditsPanelProps) {
  const [suggestedEdits, setSuggestedEdits] = useState<SuggestedEdit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [isCreatingEdit, setIsCreatingEdit] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { toast } = useToast();

  // Load suggested edits
  useEffect(() => {
    loadSuggestedEdits();
  }, [speechId, filter]);

  const loadSuggestedEdits = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        speechId,
        ...(filter !== 'all' && { status: filter })
      });

      const response = await fetch(`/.netlify/functions/suggested-edits?${params}`);
      const result = await response.json();

      if (result.success) {
        setSuggestedEdits(result.data.suggestedEdits);
      }
    } catch (error) {
      console.error('Error loading suggested edits:', error);
      toast({
        title: 'Error',
        description: 'Failed to load suggested edits',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reviewSuggestedEdit = async (editId: string, status: 'accepted' | 'rejected', reviewComment?: string) => {
    try {
      const response = await fetch(`/.netlify/functions/suggested-edits/${editId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth header
        },
        body: JSON.stringify({
          status,
          reviewComment,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the edit in the list
        setSuggestedEdits(prev => prev.map(edit => 
          edit.id === editId 
            ? { 
                ...edit, 
                status, 
                reviewedByUserId: currentUserId,
                reviewedAt: new Date().toISOString(),
                reviewComment 
              }
            : edit
        ));

        toast({
          title: `Edit ${status}`,
          description: `The suggested edit has been ${status}.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to review suggested edit',
        variant: 'destructive',
      });
    }
  };

  const applySuggestedEdit = async (editId: string) => {
    try {
      const response = await fetch(`/.netlify/functions/suggested-edits/${editId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth header
        },
      });

      const result = await response.json();

      if (result.success) {
        // Update the edit as applied
        setSuggestedEdits(prev => prev.map(edit => 
          edit.id === editId 
            ? { ...edit, appliedAt: new Date().toISOString() }
            : edit
        ));

        toast({
          title: 'Edit applied',
          description: 'The suggested edit has been applied to your speech.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply suggested edit',
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const CreateEditDialog = ({ children }: { children: React.ReactNode }) => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      originalText: '',
      suggestedText: '',
      selectionStart: 0,
      selectionEnd: 0,
    });

    const handleSubmit = async () => {
      setIsCreatingEdit(true);
      try {
        const response = await fetch('/.netlify/functions/suggested-edits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            speechId,
            ...formData,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setSuggestedEdits(prev => [result.data, ...prev]);
          setShowCreateForm(false);
          toast({
            title: 'Edit suggested',
            description: 'Your suggested edit has been submitted.',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to submit suggested edit',
          variant: 'destructive',
        });
      } finally {
        setIsCreatingEdit(false);
      }
    };

    return (
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Suggest an Edit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of the edit"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Explain why this change would improve the speech"
              />
            </div>
            
            <div>
              <Label htmlFor="original">Original Text</Label>
              <Textarea
                id="original"
                value={formData.originalText}
                onChange={(e) => setFormData(prev => ({ ...prev, originalText: e.target.value }))}
                placeholder="Paste the text you want to change"
              />
            </div>
            
            <div>
              <Label htmlFor="suggested">Suggested Text</Label>
              <Textarea
                id="suggested"
                value={formData.suggestedText}
                onChange={(e) => setFormData(prev => ({ ...prev, suggestedText: e.target.value }))}
                placeholder="Your improved version"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isCreatingEdit || !formData.title || !formData.originalText || !formData.suggestedText}
                className="flex-1"
              >
                {isCreatingEdit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit Edit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Edit3 className="h-5 w-5" />
          <h3 className="text-lg font-medium">Suggested Edits</h3>
          <Badge variant="secondary">
            {suggestedEdits.filter(e => e.status === 'pending').length} pending
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Filter buttons */}
          <div className="flex rounded-md border">
            {['all', 'pending', 'accepted', 'rejected'].map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(status as any)}
                className="rounded-none first:rounded-l-md last:rounded-r-md"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
          
          {canSuggestEdits && (
            <CreateEditDialog>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Suggest Edit
              </Button>
            </CreateEditDialog>
          )}
        </div>
      </div>
      
      {/* Suggested edits list */}
      <div className="space-y-4">
        {suggestedEdits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Edit3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No suggested edits</p>
            {canSuggestEdits && <p className="text-sm">Be the first to suggest an improvement!</p>}
          </div>
        ) : (
          suggestedEdits.map((edit) => (
            <Card key={edit.id} className="relative">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(edit.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium">{edit.authorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(edit.createdAt)}
                      </span>
                      <Badge className={getStatusColor(edit.status)}>
                        {getStatusIcon(edit.status)}
                        <span className="ml-1">{edit.status}</span>
                      </Badge>
                    </div>
                    
                    <h4 className="font-medium mb-1">{edit.title}</h4>
                    {edit.description && (
                      <p className="text-sm text-muted-foreground mb-3">{edit.description}</p>
                    )}
                    
                    {/* Text comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-red-600">Original</Label>
                        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                          {edit.originalText}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-green-600">Suggested</Label>
                        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                          {edit.suggestedText}
                        </div>
                      </div>
                    </div>
                    
                    {/* Review comment */}
                    {edit.reviewComment && (
                      <div className="bg-muted rounded p-3 text-sm mb-3">
                        <div className="flex items-center mb-1">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          <span className="text-xs font-medium">Review comment:</span>
                        </div>
                        {edit.reviewComment}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {edit.status === 'pending' && isAuthor && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => reviewSuggestedEdit(edit.id, 'accepted')}
                            className="h-7 px-2 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reviewSuggestedEdit(edit.id, 'rejected')}
                            className="h-7 px-2 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {edit.status === 'accepted' && !edit.appliedAt && isAuthor && (
                        <Button
                          size="sm"
                          onClick={() => applySuggestedEdit(edit.id)}
                          className="h-7 px-2 text-xs"
                        >
                          <ChevronRight className="h-3 w-3 mr-1" />
                          Apply to Speech
                        </Button>
                      )}
                      
                      {edit.appliedAt && (
                        <Badge variant="secondary" className="text-xs">
                          Applied {formatDate(edit.appliedAt)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}