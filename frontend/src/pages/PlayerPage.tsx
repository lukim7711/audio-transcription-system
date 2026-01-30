import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJobStatus, getTranscript, downloadFile, getProxiedUrl } from '../utils/api';
import { formatDuration } from '../utils/formatters';
import { Job, TranscriptDocument, PLAYBACK_RATES } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { Button } from '../components/common/Button';

// ============================================================================
// TYPES
// ============================================================================
type ViewMode = 'sentence' | 'word';

// ============================================================================
// CONSTANTS
// ============================================================================
const WORD_TOLERANCE = 0.05;

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const PlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [job, setJob] = useState<Job | null>(null);
  const [transcript, setTranscript] = useState<TranscriptDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🆕 View mode state - DUAL MODE!
  const [viewMode, setViewMode] = useState<ViewMode>('word');

  // Audio state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);

  // ============================================================================
  // LOAD DATA
  // ============================================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        const jobResponse = await getJobStatus(id!);
        const jobData = jobResponse.data!;

        if (jobData.status !== 'completed') {
          navigate(`/status/${id}`);
          return;
        }

        setJob(jobData);

        const transcriptData = await getTranscript(jobData.transcript_url!);
        setTranscript(transcriptData);

      } catch (err: any) {
        setError(err.message || 'Failed to load transcript');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  // ============================================================================
  // AUDIO SYNC - HANDLES BOTH MODES
  // ============================================================================
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !transcript) return;

    let rafId: number | null = null;
    let isCleanedUp = false;

    // Pre-calculate flat words for word mode
    const flatWords = transcript.segments.flatMap((segment, segIdx) =>
      segment.words.map((word, wordIdx) => ({
        ...word,
        globalIndex: transcript.segments
          .slice(0, segIdx)
          .reduce((sum, s) => sum + s.words.length, 0) + wordIdx
      }))
    );

    const syncHighlight = () => {
      if (isCleanedUp || !audio) return;

      const time = audio.currentTime;
      setCurrentTime(time);

      // Update active segment (for sentence mode)
      const activeSegment = transcript.segments.find(seg =>
        time >= seg.start - WORD_TOLERANCE && time < seg.end + WORD_TOLERANCE
      );
      if (activeSegment) {
        setActiveSegmentId(activeSegment.id);
      }

      // Update active word (for word mode)
      if (viewMode === 'word') {
        const activeWord = flatWords.find(w =>
          time >= w.start - WORD_TOLERANCE && time < w.end + WORD_TOLERANCE
        );

        if (activeWord) {
          setActiveWordIndex(activeWord.globalIndex);
        } else {
          // Fallback to last passed word
          const lastWord = [...flatWords].reverse().find(w => w.start <= time);
          if (lastWord) {
            setActiveWordIndex(lastWord.globalIndex);
          }
        }
      }

      if (!isCleanedUp && !audio.paused && !audio.ended) {
        rafId = requestAnimationFrame(syncHighlight);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncHighlight);
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const handleSeeked = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      const time = audio.currentTime;

      // Update segment
      const seg = transcript.segments.find(s => time >= s.start && time < s.end);
      if (seg) setActiveSegmentId(seg.id);

      // Update word
      if (viewMode === 'word') {
        const word = flatWords.find(w => time >= w.start && time < w.end);
        if (word) setActiveWordIndex(word.globalIndex);
      }

      if (!audio.paused && !audio.ended) {
        rafId = requestAnimationFrame(syncHighlight);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsBuffering(false);
    };

    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlayThrough = () => setIsBuffering(false);

    const handleEnded = () => {
      setIsPlaying(false);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('ended', handleEnded);

    if (!audio.paused && !audio.ended) {
      handlePlay();
    }

    return () => {
      isCleanedUp = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [transcript, viewMode]);

  // ============================================================================
  // AUTO-SCROLL
  // ============================================================================
  useEffect(() => {
    const elementId = viewMode === 'word'
      ? `word-${activeWordIndex}`
      : `segment-${activeSegmentId}`;

    const activeElement = document.getElementById(elementId);
    if (activeElement) {
      const rect = activeElement.getBoundingClientRect();
      const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;

      if (!isInViewport) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [activeWordIndex, activeSegmentId, viewMode]);

  // ============================================================================
  // PLAYBACK CONTROLS
  // ============================================================================
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => {
        console.error('Play failed:', err);
        setError('Failed to play audio');
      });
    }
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
  };

  const handleSegmentClick = (startTime: number) => {
    seekTo(startTime);
    if (!isPlaying) {
      audioRef.current?.play();
    }
  };

  const handleWordClick = (startTime: number) => {
    seekTo(startTime);
    if (!isPlaying) {
      audioRef.current?.play();
    }
  };

  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const handleDownload = (url: string, filename: string) => {
    downloadFile(url, filename);
  };

  // ============================================================================
  // RENDER: LOADING
  // ============================================================================
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <LoadingSpinner size="large" text="Loading transcript..." />
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ERROR
  // ============================================================================
  if (error || !job || !transcript) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <ErrorMessage message={error || 'Transcript not found'} />
          <Button onClick={() => navigate('/')} variant="secondary" className="mt-4">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: MAIN UI
  // ============================================================================
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {job.video_title || 'Transcription'}
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Duration: {formatDuration(transcript.duration)}</span>
          <span>•</span>
          <span>Language: {transcript.language}</span>
          <span>•</span>
          <span>Model: {transcript.model}</span>
        </div>
      </div>

      {/* Audio Player */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <audio
          ref={audioRef}
          src={getProxiedUrl(job.audio_url!)}
          preload="auto"
          crossOrigin="anonymous"
        />

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              step="0.01"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                disabled={isBuffering}
                className={`w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full transition ${isBuffering ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {isBuffering ? (
                  <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 4l10 6-10 6V4z" />
                  </svg>
                )}
              </button>

              {isBuffering && (
                <span className="text-xs text-orange-600 font-medium animate-pulse">
                  Buffering...
                </span>
              )}

              {/* Playback Speed */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Speed:</span>
                {PLAYBACK_RATES.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={`px-3 py-1 text-sm rounded transition ${playbackRate === rate
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload(job.transcript_url!, `transcript-${id}.json`)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
              >
                JSON
              </button>
              <button
                onClick={() => handleDownload(job.srt_url!, `transcript-${id}.srt`)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
              >
                SRT
              </button>
              <button
                onClick={() => handleDownload(job.txt_url!, `transcript-${id}.txt`)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
              >
                TXT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Viewer */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            📄 Transcript
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {viewMode === 'sentence' ? 'Mode Kalimat' : 'Mode Karaoke'}
            </span>
          </h2>

          {/* 🆕 VIEW MODE TOGGLE - Toggle mode tampilan transkrip */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setViewMode('sentence')}
              className={`px-4 py-2 text-sm rounded-md transition-all font-medium ${viewMode === 'sentence'
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
            >
              📝 Kalimat
            </button>
            <button
              onClick={() => setViewMode('word')}
              className={`px-4 py-2 text-sm rounded-md transition-all font-medium ${viewMode === 'word'
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
            >
              🎤 Karaoke
            </button>
          </div>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto scroll-smooth p-2 bg-gray-50 rounded-lg border border-gray-200">
          {viewMode === 'sentence' ? (
            // ============================================================
            // 📝 SENTENCE MODE - Highlight per kalimat
            // ============================================================
            transcript.segments.map((segment) => {
              const isActive = segment.id === activeSegmentId;

              return (
                <div
                  key={segment.id}
                  id={`segment-${segment.id}`}
                  onClick={() => handleSegmentClick(segment.start)}
                  className={`border-l-4 pl-4 py-3 cursor-pointer transition-all ${isActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                >
                  <div className="text-xs text-gray-500 mb-2">
                    {formatDuration(segment.start)} - {formatDuration(segment.end)}
                  </div>
                  <p
                    className={`text-base leading-relaxed ${isActive
                        ? 'text-blue-900 font-medium'
                        : 'text-gray-700'
                      }`}
                  >
                    {segment.text}
                  </p>
                </div>
              );
            })
          ) : (
            // ============================================================
            // 🎤 KARAOKE MODE - Highlight per kata
            // ============================================================
            transcript.segments.map((segment, segmentIndex) => (
              <div key={segment.id} className="border-l-4 border-gray-200 pl-4">
                <div className="text-xs text-gray-500 mb-2">
                  {formatDuration(segment.start)} - {formatDuration(segment.end)}
                </div>
                <div className="flex flex-wrap gap-1">
                  {segment.words.map((word, idx) => {
                    // ✅ FIX: Use segmentIndex instead of segment.id
                    const globalIndex = transcript.segments
                      .slice(0, segmentIndex)
                      .reduce((sum, s) => sum + s.words.length, 0) + idx;

                    const isActive = globalIndex === activeWordIndex;

                    return (
                      <span
                        key={idx}
                        id={`word-${globalIndex}`}
                        onClick={() => handleWordClick(word.start)}
                        className={`cursor-pointer transition-all duration-200 px-1.5 py-0.5 rounded ${isActive
                            ? 'bg-blue-500 text-white font-semibold shadow-md scale-110'
                            : 'hover:bg-gray-100 hover:shadow-sm'
                          }`}
                        title={`${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s`}
                      >
                        {word.word}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerPage;