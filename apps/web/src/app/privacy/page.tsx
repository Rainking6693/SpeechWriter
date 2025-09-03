'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Lock, 
  Eye, 
  Download, 
  Trash2, 
  Settings,
  Globe,
  Clock,
  UserCheck,
  FileText,
  AlertCircle,
  CheckCircle,
  Mail,
} from 'lucide-react';
// Removed server-side import - privacy compliance logic will be handled via API routes

// Hardcoded privacy compliance data for now (would come from API in production)
const PRIVACY_COMPLIANCE_CHECKLIST = {
  dataCollection: {
    title: 'Data Collection',
    items: [
      'Minimal personal data collection',
      'Clear purpose for each data point',
      'User consent for optional data',
      'No sensitive data without explicit consent'
    ]
  },
  dataProtection: {
    title: 'Data Protection',
    items: [
      'Encryption at rest and in transit',
      'Access controls and authentication',
      'Regular security audits',
      'Data breach response plan'
    ]
  },
  userRights: {
    title: 'User Rights',
    items: [
      'Right to access personal data',
      'Right to rectify incorrect data',
      'Right to delete personal data',
      'Right to data portability'
    ]
  }
};

interface UserLocation {
  country?: string;
  state?: string;
  jurisdiction: 'EU' | 'CA' | 'US' | 'OTHER';
}

