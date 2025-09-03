import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { userPreferences, users, JurisdictionType, EthicsMode } from '@speechwriter/database';

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(connectionString);
const db = drizzle(sql);

interface UserPreferencesRequest {
  jurisdiction?: JurisdictionType;
  ethicsMode?: EthicsMode;
  contentFilteringEnabled?: boolean;
  politicalContentWarnings?: boolean;
  academicHonestyAccepted?: boolean;
  exportDisclaimerAccepted?: boolean;
  complianceSettings?: Record<string, any>;
}

interface UserPreferencesResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Jurisdiction detection based on IP or user agent
function detectJurisdiction(headers: Record<string, string | undefined>): JurisdictionType {
  const country = headers['cf-ipcountry']; // Cloudflare country header
  const userAgent = headers['user-agent'] || '';
  
  if (country) {
    switch (country.toLowerCase()) {
      case 'us':
        return 'US';
      case 'gb':
      case 'uk':
        return 'UK';
      case 'ca':
        return 'CA';
      case 'au':
        return 'AU';
      default:
        // EU countries
        if (['de', 'fr', 'it', 'es', 'nl', 'be', 'at', 'se', 'dk', 'fi', 'no', 'pl', 'ie', 'pt', 'cz', 'hu', 'ro', 'bg', 'hr', 'sk', 'si', 'lt', 'lv', 'ee', 'cy', 'mt', 'lu', 'gr'].includes(country.toLowerCase())) {
          return 'EU';
        }
        return 'OTHER';
    }
  }
  
  // Fallback detection
  if (userAgent.includes('Chrome') && userAgent.includes('US')) return 'US';
  if (userAgent.includes('Safari') && userAgent.includes('UK')) return 'UK';
  
  return 'US'; // Default to US
}

// Get compliance requirements based on jurisdiction and ethics mode
function getComplianceRequirements(jurisdiction: JurisdictionType, ethicsMode: EthicsMode) {
  const requirements = {
    exportDisclaimer: true,
    academicHonesty: false,
    politicalWarnings: false,
    contentFiltering: false,
    disclaimerText: '',
  };

  // Jurisdiction-specific requirements
  switch (jurisdiction) {
    case 'EU':
      requirements.contentFiltering = true;
      requirements.disclaimerText = 'This content was generated with AI assistance and is subject to EU AI regulations.';
      break;
    case 'UK':
      requirements.contentFiltering = true;
      requirements.disclaimerText = 'This content was generated with AI assistance and should be reviewed for accuracy.';
      break;
    case 'US':
      requirements.disclaimerText = 'This content was generated with AI assistance. Verify accuracy before use.';
      break;
    default:
      requirements.disclaimerText = 'This content was generated with AI assistance. Please review for accuracy and compliance with local regulations.';
  }

  // Ethics mode-specific requirements
  switch (ethicsMode) {
    case 'academic':
      requirements.academicHonesty = true;
      requirements.disclaimerText += ' Academic use requires proper attribution and citation.';
      break;
    case 'political':
      requirements.politicalWarnings = true;
      requirements.contentFiltering = true;
      requirements.disclaimerText += ' Political content has been reviewed for potential bias and factual accuracy.';
      break;
    case 'corporate':
      requirements.disclaimerText += ' Corporate use should include legal review for compliance with company policies.';
      break;
  }

  return requirements;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Extract user ID from Authorization header (simplified for demo)
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'Unauthorized' }),
      };
    }

    // In real implementation, validate JWT and extract user ID
    // For now, assuming user ID is passed in the token (simplified)
    const userId = 'user-id-placeholder'; // Replace with actual JWT validation

    const response: UserPreferencesResponse = { success: false };

    switch (event.httpMethod) {
      case 'GET':
        // Get user preferences
        try {
          let preferences = await db
            .select()
            .from(userPreferences)
            .where(eq(userPreferences.userId, userId))
            .limit(1);

          if (preferences.length === 0) {
            // Create default preferences with detected jurisdiction
            const detectedJurisdiction = detectJurisdiction(event.headers);
            const complianceReqs = getComplianceRequirements(detectedJurisdiction, 'standard');
            
            const newPreferences = await db
              .insert(userPreferences)
              .values({
                userId,
                jurisdiction: detectedJurisdiction,
                jurisdictionConfirmed: false,
                ethicsMode: 'standard',
                complianceSettings: complianceReqs,
              })
              .returning();

            preferences = newPreferences;
          }

          response.success = true;
          response.data = {
            ...preferences[0],
            complianceRequirements: getComplianceRequirements(
              preferences[0].jurisdiction as JurisdictionType,
              preferences[0].ethicsMode as EthicsMode
            ),
          };
        } catch (error) {
          console.error('Error fetching preferences:', error);
          response.error = 'Failed to fetch user preferences';
        }
        break;

      case 'PUT':
        // Update user preferences
        try {
          if (!event.body) {
            response.error = 'Request body is required';
            break;
          }

          const updates: UserPreferencesRequest = JSON.parse(event.body);
          
          // Validate jurisdiction and ethics mode
          if (updates.jurisdiction && !['US', 'EU', 'UK', 'CA', 'AU', 'OTHER'].includes(updates.jurisdiction)) {
            response.error = 'Invalid jurisdiction';
            break;
          }

          if (updates.ethicsMode && !['standard', 'academic', 'political', 'corporate'].includes(updates.ethicsMode)) {
            response.error = 'Invalid ethics mode';
            break;
          }

          const updateData: any = {
            ...updates,
            updatedAt: new Date(),
          };

          // Handle academic honesty acceptance
          if (updates.academicHonestyAccepted) {
            updateData.academicHonestyAcceptedAt = new Date();
          }

          // Update compliance settings if jurisdiction or ethics mode changed
          if (updates.jurisdiction || updates.ethicsMode) {
            const currentPrefs = await db
              .select()
              .from(userPreferences)
              .where(eq(userPreferences.userId, userId))
              .limit(1);

            if (currentPrefs.length > 0) {
              const newJurisdiction = updates.jurisdiction || currentPrefs[0].jurisdiction as JurisdictionType;
              const newEthicsMode = updates.ethicsMode || currentPrefs[0].ethicsMode as EthicsMode;
              updateData.complianceSettings = getComplianceRequirements(newJurisdiction, newEthicsMode);
              
              // Confirm jurisdiction if explicitly set
              if (updates.jurisdiction) {
                updateData.jurisdictionConfirmed = true;
              }
            }
          }

          const updatedPreferences = await db
            .update(userPreferences)
            .set(updateData)
            .where(eq(userPreferences.userId, userId))
            .returning();

          if (updatedPreferences.length === 0) {
            // Create if doesn't exist
            const newPreferences = await db
              .insert(userPreferences)
              .values({
                userId,
                ...updateData,
              })
              .returning();

            response.success = true;
            response.data = newPreferences[0];
          } else {
            response.success = true;
            response.data = updatedPreferences[0];
          }
        } catch (error) {
          console.error('Error updating preferences:', error);
          response.error = 'Failed to update user preferences';
        }
        break;

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ success: false, error: 'Method not allowed' }),
        };
    }

    return {
      statusCode: response.success ? 200 : 400,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
    };
  }
};