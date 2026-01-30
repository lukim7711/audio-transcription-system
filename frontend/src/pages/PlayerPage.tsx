import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJobStatus, getTranscript, downloadFile } from '../utils/api';
import { formatDuration } from '../utils/formatters';
import { Job, TranscriptDocument, PLAYBACK_RATES } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { Button } from '../components/common/Button';

const PlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<Job | null>(null);
  const [transcript, setTranscript] = useState<TranscriptDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  
  // Load job and transcript
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
        
        // Load transcript
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
  
  // Audio event handlers - Update untuk segment-based highlighting
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !transcript) return;
    
    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      
      // Cari segment yang sedang aktif berdasarkan waktu
      let currentActiveSegmentId: number | null = null;
      
      for (const segment of transcript.segments) {
        if (time >= segment.start && time <= segment.end) {
          currentActiveSegmentId = segment.id;
          break;
        }
      }
      
      // Jika tidak ada segment yang aktif, cari segment terakhir yang sudah lewat
      if (currentActiveSegmentId === null) {
        for (let i = transcript.segments.length - 1; i >= 0; i--) {
          if (time > transcript.segments[i].end) {
            currentActiveSegmentId = transcript.segments[i].id;
            break;
          }
        }
      }
      
      setActiveSegmentId(currentActiveSegmentId);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [transcript]);

  // Auto-scroll ke segment yang aktif
  useEffect(() => {
    if (activeSegmentId !== null) {
      const activeElement = document.getElementById(`segment-${activeSegmentId}`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [activeSegmentId]);
  
  // Playback controls
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
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
  
  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };
  
  const handleDownload = (url: string, filename: string) => {
    downloadFile(url, filename);
  };
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <LoadingSpinner size="large" text="Loading transcript..." />
        </div>
      </div>
    );
  }
  
  if (error || !job || !transcript) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <ErrorMessage message={error || 'Transcript not found'} />
          <Button onClick={() => navigate('/')} variant="secondary" className="mt-4">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 break-words">
          {job.video_title || 'Transcription'}
        </h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
          <span>Duration: {formatDuration(transcript.duration)}</span>
          <span className="hidden sm:inline">•</span>
          <span>Language: {transcript.language}</span>
          <span className="hidden sm:inline">•</span>
          <span>Model: {transcript.model}</span>
        </div>
      </div>
      
      {/* Audio Player */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <audio ref={audioRef} src={job.audio_url!} preload="metadata" />
        
        <div className="space-y-3 sm:space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs sm:text-sm text-gray-600">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={togglePlay}
                className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full transition flex-shrink-0"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 4l10 6-10 6V4z" />
                  </svg>
                )}
              </button>
              
              {/* Playback Speed */}
              <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">Speed:</span>
                <div className="flex gap-1 sm:gap-2">
                  {PLAYBACK_RATES.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition flex-shrink-0 ${
                        playbackRate === rate
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Download Buttons */}
            <div className="flex items-center gap-2 justify-center sm:justify-end">
              <span className="text-xs sm:text-sm text-gray-600 flex-shrink-0">Download:</span>
              <button
                onClick={() => handleDownload(job.transcript_url!, `transcript-${id}.json`)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                JSON
              </button>
              <button
                onClick={() => handleDownload(job.srt_url!, `transcript-${id}.srt`)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                SRT
              </button>
              <button
                onClick={() => handleDownload(job.txt_url!, `transcript-${id}.txt`)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                TXT
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Transcript - Segment-based display */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Transcript</h2>
        <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
          {transcript.segments.map((segment) => {
            const isActive = segment.id === activeSegmentId;
            
            return (
              <div
                key={segment.id}
                id={`segment-${segment.id}`}
                onClick={() => handleSegmentClick(segment.start)}
                className={`border-l-4 pl-3 sm:pl-4 py-2 cursor-pointer transition-all rounded-r ${
                  isActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <div className="text-xs text-gray-500 mb-1.5 sm:mb-2">
                  {formatDuration(segment.start)} - {formatDuration(segment.end)}
                </div>
                <p className={`text-sm sm:text-base leading-relaxed ${
                  isActive ? 'text-blue-900 font-medium' : 'text-gray-800'
                }`}>
                  {segment.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlayerPage;