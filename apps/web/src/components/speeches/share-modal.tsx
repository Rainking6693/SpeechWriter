'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Share2, 
  Copy, 
  Eye, 
  MessageCircle, 
  Calendar,
  Hash,
  Settings,
  Link,
  Trash2,
  Check,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareLink {
  id: string;
  url: string;
  token: string;
  role: 'viewer' | 'commenter';
  expiresAt: string | null;
  maxUses: number | null;
  currentUses: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ShareModalProps {
  speechId: string;
  speechTitle: string;
  children?: React.ReactNode;
}

export function ShareModal({ speechId, speechTitle, children }: ShareModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newShareData, setNewShareData] = useState({
    role: 'viewer' as 'viewer' | 'commenter',
    expiresIn: '7d' as '1h' | '24h' | '7d' | '30d' | 'never',
    maxUses: '',
    description: '',
    requireAuth: false,
  });

  const { toast } = useToast();

  // Load existing share links
  useEffect(() => {
    if (isOpen) {
      loadShareLinks();
    }
  }, [isOpen, speechId]);

  const loadShareLinks = async () => {
    try {
      // TODO: Implement API call to fetch share links
      // const response = await fetch(`/.netlify/functions/share-links?speechId=${speechId}`);
      // const result = await response.json();
      
      // Mock data for now
      const mockShareLinks: ShareLink[] = [
        {
          id: 'share-1',
          url: 'https://aispeechwriter.netlify.app/shared/abc123def456',
          token: 'abc123def456',
          role: 'commenter',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          maxUses: 10,
          currentUses: 3,
          description: 'For team review',
          isActive: true,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'share-2',
          url: 'https://aispeechwriter.netlify.app/shared/xyz789ghi012',
          token: 'xyz789ghi012',
          role: 'viewer',
          expiresAt: null,
          maxUses: null,
          currentUses: 15,
          description: 'Public preview link',
          isActive: true,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ];
      
      setShareLinks(mockShareLinks);
    } catch (error) {
      console.error('Error loading share links:', error);
      toast({
        title: 'Error',
        description: 'Failed to load share links',
        variant: 'destructive',
      });
    }
  };

  const createShareLink = async () => {
    setIsCreating(true);
    
    try {
      const response = await fetch('/.netlify/functions/share-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth header when auth is implemented
        },
        body: JSON.stringify({
          speechId,
          role: newShareData.role,
          expiresIn: newShareData.expiresIn,
          maxUses: newShareData.maxUses ? parseInt(newShareData.maxUses) : undefined,
          description: newShareData.description || undefined,
          requireAuth: newShareData.requireAuth,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create share link');
      }

      // Add the new share link to the list
      setShareLinks(prev => [result.data.shareLink, ...prev]);
      setShowCreateForm(false);
      
      // Reset form
      setNewShareData({
        role: 'viewer',
        expiresIn: '7d',
        maxUses: '',
        description: '',
        requireAuth: false,
      });

      toast({
        title: 'Share link created',
        description: 'Your share link is ready to use.',
      });
    } catch (error) {
      console.error('Error creating share link:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create share link',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Copied',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const deleteShareLink = async (shareId: string) => {
    try {
      // TODO: Implement delete API call
      setShareLinks(prev => prev.filter(link => link.id !== shareId));
      toast({
        title: 'Share link deleted',
        description: 'The share link has been deactivated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete share link',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never expires';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share &quot;{speechTitle}&quot;</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Create New Share Link */}
          {!showCreateForm ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Share2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium mb-2">Create Share Link</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate secure links for reviewers and collaborators
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Link className="h-4 w-4 mr-2" />
                    Create New Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create Share Link</CardTitle>
                <CardDescription>Configure permissions and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Access Level</Label>
                  <RadioGroup
                    value={newShareData.role}
                    onValueChange={(value: 'viewer' | 'commenter') => 
                      setNewShareData(prev => ({ ...prev, role: value }))
                    }
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="viewer" id="viewer" />
                      <Label htmlFor="viewer" className="flex items-center">
                        <Eye className="h-4 w-4 mr-2" />
                        Viewer - Can read only
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="commenter" id="commenter" />
                      <Label htmlFor="commenter" className="flex items-center">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Commenter - Can read and add comments
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="expires" className="text-sm font-medium">
                    Expires
                  </Label>
                  <Select
                    value={newShareData.expiresIn}
                    onValueChange={(value: any) => 
                      setNewShareData(prev => ({ ...prev, expiresIn: value }))
                    }
                  >
                    <SelectTrigger id="expires">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">In 1 hour</SelectItem>
                      <SelectItem value="24h">In 24 hours</SelectItem>
                      <SelectItem value="7d">In 7 days</SelectItem>
                      <SelectItem value="30d">In 30 days</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="max-uses" className="text-sm font-medium">
                    Maximum Uses (optional)
                  </Label>
                  <Input
                    id="max-uses"
                    type="number"
                    min="1"
                    max="1000"
                    placeholder="Unlimited"
                    value={newShareData.maxUses}
                    onChange={(e) => 
                      setNewShareData(prev => ({ ...prev, maxUses: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Internal note about this share link"
                    value={newShareData.description}
                    onChange={(e) => 
                      setNewShareData(prev => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="require-auth" className="text-sm font-medium">
                    Require sign-in
                  </Label>
                  <Switch
                    id="require-auth"
                    checked={newShareData.requireAuth}
                    onCheckedChange={(checked) => 
                      setNewShareData(prev => ({ ...prev, requireAuth: checked }))
                    }
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={createShareLink} 
                    disabled={isCreating}
                    className="flex-1"
                  >
                    {isCreating ? 'Creating...' : 'Create Link'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Share Links */}
          {shareLinks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Active Share Links</h3>
              {shareLinks.map((link) => (
                <Card key={link.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={link.role === 'commenter' ? 'default' : 'secondary'}>
                            {link.role === 'commenter' ? (
                              <MessageCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Eye className="h-3 w-3 mr-1" />
                            )}
                            {link.role}
                          </Badge>
                          {link.description && (
                            <span className="text-sm text-muted-foreground truncate">
                              {link.description}
                            </span>
                          )}
                        </div>
                        
                        <div className="bg-muted rounded p-2 font-mono text-sm break-all">
                          {link.url}
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Expires: {formatDate(link.expiresAt)}
                          </span>
                          <span className="flex items-center">
                            <Hash className="h-3 w-3 mr-1" />
                            Uses: {link.currentUses}{link.maxUses ? `/${link.maxUses}` : ''}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(link.url)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(link.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteShareLink(link.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}