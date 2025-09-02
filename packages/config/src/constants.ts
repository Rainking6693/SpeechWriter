// Application constants
export const APP_NAME = 'SpeechWriter';
export const APP_DESCRIPTION = 'AI-powered speech writing platform';

// API endpoints
export const API_ROUTES = {
  GENERATE_SPEECH: '/api/generate-speech',
  ANALYZE_AUDIENCE: '/api/analyze-audience',
  SPEECH_SUGGESTIONS: '/api/speech-suggestions',
} as const;

// Speech types
export const SPEECH_TYPES = {
  WEDDING: 'wedding',
  BUSINESS: 'business',
  GRADUATION: 'graduation',
  POLITICAL: 'political',
  MEMORIAL: 'memorial',
  BIRTHDAY: 'birthday',
  RETIREMENT: 'retirement',
  CONFERENCE: 'conference',
} as const;

// Speech tones
export const SPEECH_TONES = {
  FORMAL: 'formal',
  INFORMAL: 'informal',
  HUMOROUS: 'humorous',
  INSPIRATIONAL: 'inspirational',
  EMOTIONAL: 'emotional',
  PROFESSIONAL: 'professional',
} as const;

// UI Constants
export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px',
} as const;

// Limits
export const LIMITS = {
  MAX_SPEECH_LENGTH: 5000,
  MIN_SPEECH_LENGTH: 100,
  MAX_AUDIENCE_SIZE: 10000,
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
} as const;