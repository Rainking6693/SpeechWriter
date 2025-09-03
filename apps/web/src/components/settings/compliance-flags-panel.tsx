'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangleIcon, 
  AlertCircleIcon, 
  InfoIcon, 
  XCircleIcon,
  CheckCircleIcon,
  ShieldIcon,
  DownloadIcon 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ComplianceFlag {
  id: string;
  type: string;
  reason: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
}

interface ComplianceCheck {
  passed: boolean;
  flags: ComplianceFlag[];
  disclaimerRequired: boolean;
  disclaimerText: string;
  academicHonestyRequired: boolean;
  politicalWarningsRequired: boolean;
}

interface ComplianceFlagsPanelProps {
  speechId: string;
  exportType: 'pdf' | 'docx' | 'txt';
  onExportReady?: (acknowledgedFlags: string[]) => void;
  onCancel?: () => void;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <XCircleIcon className="h-4 w-4 text-red-500" />;
    case 'high':
      return <AlertTriangleIcon className="h-4 w-4 text-orange-500" />;
    case 'medium':
      return <AlertCircleIcon className="h-4 w-4 text-yellow-500" />;
    default:
      return <InfoIcon className="h-4 w-4 text-blue-500" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'destructive';
    case 'high':
      return 'destructive';
    case 'medium':
      return 'warning';
    default:
      return 'secondary';
  }
};

const getFlagTypeLabel = (type: string) => {
  const labels = {
    political: 'Political Content',
    academic: 'Academic Integrity',
    ethical: 'Ethical Concern',
    legal: 'Legal Compliance',
    factual: 'Fact Verification',
    bias: 'Bias Detection',
    sensitive: 'Sensitive Content',
  };
  return labels[type as keyof typeof labels] || type;
};

