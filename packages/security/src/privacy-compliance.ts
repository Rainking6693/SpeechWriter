/**
 * Privacy Compliance Utilities
 * 
 * Handles GDPR, CCPA, and other privacy regulation compliance
 * including consent management and privacy controls.
 */

export interface ConsentRecord {
  userId: string;
  consentType: 'analytics' | 'marketing' | 'personalization' | 'ai_processing';
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  jurisdiction: 'EU' | 'CA' | 'US' | 'OTHER';
}

export interface PrivacySettings {
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  aiProcessing: boolean;
  dataRetentionOptOut: boolean;
  thirdPartySharing: boolean;
}

export interface DataSubjectRequest {
  userId: string;
  requestType: 'access' | 'deletion' | 'portability' | 'rectification' | 'restriction';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  submittedAt: Date;
  completedAt?: Date;
  reason?: string;
}

/**
 * Privacy Compliance Service
 */
export class PrivacyComplianceService {
  private static readonly GDPR_COUNTRIES = [
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
    'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
    'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
  ];

  private static readonly CCPA_STATES = ['CA']; // California

  /**
   * Determine user's jurisdiction based on IP or location
   */
  static determineJurisdiction(
    countryCode?: string,
    stateCode?: string,
    ipAddress?: string
  ): 'EU' | 'CA' | 'US' | 'OTHER' {
    if (countryCode) {
      if (this.GDPR_COUNTRIES.includes(countryCode.toUpperCase())) {
        return 'EU';
      }
      
      if (countryCode.toUpperCase() === 'US' && stateCode) {
        if (this.CCPA_STATES.includes(stateCode.toUpperCase())) {
          return 'CA';
        }
        return 'US';
      }
    }
    
    // TODO: IP-based geolocation if needed
    // For now, default to OTHER for unknown jurisdictions
    return 'OTHER';
  }

  /**
   * Check if user needs explicit consent based on jurisdiction
   */
  static requiresExplicitConsent(jurisdiction: string): boolean {
    return jurisdiction === 'EU' || jurisdiction === 'CA';
  }

  /**
   * Generate privacy notice text based on jurisdiction
   */
  static generatePrivacyNotice(jurisdiction: 'EU' | 'CA' | 'US' | 'OTHER'): {
    title: string;
    content: string;
    consentRequired: boolean;
  } {
    const baseNotice = {
      analytics: 'We collect usage analytics to improve our service',
      marketing: 'We may send you promotional communications about our service',
      personalization: 'We use your data to personalize your experience',
      aiProcessing: 'We process your content using AI models to generate speeches',
    };

    switch (jurisdiction) {
      case 'EU':
        return {
          title: 'Privacy Notice (GDPR)',
          content: `
In compliance with the General Data Protection Regulation (GDPR), we inform you about our data processing activities:

**Data We Collect:**
- Speech content you create and edit
- Account information (email, name)
- Usage analytics and performance metrics
- Technical data (IP address, browser information)

**Legal Basis for Processing:**
- Contract performance (providing speech writing services)
- Legitimate interest (service improvement and analytics)
- Consent (marketing communications)

**Your Rights:**
- Right of access to your personal data
- Right to rectification of inaccurate data
- Right to erasure ("right to be forgotten")
- Right to data portability
- Right to restrict processing
- Right to object to processing
- Right to withdraw consent at any time

**Data Retention:**
We retain your data as outlined in our retention policy, with automatic deletion after specified periods.

**International Transfers:**
Your data may be transferred outside the EU with appropriate safeguards in place.
          `,
          consentRequired: true,
        };

      case 'CA':
        return {
          title: 'Privacy Notice (CCPA)',
          content: `
In compliance with the California Consumer Privacy Act (CCPA), we provide the following information:

**Personal Information We Collect:**
- Identifiers (email address, account ID)
- Commercial information (subscription details)
- Internet activity (usage patterns, analytics)
- Content you create (speech text, notes)

**Business Purpose for Collection:**
- Providing and improving our speech writing service
- Customer service and support
- Analytics and service optimization

**Your California Privacy Rights:**
- Right to know what personal information we collect
- Right to delete personal information
- Right to opt-out of the sale of personal information
- Right to non-discrimination for exercising your rights

**We Do Not Sell Personal Information**
We do not sell your personal information to third parties.

**Contact Us:**
To exercise your rights, contact us at privacy@speechwriter.ai
          `,
          consentRequired: true,
        };

      case 'US':
        return {
          title: 'Privacy Notice',
          content: `
**Information We Collect:**
We collect information you provide directly to us and information about your use of our service.

**How We Use Information:**
- To provide and improve our speech writing service
- To communicate with you about your account
- To analyze usage patterns and optimize performance

**Information Sharing:**
We do not sell or rent your personal information to third parties.

**Data Security:**
We implement appropriate security measures to protect your information.

**Contact Us:**
If you have questions about this privacy notice, contact us at privacy@speechwriter.ai
          `,
          consentRequired: false,
        };

      default:
        return {
          title: 'Privacy Notice',
          content: `
We are committed to protecting your privacy and handling your data responsibly.

**Data Collection and Use:**
We collect and use your information to provide our speech writing service and improve your experience.

**Data Protection:**
We implement security measures to protect your information and respect your privacy choices.

**Contact:**
For privacy questions, contact us at privacy@speechwriter.ai
          `,
          consentRequired: false,
        };
    }
  }

