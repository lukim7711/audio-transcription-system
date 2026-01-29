// Auto-generated TypeScript types for Audio Transcription System
// DO NOT EDIT MANUALLY - Generated from machine-readable specification

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ModelSize = 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';

export type ISOLanguage = 
  | 'auto' 
  | 'en' 
  | 'id' 
  | 'es' 
  | 'fr' 
  | 'de' 
  | 'it' 
  | 'zh' 
  | 'ja' 
  | 'ko' 
  | 'ar' 
  | 'ru' 
  | 'hi';

export type ErrorCode =
  | 'INVALID_URL'
  | 'VIDEO_NOT_FOUND'
  | 'VIDEO_TOO_LONG'
  | 'PROCESSING_TIMEOUT'
  | 'QUOTA_EXCEEDED'
  | 'DOWNLOAD_FAILED'
  | 'TRANSCRIPTION_FAILED'
  | 'UPLOAD_FAILED'
  | 'WEBHOOK_INVALID'
  | 'DATABASE_ERROR';

// ============================================================================
// MAIN ENTITIES
// ============================================================================

export interface Job {
  id: string;
  video_url: string;
  model_size: ModelSize;
  language: ISOLanguage;
  status: JobStatus;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
  transcript_url?: string;
  audio_url?: string;
  srt_url?: string;
  txt_url?: string;
  video_title?: string;
  video_duration?: number; // in seconds
  processing_time?: number; // in seconds
  error_code?: ErrorCode;
  error_message?: string;
  error_details?: any;
}

export interface TranscriptWord {
  word: string;
  start: number; // seconds with 2 decimal precision
  end: number; // seconds with 2 decimal precision
  probability?: number; // 0-1 confidence score
}

export interface TranscriptSegment {
  id: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
  words: TranscriptWord[];
}

export interface TranscriptDocument {
  text: string; // Full transcript text
  segments: TranscriptSegment[];
  language: ISOLanguage;
  duration: number; // in seconds
  model: ModelSize;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: number;
}

export interface JobSubmitRequest {
  video_url: string;
  model_size?: ModelSize;
  language?: ISOLanguage;
}

export interface JobSubmitResponse {
  job_id: string;
  status: JobStatus;
  created_at: number;
}

export interface JobStatusResponse extends Job {}

export interface JobHistoryResponse {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
}

export interface WebhookPayload {
  job_id: string;
  status: 'completed' | 'failed';
  // For completed jobs
  transcript_url?: string;
  audio_url?: string;
  srt_url?: string;
  txt_url?: string;
  video_title?: string;
  video_duration?: number;
  processing_time: number;
  // For failed jobs
  error_code?: ErrorCode;
  error_message?: string;
  error_details?: any;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface ModelSizeOption extends SelectOption {
  value: ModelSize;
  description: string;
}

export interface LanguageOption extends SelectOption {
  value: ISOLanguage;
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface JobFormProps {
  onSubmitSuccess?: (jobId: string) => void;
}

export interface StatusPageProps {
  jobId: string;
}

export interface TranscriptPlayerProps {
  job: Job;
  transcript: TranscriptDocument;
}

export interface AudioPlayerProps {
  src: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}

export interface TranscriptViewerProps {
  transcript: TranscriptDocument;
  activeWordIndex: number | null;
  onWordClick: (startTime: number) => void;
}

export interface WordHighlightProps {
  word: TranscriptWord;
  isActive: boolean;
  onClick: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const MODEL_SIZE_OPTIONS: ModelSizeOption[] = [
  { value: 'tiny', label: 'Tiny', description: 'Fastest, lowest accuracy' },
  { value: 'base', label: 'Base', description: 'Fast, low accuracy' },
  { value: 'small', label: 'Small', description: 'Balanced' },
  { value: 'medium', label: 'Medium', description: 'Recommended - good balance' },
  { value: 'large-v3', label: 'Large v3', description: 'Slowest, best accuracy' },
];

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'auto', label: 'Auto Detect' },
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Indonesian' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ru', label: 'Russian' },
  { value: 'hi', label: 'Hindi' },
];

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const POLLING_INTERVAL = 3000; // 3 seconds

export const MAX_VIDEO_DURATION = 7200; // 2 hours in seconds