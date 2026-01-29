// Validation utilities for Audio Transcription System

import { ModelSize, ISOLanguage } from '../types';

/**
 * Validates YouTube URL format
 * Supports both youtube.com and youtu.be formats
 */
export const validateYouTubeUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  const pattern = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
  return pattern.test(url);
};

/**
 * Validates model size enum
 */
export const validateModelSize = (size: string): size is ModelSize => {
  const validSizes: ModelSize[] = ['tiny', 'base', 'small', 'medium', 'large-v3'];
  return validSizes.includes(size as ModelSize);
};

/**
 * Validates language code
 */
export const validateLanguage = (lang: string): lang is ISOLanguage => {
  const validLanguages: ISOLanguage[] = [
    'auto', 'en', 'id', 'es', 'fr', 'de', 'it', 'zh', 'ja', 'ko', 'ar', 'ru', 'hi'
  ];
  return validLanguages.includes(lang as ISOLanguage);
};

/**
 * Extracts YouTube video ID from URL
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  if (!validateYouTubeUrl(url)) {
    return null;
  }
  
  // Handle youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    return watchMatch[1];
  }
  
  // Handle youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) {
    return shortMatch[1];
  }
  
  return null;
};

/**
 * Validates UUID format
 */
export const validateUUID = (uuid: string): boolean => {
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return pattern.test(uuid);
};

/**
 * Gets user-friendly error message for validation
 */
export const getValidationError = (field: string, value: any): string | null => {
  switch (field) {
    case 'video_url':
      if (!value) {
        return 'YouTube URL is required';
      }
      if (!validateYouTubeUrl(value)) {
        return 'Please enter a valid YouTube URL (e.g., https://youtube.com/watch?v=...)';
      }
      break;
    
    case 'model_size':
      if (!validateModelSize(value)) {
        return 'Invalid model size selected';
      }
      break;
    
    case 'language':
      if (!validateLanguage(value)) {
        return 'Invalid language code selected';
      }
      break;
  }
  
  return null;
};