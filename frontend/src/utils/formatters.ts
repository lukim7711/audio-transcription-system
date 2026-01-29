// Formatting utilities for Audio Transcription System

/**
 * Format duration in seconds to human-readable string
 * Examples:
 *   65 -> "1:05"
 *   3665 -> "1:01:05"
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 0) {
    return '0:00';
  }
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * Format Unix timestamp to local date/time string
 */
export const formatTimestamp = (unix: number): string => {
  if (!unix) {
    return 'Unknown';
  }
  
  const date = new Date(unix * 1000);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format timestamp for SRT subtitle format
 * Example: 65.5 -> "00:01:05,500"
 */
export const formatTimestampSRT = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

/**
 * Format file size in bytes to human-readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format processing time to human-readable string
 * Examples:
 *   45 -> "45 seconds"
 *   125 -> "2 minutes"
 *   3665 -> "1 hour 1 minute"
 */
export const formatProcessingTime = (seconds: number): string => {
  if (!seconds || seconds < 0) {
    return '0 seconds';
  }
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const parts: string[] = [];
  
  if (h > 0) {
    parts.push(`${h} hour${h > 1 ? 's' : ''}`);
  }
  if (m > 0) {
    parts.push(`${m} minute${m > 1 ? 's' : ''}`);
  }
  if (s > 0 && h === 0) { // Only show seconds if less than 1 hour
    parts.push(`${s} second${s > 1 ? 's' : ''}`);
  }
  
  return parts.join(' ') || '0 seconds';
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (unix: number): string => {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unix;
  
  if (diff < 60) {
    return 'Just now';
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatTimestamp(unix);
  }
};

/**
 * Truncate text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
};