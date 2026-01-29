// API client utilities for Audio Transcription System

import {
  ApiResponse,
  Job,
  JobSubmitRequest,
  JobSubmitResponse,
  JobHistoryResponse,
  TranscriptDocument,
} from '../types';

const API_BASE = '/api';

/**
 * Generic API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      throw new ApiError(
        data.error?.message || 'API request failed',
        data.error?.code,
        data.error?.details
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or parsing error
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred',
      'NETWORK_ERROR'
    );
  }
}

/**
 * Submit a new transcription job
 */
export async function submitJob(
  data: JobSubmitRequest
): Promise<ApiResponse<JobSubmitResponse>> {
  return fetchApi<JobSubmitResponse>('/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get job status by ID
 */
export async function getJobStatus(jobId: string): Promise<ApiResponse<Job>> {
  return fetchApi<Job>(`/status/${jobId}`);
}

/**
 * Get job history with pagination
 */
export async function getJobHistory(
  limit = 20,
  offset = 0
): Promise<ApiResponse<JobHistoryResponse>> {
  return fetchApi<JobHistoryResponse>(
    `/history?limit=${limit}&offset=${offset}`
  );
}

/**
 * Fetch transcript document from R2 URL
 */
export async function getTranscript(url: string): Promise<TranscriptDocument> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transcript: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to fetch transcript',
      'FETCH_ERROR'
    );
  }
}

/**
 * Download file from URL
 */
export function downloadFile(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Retry function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof ApiError && error.code?.startsWith('INVALID')) {
        throw error;
      }
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Poll job status until completion or failure
 */
export async function pollJobStatus(
  jobId: string,
  onUpdate?: (job: Job) => void,
  interval = 3000,
  maxAttempts = 600 // 30 minutes max
): Promise<Job> {
  let attempts = 0;
  
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;
        
        if (attempts > maxAttempts) {
          reject(new ApiError('Polling timeout exceeded', 'TIMEOUT'));
          return;
        }
        
        const response = await getJobStatus(jobId);
        const job = response.data!;
        
        if (onUpdate) {
          onUpdate(job);
        }
        
        if (job.status === 'completed' || job.status === 'failed') {
          resolve(job);
        } else {
          setTimeout(poll, interval);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    poll();
  });
}