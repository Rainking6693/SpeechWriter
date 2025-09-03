/**
 * Data Encryption and PII Protection Utilities
 * 
 * Provides encryption, hashing, and PII minimization functions
 * to protect sensitive user data.
 */

import crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is 16 bytes
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// Get encryption key from environment (should be 32 bytes base64 encoded)
const getEncryptionKey = (): Buffer => {
  const keyString = process.env.DATA_ENCRYPTION_KEY;
  if (!keyString) {
    throw new Error('DATA_ENCRYPTION_KEY environment variable is required');
  }
  
  try {
    return Buffer.from(keyString, 'base64');
  } catch (error) {
    throw new Error('Invalid DATA_ENCRYPTION_KEY format - must be base64 encoded');
  }
};

// Derive key using PBKDF2 for additional security
const deriveKey = (password: Buffer, salt: Buffer): Buffer => {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
};

/**
 * Encrypt sensitive data
 */
export function encryptData(plaintext: string): {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
} {
  try {
    const masterKey = getEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(masterKey, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipherGCM(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Data encryption failed');
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
}): string {
  try {
    const masterKey = getEncryptionKey();
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const key = deriveKey(masterKey, salt);
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    
    const decipher = crypto.createDecipherGCM(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Data decryption failed');
  }
}

/**
 * Hash sensitive data for search/comparison (one-way)
 */
export function hashData(data: string, purpose: string = 'general'): string {
  try {
    const masterKey = getEncryptionKey();
    const salt = Buffer.from(`${purpose}_salt_${data.length}`, 'utf8');
    
    // Use HMAC for consistent hashing
    const hmac = crypto.createHmac('sha256', masterKey);
    hmac.update(data);
    hmac.update(salt);
    
    return hmac.digest('hex');
  } catch (error) {
    console.error('Hashing failed:', error);
    throw new Error('Data hashing failed');
  }
}

/**
 * PII Detection and Classification
 */
export interface PIIClassification {
  type: 'email' | 'phone' | 'ssn' | 'credit_card' | 'ip_address' | 'none';
  confidence: number;
  value?: string;
}

export function classifyPII(text: string): PIIClassification[] {
  const classifications: PIIClassification[] = [];
  
  // Email detection
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = text.match(emailRegex);
  if (emailMatches) {
    emailMatches.forEach(email => {
      classifications.push({
        type: 'email',
        confidence: 0.95,
        value: email,
      });
    });
  }
  
  // Phone number detection (US format)
  const phoneRegex = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches) {
    phoneMatches.forEach(phone => {
      classifications.push({
        type: 'phone',
        confidence: 0.85,
        value: phone,
      });
    });
  }
  
  // SSN detection
  const ssnRegex = /\b(?!000|666)[0-8][0-9]{2}-(?!00)[0-9]{2}-(?!0000)[0-9]{4}\b/g;
  const ssnMatches = text.match(ssnRegex);
  if (ssnMatches) {
    ssnMatches.forEach(ssn => {
      classifications.push({
        type: 'ssn',
        confidence: 0.9,
        value: ssn,
      });
    });
  }
  
  // Credit card detection (basic)
  const ccRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g;
  const ccMatches = text.match(ccRegex);
  if (ccMatches) {
    ccMatches.forEach(cc => {
      classifications.push({
        type: 'credit_card',
        confidence: 0.8,
        value: cc,
      });
    });
  }
  
  // IP address detection
  const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
  const ipMatches = text.match(ipRegex);
  if (ipMatches) {
    ipMatches.forEach(ip => {
      classifications.push({
        type: 'ip_address',
        confidence: 0.7,
        value: ip,
      });
    });
  }
  
  return classifications;
}

/**
 * Sanitize text by removing or masking PII
 */
export function sanitizeText(
  text: string, 
  action: 'mask' | 'remove' | 'hash' = 'mask'
): {
  sanitized: string;
  piiFound: PIIClassification[];
} {
  const piiFound = classifyPII(text);
  let sanitized = text;
  
  piiFound.forEach(pii => {
    if (!pii.value) return;
    
    switch (action) {
      case 'mask':
        const maskedValue = pii.value.charAt(0) + '*'.repeat(Math.max(0, pii.value.length - 2)) + pii.value.slice(-1);
        sanitized = sanitized.replace(new RegExp(escapeRegExp(pii.value), 'g'), maskedValue);
        break;
        
      case 'remove':
        sanitized = sanitized.replace(new RegExp(escapeRegExp(pii.value), 'g'), `[${pii.type.toUpperCase()}_REMOVED]`);
        break;
        
      case 'hash':
        const hashedValue = hashData(pii.value, pii.type);
        sanitized = sanitized.replace(new RegExp(escapeRegExp(pii.value), 'g'), `[${pii.type.toUpperCase()}_${hashedValue.substring(0, 8)}]`);
        break;
    }
  });
  
  return {
    sanitized,
    piiFound,
  };
}

// Helper function to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Data retention utilities
 */
export interface RetentionPolicy {
  retentionPeriodDays: number;
  dataType: string;
  encryptionRequired: boolean;
  autoDelete: boolean;
}

export const DEFAULT_RETENTION_POLICIES: Record<string, RetentionPolicy> = {
  speech_content: {
    retentionPeriodDays: 2555, // 7 years for user content
    dataType: 'user_content',
    encryptionRequired: true,
    autoDelete: false, // User-controlled deletion
  },
  analytics_data: {
    retentionPeriodDays: 1095, // 3 years for analytics
    dataType: 'analytics',
    encryptionRequired: false,
    autoDelete: true,
  },
  model_runs: {
    retentionPeriodDays: 365, // 1 year for model execution data
    dataType: 'system_data',
    encryptionRequired: false,
    autoDelete: true,
  },
  telemetry: {
    retentionPeriodDays: 90, // 90 days for telemetry
    dataType: 'telemetry',
    encryptionRequired: false,
    autoDelete: true,
  },
  error_logs: {
    retentionPeriodDays: 30, // 30 days for error logs
    dataType: 'system_logs',
    encryptionRequired: false,
    autoDelete: true,
  },
};

/**
 * Check if data should be deleted based on retention policy
 */
export function shouldDeleteData(
  createdAt: Date,
  dataType: string
): boolean {
  const policy = DEFAULT_RETENTION_POLICIES[dataType];
  if (!policy || !policy.autoDelete) {
    return false;
  }
  
  const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays > policy.retentionPeriodDays;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate that encryption key is properly configured
 */
export function validateEncryptionSetup(): boolean {
  try {
    const key = getEncryptionKey();
    if (key.length !== KEY_LENGTH) {
      console.error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 8} bits)`);
      return false;
    }
    
    // Test encryption/decryption
    const testData = 'test_encryption_setup';
    const encrypted = encryptData(testData);
    const decrypted = decryptData(encrypted);
    
    if (decrypted !== testData) {
      console.error('Encryption test failed - data integrity issue');
      return false;
    }
    
    console.log('✅ Encryption setup validated successfully');
    return true;
  } catch (error) {
    console.error('❌ Encryption setup validation failed:', error);
    return false;
  }
}