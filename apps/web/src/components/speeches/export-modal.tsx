'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Download, FileText, File, Share2, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportModalProps {
  speechId: string;
  speechTitle: string;
  userPlan?: 'free' | 'pro' | 'team';
  children?: React.ReactNode;
}

export function ExportModal({ speechId, speechTitle, userPlan = 'free', children }: ExportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx'>('pdf');
  const [exportOptions, setExportOptions] = useState({
    format: 'full-script' as 'speaker-notes' | 'full-script' | 'outline-only',
    includeStageDirections: true,
    includeTiming: true,
  });

  const { toast } = useToast();
  const isFreePlan = userPlan === 'free';
  const shouldWatermark = isFreePlan;

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const endpoint = exportFormat === 'pdf' 
        ? '/.netlify/functions/export-pdf' 
        : '/.netlify/functions/export-docx';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth header when auth is implemented
          // 'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          speechId,
          ...exportOptions,
          watermark: shouldWatermark,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Export failed');
      }

      // Create download link
      const mimeType = exportFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const blob = new Blob([
        new Uint8Array(atob(result.data.content).split('').map(c => c.charCodeAt(0)))
      ], { type: mimeType });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `Your ${exportFormat.toUpperCase()} file has been downloaded.`,
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    // TODO: Open share modal
    toast({
      title: 'Coming soon',
      description: 'Share functionality will be available shortly.',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export &quot;{speechTitle}&quot;</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export File</TabsTrigger>
            <TabsTrigger value="share">Share & Collaborate</TabsTrigger>
          </TabsList>
          
          <TabsContent value="export" className="space-y-6">
            {/* Format Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Export Format</CardTitle>
                <CardDescription>Choose your preferred file format</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={exportFormat}
                  onValueChange={(value: 'pdf' | 'docx') => setExportFormat(value)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="pdf" id="pdf" className="peer sr-only" />
                    <Label
                      htmlFor="pdf"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <FileText className="mb-3 h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">PDF</div>
                        <div className="text-sm text-muted-foreground">
                          Professional formatting, ready to print
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="docx" id="docx" className="peer sr-only" />
                    <Label
                      htmlFor="docx"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <File className="mb-3 h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">Word Document</div>
                        <div className="text-sm text-muted-foreground">
                          Editable format for further modifications
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
                <CardDescription>Customize your export</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Content Format</Label>
                  <RadioGroup
                    value={exportOptions.format}
                    onValueChange={(value: any) => setExportOptions(prev => ({ ...prev, format: value }))}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="full-script" id="full-script" />
                      <Label htmlFor="full-script">Full Script</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="speaker-notes" id="speaker-notes" />
                      <Label htmlFor="speaker-notes">Speaker Notes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="outline-only" id="outline-only" />
                      <Label htmlFor="outline-only">Outline Only</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="stage-directions" className="text-sm font-medium">
                    Include Stage Directions
                  </Label>
                  <Switch
                    id="stage-directions"
                    checked={exportOptions.includeStageDirections}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeStageDirections: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="timing" className="text-sm font-medium">
                    Include Timing Information
                  </Label>
                  <Switch
                    id="timing"
                    checked={exportOptions.includeTiming}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeTiming: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Plan Notice */}
            {isFreePlan && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Free Plan Export
                      </p>
                      <p className="text-sm text-amber-700">
                        Exports include a watermark. Upgrade to Pro or Team for clean, professional exports.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export {exportFormat.toUpperCase()}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="share" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Share & Collaborate</CardTitle>
                <CardDescription>
                  Create secure links for reviewers and collaborators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <Share2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Collaboration Features</h3>
                  <p className="text-muted-foreground mb-4">
                    Share your speech for feedback and collaborate with others in real-time.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Secure, expiring share links</p>
                    <p>• Viewer and commenter roles</p>
                    <p>• Inline comments and suggestions</p>
                    <p>• Real-time collaboration</p>
                  </div>
                </div>
                
                <Button onClick={handleShare} className="w-full">
                  <Share2 className="h-4 w-4 mr-2" />
                  Create Share Link
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}