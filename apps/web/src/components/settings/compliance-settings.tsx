'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { InfoIcon, AlertTriangleIcon, CheckCircleIcon, ShieldIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type JurisdictionType = 'US' | 'EU' | 'UK' | 'CA' | 'AU' | 'OTHER';
type EthicsMode = 'standard' | 'academic' | 'political' | 'corporate';

interface UserPreferences {
  id: string;
  jurisdiction: JurisdictionType;
  jurisdictionConfirmed: boolean;
  ethicsMode: EthicsMode;
  academicHonestyAccepted: boolean;
  contentFilteringEnabled: boolean;
  politicalContentWarnings: boolean;
  exportDisclaimerAccepted: boolean;
  complianceSettings: Record<string, any>;
}

interface ComplianceRequirements {
  exportDisclaimer: boolean;
  academicHonesty: boolean;
  politicalWarnings: boolean;
  contentFiltering: boolean;
  disclaimerText: string;
}

const jurisdictionLabels = {
  US: 'United States',
  EU: 'European Union',
  UK: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  OTHER: 'Other/International',
};

const ethicsModeLabels = {
  standard: 'Standard',
  academic: 'Academic',
  political: 'Political',
  corporate: 'Corporate',
};

const ethicsModeDescriptions = {
  standard: 'General use with basic AI disclosure and fact-checking',
  academic: 'Enhanced academic integrity checks and citation requirements',
  political: 'Political bias detection and fact-verification for public speaking',
  corporate: 'Corporate compliance and brand safety measures',
};

export function ComplianceSettings() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [requirements, setRequirements] = useState<ComplianceRequirements | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAcademicHonesty, setShowAcademicHonesty] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      // In real implementation, this would call the API
      const response = await fetch('/api/user-preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.data);
        setRequirements(data.data.complianceRequirements);
      } else {
        throw new Error('Failed to fetch preferences');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load compliance settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!preferences) return;

    try {
      setSaving(true);
      const response = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.data);
        setRequirements(data.data.complianceRequirements);
        toast({
          title: 'Settings Updated',
          description: 'Your compliance settings have been saved',
        });
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update compliance settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAcademicHonestyAccept = () => {
    updatePreferences({ 
      academicHonestyAccepted: true,
      ethicsMode: 'academic',
    });
    setShowAcademicHonesty(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="h-5 w-5" />
            Compliance Settings
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences || !requirements) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load compliance settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchPreferences}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Jurisdiction Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="h-5 w-5" />
            Jurisdiction & Legal Compliance
          </CardTitle>
          <CardDescription>
            Configure your location and legal requirements for AI-generated content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jurisdiction">Your Jurisdiction</Label>
            <Select
              value={preferences.jurisdiction}
              onValueChange={(value: JurisdictionType) => 
                updatePreferences({ jurisdiction: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(jurisdictionLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!preferences.jurisdictionConfirmed && (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Jurisdiction Auto-Detected</AlertTitle>
                <AlertDescription>
                  We've detected your jurisdiction as {jurisdictionLabels[preferences.jurisdiction]}. 
                  Please confirm this is correct for proper compliance.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {requirements.disclaimerText && (
            <div className="space-y-2">
              <Label>Required Disclaimer Preview</Label>
              <div className="p-3 bg-gray-50 rounded-md text-sm font-mono whitespace-pre-wrap">
                {requirements.disclaimerText}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ethics Mode Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Ethics & Content Mode</CardTitle>
          <CardDescription>
            Choose the appropriate ethics mode for your intended use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ethics-mode">Ethics Mode</Label>
            <Select
              value={preferences.ethicsMode}
              onValueChange={(value: EthicsMode) => {
                if (value === 'academic' && !preferences.academicHonestyAccepted) {
                  setShowAcademicHonesty(true);
                } else {
                  updatePreferences({ ethicsMode: value });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ethicsModeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-sm text-gray-500">
                        {ethicsModeDescriptions[value as EthicsMode]}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Mode Status */}
          <div className="flex items-center gap-2">
            <Badge variant={preferences.ethicsMode === 'standard' ? 'secondary' : 'default'}>
              {ethicsModeLabels[preferences.ethicsMode]}
            </Badge>
            {preferences.academicHonestyAccepted && preferences.ethicsMode === 'academic' && (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircleIcon className="h-3 w-3" />
                Academic Integrity Confirmed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Filtering Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Content Filtering & Warnings</CardTitle>
          <CardDescription>
            Configure how content is filtered and what warnings you receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="content-filtering">Content Filtering</Label>
              <div className="text-sm text-gray-500">
                Enable automatic filtering of potentially problematic content
              </div>
            </div>
            <Switch
              id="content-filtering"
              checked={preferences.contentFilteringEnabled}
              onCheckedChange={(checked) => 
                updatePreferences({ contentFilteringEnabled: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="political-warnings">Political Content Warnings</Label>
              <div className="text-sm text-gray-500">
                Receive warnings about potentially biased or political content
              </div>
            </div>
            <Switch
              id="political-warnings"
              checked={preferences.politicalContentWarnings}
              onCheckedChange={(checked) => 
                updatePreferences({ politicalContentWarnings: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Academic Honesty Modal */}
      {showAcademicHonesty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
                Academic Integrity Agreement
              </CardTitle>
              <CardDescription>
                Please read and accept the academic honesty guidelines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-2">
                  Important: Academic Use of AI-Generated Content
                </h3>
                <div className="text-sm text-amber-800 space-y-2">
                  <p>
                    By enabling Academic Mode, you acknowledge and agree to the following:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>AI assistance will be properly disclosed in all academic work</li>
                    <li>You will cite AI-generated content according to your institution's guidelines</li>
                    <li>Original critical thinking and analysis remain your responsibility</li>
                    <li>You will verify all facts, citations, and claims before submission</li>
                    <li>AI assistance supplements but does not replace academic rigor</li>
                    <li>You will comply with your institution's AI use policies</li>
                  </ul>
                  <p className="mt-3">
                    <strong>Remember:</strong> Academic integrity is essential. This tool assists 
                    your learning and writing process but cannot replace your own scholarly work, 
                    critical thinking, and adherence to academic standards.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAcademicHonesty(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAcademicHonestyAccept}
                  disabled={saving}
                >
                  {saving ? 'Accepting...' : 'I Accept & Enable Academic Mode'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliance Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Status</CardTitle>
          <CardDescription>
            Current compliance settings and requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-sm font-medium">Jurisdiction</div>
              <div className="text-xs text-gray-500">Configured</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {requirements.exportDisclaimer ? '✓' : '−'}
              </div>
              <div className="text-sm font-medium">Export Disclaimer</div>
              <div className="text-xs text-gray-500">
                {requirements.exportDisclaimer ? 'Required' : 'Optional'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {requirements.academicHonesty ? '⚠' : '−'}
              </div>
              <div className="text-sm font-medium">Academic Honesty</div>
              <div className="text-xs text-gray-500">
                {requirements.academicHonesty ? 'Required' : 'Not Required'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {requirements.contentFiltering ? '🛡' : '−'}
              </div>
              <div className="text-sm font-medium">Content Filtering</div>
              <div className="text-xs text-gray-500">
                {requirements.contentFiltering ? 'Active' : 'Standard'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}