export default function PrivacyPage() {
  const [userLocation, setUserLocation] = useState<UserLocation>({ jurisdiction: 'OTHER' });
  const [showCompletePolicy, setShowCompletePolicy] = useState(false);

  useEffect(() => {
    // Detect user location (in production, this would use a geolocation service)
    // For now, we'll simulate based on browser language
    const language = navigator.language.toLowerCase();
    let jurisdiction: 'EU' | 'CA' | 'US' | 'OTHER' = 'OTHER';
    
    if (language.includes('en-us')) {
      jurisdiction = 'US';
    } else if (language.includes('en-ca') || language.includes('fr-ca')) {
      jurisdiction = 'CA';
    } else if (language.match(/(de|fr|es|it|nl|pt|pl|sv|da|no|fi)-/)) {
      jurisdiction = 'EU';
    }
    
    setUserLocation({ jurisdiction });
  }, []);

  // Hardcoded privacy data for now (would come from API in production)
  const privacyNotice = {
    jurisdiction: userLocation.jurisdiction || 'US',
    lastUpdated: '2024-01-01',
    dataRetentionPeriod: 365,
    contactEmail: 'privacy@speechwriter.com',
    applicableLaws: ['GDPR', 'CCPA'],
    rightToDelete: true,
    rightToAccess: true,
    rightToPortability: true
  };
  
  const cookieInfo = {
    essential: ['authentication', 'security'],
    functional: ['preferences', 'language'],
    analytics: ['usage_analytics', 'performance'],
    marketing: []
  };
  
  const requiresConsent = ['EU', 'UK'].includes(userLocation.jurisdiction || '');

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold">Privacy & Data Protection</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          We are committed to protecting your privacy and ensuring transparent data practices.
          Your rights and our responsibilities under applicable privacy laws.
        </p>
        
        {userLocation.jurisdiction !== 'OTHER' && (
          <Badge variant="outline" className="mt-4">
            <Globe className="h-3 w-3 mr-1" />
            {userLocation.jurisdiction === 'EU' ? 'GDPR Protected' : 
             userLocation.jurisdiction === 'CA' ? 'CCPA Protected' :
             'US Privacy Standards'}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rights">Your Rights</TabsTrigger>
          <TabsTrigger value="data">Data We Collect</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {privacyNotice.title}
                </CardTitle>
                <CardDescription>
                  Jurisdiction-specific privacy information for your location
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-line text-sm leading-relaxed">
                    {showCompletePolicy ? privacyNotice.content : 
                     privacyNotice.content.substring(0, 500) + '...'}
                  </div>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto mt-2"
                    onClick={() => setShowCompletePolicy(!showCompletePolicy)}
                  >
                    {showCompletePolicy ? 'Show Less' : 'Read Complete Policy'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-green-600" />
                    Data Encryption
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">AES-256</p>
                  <p className="text-xs text-gray-600">All sensitive data encrypted</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Data Retention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">7 Years</p>
                  <p className="text-xs text-gray-600">User content retention max</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-purple-600" />
                    Consent Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-600">
                    {requiresConsent ? 'Yes' : 'No'}
                  </p>
                  <p className="text-xs text-gray-600">Based on your location</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Your Rights Tab */}
        <TabsContent value="rights">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Your Privacy Rights
                </CardTitle>
                <CardDescription>
                  Rights available to you under applicable privacy laws
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {userLocation.jurisdiction === 'EU' && (
                    <>
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <Eye className="h-5 w-5 text-blue-600 mt-1" />
                        <div>
                          <h4 className="font-semibold">Right of Access</h4>
                          <p className="text-sm text-gray-600">Request a copy of your personal data we process</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <Settings className="h-5 w-5 text-green-600 mt-1" />
                        <div>
                          <h4 className="font-semibold">Right to Rectification</h4>
                          <p className="text-sm text-gray-600">Correct inaccurate or incomplete personal data</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <Trash2 className="h-5 w-5 text-red-600 mt-1" />
                        <div>
                          <h4 className="font-semibold">Right to Erasure</h4>
                          <p className="text-sm text-gray-600">Request deletion of your personal data ("right to be forgotten")</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <Download className="h-5 w-5 text-purple-600 mt-1" />
                        <div>
                          <h4 className="font-semibold">Right to Data Portability</h4>
                          <p className="text-sm text-gray-600">Receive your data in a machine-readable format</p>
                        </div>
                      </div>
                    </>
                  )}

                  {userLocation.jurisdiction === 'CA' && (
                    <>
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <Eye className="h-5 w-5 text-blue-600 mt-1" />
                        <div>
                          <h4 className="font-semibold">Right to Know</h4>
                          <p className="text-sm text-gray-600">Know what personal information we collect and how we use it</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <Trash2 className="h-5 w-5 text-red-600 mt-1" />
                        <div>
                          <h4 className="font-semibold">Right to Delete</h4>
                          <p className="text-sm text-gray-600">Request deletion of your personal information</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <AlertCircle className="h-5 w-5 text-orange-600 mt-1" />
                        <div>
                          <h4 className="font-semibold">Right to Opt-Out</h4>
                          <p className="text-sm text-gray-600">Opt-out of the sale of personal information</p>
                          <Badge variant="secondary" className="mt-1">We don't sell data</Badge>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Contact for Rights */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4" />
                      Exercise Your Rights
                    </h4>
                    <p className="text-sm text-gray-700 mb-3">
                      To exercise any of these rights, please contact us at:
                    </p>
                    <div className="space-y-1 text-sm">
                      <p><strong>Email:</strong> privacy@speechwriter.ai</p>
                      <p><strong>Response Time:</strong> 30 days maximum</p>
                      <p><strong>Verification:</strong> Identity verification may be required</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data We Collect Tab */}
        <TabsContent value="data">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Collection & Usage</CardTitle>
                <CardDescription>
                  Transparent information about what data we collect and why
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3">Account Information</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-3 border rounded">
                        <p className="font-medium text-sm">Email Address</p>
                        <p className="text-xs text-gray-600">For account authentication and communication</p>
                      </div>
                      <div className="p-3 border rounded">
                        <p className="font-medium text-sm">Display Name</p>
                        <p className="text-xs text-gray-600">For personalizing your experience</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Content You Create</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-3 border rounded">
                        <p className="font-medium text-sm">Speech Text</p>
                        <p className="text-xs text-gray-600">Content you write and generate</p>
                        <Badge variant="outline" className="mt-1">Encrypted</Badge>
                      </div>
                      <div className="p-3 border rounded">
                        <p className="font-medium text-sm">Personal Stories</p>
                        <p className="text-xs text-gray-600">Stories you add to your library</p>
                        <Badge variant="outline" className="mt-1">Encrypted</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Usage Analytics</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-3 border rounded">
                        <p className="font-medium text-sm">Feature Usage</p>
                        <p className="text-xs text-gray-600">Which features you use most</p>
                        <Badge variant="secondary" className="mt-1">Anonymized</Badge>
                      </div>
                      <div className="p-3 border rounded">
                        <p className="font-medium text-sm">Performance Data</p>
                        <p className="text-xs text-gray-600">How our AI models perform for you</p>
                        <Badge variant="secondary" className="mt-1">Anonymized</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Technical Information</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-3 border rounded">
                        <p className="font-medium text-sm">IP Address</p>
                        <p className="text-xs text-gray-600">For security and location services</p>
                        <Badge variant="destructive" className="mt-1">30 day retention</Badge>
                      </div>
                      <div className="p-3 border rounded">
                        <p className="font-medium text-sm">Browser Info</p>
                        <p className="text-xs text-gray-600">For compatibility and optimization</p>
                        <Badge variant="secondary" className="mt-1">Anonymized</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Data Security Measures
                </CardTitle>
                <CardDescription>
                  How we protect your information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        Encryption at Rest
                      </h4>
                      <p className="text-sm text-gray-600">
                        All sensitive data is encrypted using AES-256 encryption when stored in our databases.
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Lock className="h-4 w-4 text-blue-600" />
                        Encryption in Transit
                      </h4>
                      <p className="text-sm text-gray-600">
                        All data transmission uses TLS 1.3 encryption to protect data in transit.
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <UserCheck className="h-4 w-4 text-purple-600" />
                        Access Controls
                      </h4>
                      <p className="text-sm text-gray-600">
                        Row-level security ensures you can only access your own data.
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-orange-600" />
                        PII Detection
                      </h4>
                      <p className="text-sm text-gray-600">
                        Automated detection and protection of personally identifiable information.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Security Certifications</h4>
                    <div className="grid md:grid-cols-3 gap-2">
                      <Badge variant="outline" className="justify-center">SOC 2 Type II</Badge>
                      <Badge variant="outline" className="justify-center">GDPR Compliant</Badge>
                      <Badge variant="outline" className="justify-center">CCPA Compliant</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Compliance Checklist</CardTitle>
                <CardDescription>
                  Our compliance with privacy regulations and best practices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(PRIVACY_COMPLIANCE_CHECKLIST).map(([key, section]) => (
                    <div key={key}>
                      <h4 className="font-semibold mb-3">{section.title}</h4>
                      <div className="space-y-2">
                        {section.items.map((item, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cookie Information */}
            <Card>
              <CardHeader>
                <CardTitle>Cookie Usage</CardTitle>
                <CardDescription>
                  Information about cookies and tracking technologies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Essential Cookies</h4>
                    <div className="space-y-2">
                      {cookieInfo.essential.map((cookie, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <p className="font-medium text-sm">{cookie.name}</p>
                            <p className="text-xs text-gray-600">{cookie.purpose}</p>
                          </div>
                          <Badge variant="outline">{cookie.expiry}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {cookieInfo.analytics.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Analytics Cookies</h4>
                      <div className="space-y-2">
                        {cookieInfo.analytics.map((cookie, index) => (
                          <div key={index} className="flex justify-between items-center p-2 border rounded">
                            <div>
                              <p className="font-medium text-sm">{cookie.name}</p>
                              <p className="text-xs text-gray-600">{cookie.purpose}</p>
                            </div>
                            <Badge variant="secondary">{cookie.expiry}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Contact Footer */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Privacy Questions?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            If you have any questions about this privacy policy or our data practices, please contact us:
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Email:</strong> privacy@speechwriter.ai</p>
              <p><strong>Data Protection Officer:</strong> dpo@speechwriter.ai</p>
            </div>
            <div>
              <p><strong>Response Time:</strong> 30 days maximum</p>
              <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}