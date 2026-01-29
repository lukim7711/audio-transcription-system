-- Audio Transcription System Database Schema
-- Platform: Cloudflare D1 (SQLite)
-- Version: 1.0.0

-- Drop existing tables and triggers (for clean setup)
DROP TABLE IF EXISTS jobs;
DROP TRIGGER IF EXISTS update_jobs_timestamp;

-- Jobs table: Stores all transcription jobs
CREATE TABLE IF NOT EXISTS jobs (
  -- Primary identification
  id TEXT PRIMARY KEY NOT NULL,
  
  -- Job parameters
  video_url TEXT NOT NULL,
  model_size TEXT NOT NULL CHECK(model_size IN ('tiny','base','small','medium','large-v3')),
  language TEXT NOT NULL DEFAULT 'auto',
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
  
  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  
  -- Results (populated after completion)
  transcript_url TEXT,
  audio_url TEXT,
  srt_url TEXT,
  txt_url TEXT,
  
  -- Video metadata
  video_title TEXT,
  video_duration INTEGER, -- in seconds
  processing_time INTEGER, -- in seconds
  
  -- Error information (for failed jobs)
  error_code TEXT,
  error_message TEXT,
  error_details TEXT -- JSON string
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_jobs_status 
  ON jobs(status);

CREATE INDEX IF NOT EXISTS idx_jobs_created_at 
  ON jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_status_created 
  ON jobs(status, created_at DESC);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_jobs_timestamp 
AFTER UPDATE ON jobs
BEGIN
  UPDATE jobs SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Insert sample data for testing (optional - comment out in production)
-- INSERT INTO jobs (id, video_url, model_size, language, status) 
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', 'https://youtube.com/watch?v=test', 'medium', 'auto', 'pending');