  /**
   * Validate consent record
   */
  static validateConsent(consent: ConsentRecord): boolean {
    const now = Date.now();
    const consentAge = now - consent.timestamp.getTime();
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year

    // Consent expires after 1 year under GDPR
    if (consent.jurisdiction === 'EU' && consentAge > maxAge) {
      return false;
    }

    return consent.granted;
  }

  /**
   * Generate data export for user (GDPR Article 20, CCPA right to know)
   */
  static async generateDataExport(userData: any): Promise<{
    format: 'json' | 'csv';
    data: string;
    filename: string;
    size: number;
  }> {
    const exportData = {
      accountInfo: {
        email: userData.email,
        name: userData.name,
        createdAt: userData.createdAt,
        subscriptionPlan: userData.subscriptionPlan,
      },
      speeches: userData.speeches || [],
      personas: userData.personas || [],
      stories: userData.stories || [],
      analytics: userData.analytics || [],
      consentHistory: userData.consentHistory || [],
      exportedAt: new Date().toISOString(),
      dataRetentionPolicies: userData.retentionPolicies || {},
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    const filename = `speechwriter_data_export_${new Date().toISOString().split('T')[0]}.json`;

    return {
      format: 'json',
      data: jsonData,
      filename,
      size: Buffer.byteLength(jsonData, 'utf8'),
    };
  }

  /**
   * Privacy impact assessment helper
   */
  static assessPrivacyImpact(processingActivity: {
    dataTypes: string[];
    purposes: string[];
    recipients: string[];
    retention: string;
    volume: 'low' | 'medium' | 'high';
  }): {
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
    requiresDPIA: boolean; // Data Protection Impact Assessment
  } {
    let riskScore = 0;
    const recommendations: string[] = [];

    // Assess data types
    const sensitiveData = ['email', 'phone', 'location', 'biometric'];
    const hasSensitiveData = processingActivity.dataTypes.some(type => 
      sensitiveData.includes(type)
    );
    
    if (hasSensitiveData) {
      riskScore += 2;
      recommendations.push('Implement enhanced security for sensitive data types');
    }

    // Assess volume
    if (processingActivity.volume === 'high') {
      riskScore += 2;
      recommendations.push('Consider data minimization strategies');
    }

    // Assess purposes
    if (processingActivity.purposes.includes('ai_processing')) {
      riskScore += 1;
      recommendations.push('Ensure transparency about AI processing');
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore <= 1) {
      riskLevel = 'low';
    } else if (riskScore <= 3) {
      riskLevel = 'medium';
      recommendations.push('Regular privacy compliance reviews recommended');
    } else {
      riskLevel = 'high';
      recommendations.push('Conduct formal Data Protection Impact Assessment');
    }

    // GDPR requires DPIA for high-risk processing
    const requiresDPIA = riskLevel === 'high' || hasSensitiveData;

    return {
      riskLevel,
      recommendations,
      requiresDPIA,
    };
  }

  /**
   * Cookie consent management
   */
  static generateCookieConsent(jurisdiction: string): {
    essential: { name: string; purpose: string; expiry: string }[];
    analytics: { name: string; purpose: string; expiry: string }[];
    marketing: { name: string; purpose: string; expiry: string }[];
    consentRequired: boolean;
  } {
    return {
      essential: [
        {
          name: 'session_id',
          purpose: 'Maintain user session and authentication',
          expiry: 'Session',
        },
        {
          name: 'csrf_token',
          purpose: 'Prevent cross-site request forgery attacks',
          expiry: 'Session',
        },
      ],
      analytics: [
        {
          name: 'posthog_session',
          purpose: 'Analytics and product improvement',
          expiry: '30 days',
        },
      ],
      marketing: [
        {
          name: 'marketing_preferences',
          purpose: 'Remember marketing communication preferences',
          expiry: '1 year',
        },
      ],
      consentRequired: jurisdiction === 'EU',
    };
  }
}

/**
 * Privacy checklist for compliance validation
 */
export const PRIVACY_COMPLIANCE_CHECKLIST = {
  dataCollection: {
    title: 'Data Collection',
    items: [
      'Privacy notice clearly describes data collection',
      'Legal basis for processing is identified',
      'Data minimization principle is applied',
      'Consent is obtained where required',
      'Special category data handling is compliant',
    ],
  },
  dataProcessing: {
    title: 'Data Processing',
    items: [
      'Processing is limited to stated purposes',
      'Data accuracy is maintained',
      'Security measures are implemented',
      'Staff training on privacy compliance is current',
      'Third-party processors have adequate contracts',
    ],
  },
  dataSubjectRights: {
    title: 'Data Subject Rights',
    items: [
      'Access request procedure is documented',
      'Deletion request handling is automated',
      'Data portability is supported',
      'Rectification process is available',
      'Complaint handling procedure exists',
    ],
  },
  dataRetention: {
    title: 'Data Retention',
    items: [
      'Retention policies are documented and enforced',
      'Automated deletion is implemented where appropriate',
      'Regular data audits are conducted',
      'Backup data retention is addressed',
      'Legal hold procedures exist',
    ],
  },
  internationalTransfers: {
    title: 'International Transfers',
    items: [
      'Transfer mechanisms are identified',
      'Adequacy decisions are documented',
      'Standard contractual clauses are in place',
      'Transfer impact assessments completed',
      'Local storage options are available',
    ],
  },
};