export function ComplianceFlagsPanel({ 
  speechId, 
  exportType, 
  onExportReady, 
  onCancel 
}: ComplianceFlagsPanelProps) {
  const [complianceCheck, setComplianceCheck] = useState<ComplianceCheck | null>(null);
  const [acknowledgedFlags, setAcknowledgedFlags] = useState<string[]>([]);
  const [acknowledgmentNotes, setAcknowledgmentNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComplianceCheck();
  }, [speechId]);

  const fetchComplianceCheck = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/export-with-compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          speechId,
          exportType,
          checkOnly: true, // Flag to only run compliance check
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComplianceCheck(data.data.complianceCheck);
      } else if (response.status === 400) {
        // Expected response for compliance failures
        const data = await response.json();
        setComplianceCheck(data.data.complianceCheck);
      } else {
        throw new Error('Failed to fetch compliance check');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check compliance status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFlagAcknowledgment = (flagId: string, acknowledged: boolean) => {
    if (acknowledged) {
      setAcknowledgedFlags(prev => [...prev, flagId]);
    } else {
      setAcknowledgedFlags(prev => prev.filter(id => id !== flagId));
    }
  };

  const handleNoteChange = (flagId: string, note: string) => {
    setAcknowledgmentNotes(prev => ({ ...prev, [flagId]: note }));
  };

  const canProceedWithExport = () => {
    if (!complianceCheck) return false;
    
    // Check if all critical and high severity flags are acknowledged
    const criticalFlags = complianceCheck.flags.filter(f => 
      ['critical', 'high'].includes(f.severity) && !f.acknowledged
    );
    
    const unacknowledgedCritical = criticalFlags.filter(f => 
      !acknowledgedFlags.includes(f.id)
    );
    
    return unacknowledgedCritical.length === 0;
  };

  const handleExport = async () => {
    if (!canProceedWithExport()) return;

    try {
      setExporting(true);
      
      // Call the export function with acknowledged flags
      if (onExportReady) {
        onExportReady(acknowledgedFlags);
      } else {
        // Default export handling
        const response = await fetch('/api/export-with-compliance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            speechId,
            exportType,
            acknowledgedFlags,
            forceExport: true,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          toast({
            title: 'Export Ready',
            description: 'Your speech is ready for download with compliance disclaimer included.',
          });
        } else {
          throw new Error('Export failed');
        }
      }
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to process export request',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="h-5 w-5" />
            Checking Compliance...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!complianceCheck) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load compliance check</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchComplianceCheck}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (complianceCheck.passed && complianceCheck.flags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            Compliance Check Passed
          </CardTitle>
          <CardDescription>
            Your speech meets all compliance requirements and is ready for export.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complianceCheck.disclaimerText && (
              <div>
                <Label>Export Disclaimer</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm font-mono whitespace-pre-wrap">
                  {complianceCheck.disclaimerText}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={handleExport} disabled={exporting} className="flex items-center gap-2">
                <DownloadIcon className="h-4 w-4" />
                {exporting ? 'Preparing Export...' : `Export ${exportType.toUpperCase()}`}
              </Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
            Compliance Review Required
          </CardTitle>
          <CardDescription>
            Please review and acknowledge the following flags before export
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Export Blocked</AlertTitle>
            <AlertDescription>
              Your speech has been flagged for potential compliance issues. 
              Please review each flag and acknowledge your understanding before proceeding.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Compliance Flags */}
      <div className="space-y-4">
        {complianceCheck.flags.map((flag, index) => (
          <Card key={flag.id} className="border-l-4 border-l-orange-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getSeverityIcon(flag.severity)}
                  <CardTitle className="text-base">
                    {getFlagTypeLabel(flag.type)}
                  </CardTitle>
                  <Badge variant={getSeverityColor(flag.severity) as any} size="sm">
                    {flag.severity.toUpperCase()}
                  </Badge>
                </div>
                {flag.acknowledged && (
                  <Badge variant="success" size="sm">
                    Previously Acknowledged
                  </Badge>
                )}
              </div>
              <CardDescription>{flag.reason}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {flag.description && (
                <p className="text-sm text-gray-600">{flag.description}</p>
              )}
              
              {!flag.acknowledged && ['critical', 'high'].includes(flag.severity) && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`flag-${flag.id}`}
                      checked={acknowledgedFlags.includes(flag.id)}
                      onCheckedChange={(checked) => 
                        handleFlagAcknowledgment(flag.id, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`flag-${flag.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I acknowledge this flag and take responsibility for this content
                    </Label>
                  </div>
                  
                  {acknowledgedFlags.includes(flag.id) && (
                    <div className="space-y-2">
                      <Label htmlFor={`note-${flag.id}`} className="text-sm">
                        Acknowledgment Note (optional)
                      </Label>
                      <Textarea
                        id={`note-${flag.id}`}
                        placeholder="Add a note about how you've addressed this concern..."
                        value={acknowledgmentNotes[flag.id] || ''}
                        onChange={(e) => handleNoteChange(flag.id, e.target.value)}
                        className="text-sm"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Export Disclaimer */}
      {complianceCheck.disclaimerText && (
        <Card>
          <CardHeader>
            <CardTitle>Export Disclaimer</CardTitle>
            <CardDescription>
              This disclaimer will be included in your exported file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-gray-50 rounded-md text-sm font-mono whitespace-pre-wrap">
              {complianceCheck.disclaimerText}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {canProceedWithExport() ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="h-4 w-4" />
                  Ready for export
                </span>
              ) : (
                <span className="flex items-center gap-2 text-amber-600">
                  <AlertTriangleIcon className="h-4 w-4" />
                  Please acknowledge all critical and high-severity flags
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button 
                onClick={handleExport} 
                disabled={!canProceedWithExport() || exporting}
                className="flex items-center gap-2"
              >
                <DownloadIcon className="h-4 w-4" />
                {exporting ? 'Preparing Export...' : `Export ${exportType.toUpperCase()}`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}