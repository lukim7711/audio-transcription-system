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
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  
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
  
  // Audio event handlers
  // Audio event handlers & Sync Logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !transcript) return;
    
    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      
      // LOGIKA BARU: Sticky Highlight
      // Cari kata terakhir yang "start"-nya sudah terlewati oleh waktu audio saat ini
      let currentActiveIndex = -1;
      let globalIndex = 0;

      for (const segment of transcript.segments) {
        for (const word of segment.words) {
          if (word.start <= time) {
            currentActiveIndex = globalIndex;
          } else {
            // Karena kata-kata urut waktu, jika kita ketemu kata yang belum mulai,
            // berarti kata-kata setelahnya juga belum. Stop loop biar hemat resource.
            break; 
          }
          globalIndex++;
        }
        // Break outer loop jika sudah melewati waktu
        if (segment.end > time && currentActiveIndex === globalIndex - 1) break;
      }

      setActiveWordIndex(currentActiveIndex);
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

  // TAMBAHAN: Efek untuk Auto-Scroll ke kata yang aktif
  useEffect(() => {
    if (activeWordIndex !== null) {
      const activeElement = document.getElementById(`word-${activeWordIndex}`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center', // Taruh kata di tengah layar
          inline: 'nearest'
        });
      }
    }
  }, [activeWordIndex]);
  
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
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <LoadingSpinner size="large" text="Loading transcript..." />
        </div>
      </div>
    );
  }
  
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
        <audio ref={audioRef} src={job.audio_url!} preload="metadata" />
        
        <div className="space-y-4">
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
            <div className="flex justify-between text-sm text-gray-600">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full transition"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 4l10 6-10 6V4z" />
                  </svg>
                )}
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Speed:</span>
                {PLAYBACK_RATES.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={`px-3 py-1 text-sm rounded transition ${
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
            
            {/* Download Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload(job.transcript_url!, `transcript-${id}.json`)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                JSON
              </button>
              <button
                onClick={() => handleDownload(job.srt_url!, `transcript-${id}.srt`)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                SRT
              </button>
              <button
                onClick={() => handleDownload(job.txt_url!, `transcript-${id}.txt`)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                TXT
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Transcript */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Transcript</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {transcript.segments.map((segment) => (
            <div key={segment.id} className="border-l-4 border-gray-200 pl-4">
              <div className="text-xs text-gray-500 mb-2">
                {formatDuration(segment.start)} - {formatDuration(segment.end)}
              </div>
              <div className="flex flex-wrap gap-1">
                {segment.words.map((word, idx) => {
                  const globalIndex = transcript.segments
                    .slice(0, segment.id)
                    .reduce((sum, s) => sum + s.words.length, 0) + idx;
                  
                  const isActive = globalIndex === activeWordIndex;
                  
                  return (
                    <span
                      key={idx}
                      id={`word-${globalIndex}`}
                      onClick={() => handleWordClick(word.start)}
                      className={`cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : 'hover:bg-gray-100'
                      } px-1 rounded`}
                    >
                      {word.word}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerPage;