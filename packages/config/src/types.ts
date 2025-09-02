import { SPEECH_TYPES, SPEECH_TONES } from './constants';

// Speech related types
export type SpeechType = typeof SPEECH_TYPES[keyof typeof SPEECH_TYPES];
export type SpeechTone = typeof SPEECH_TONES[keyof typeof SPEECH_TONES];

export interface SpeechRequest {
  type: SpeechType;
  tone: SpeechTone;
  topic: string;
  duration: number; // in minutes
  audience: AudienceInfo;
  keyPoints?: string[];
  personalDetails?: Record<string, string>;
}

export interface AudienceInfo {
  size: number;
  demographics: string;
  relationship: string; // e.g., "family", "colleagues", "students"
  context: string; // e.g., "wedding reception", "board meeting"
}

export interface GeneratedSpeech {
  id: string;
  content: string;
  metadata: {
    wordCount: number;
    estimatedDuration: number;
    confidence: number;
    suggestions?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  timestamp: string;
}

// User preferences (for future use)
export interface UserPreferences {
  defaultTone: SpeechTone;
  preferredLength: number;
  language: string;
  themes: {
    darkMode: boolean;
    colorScheme: string;
  };
}

// Component props types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}