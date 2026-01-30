import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitJob } from '../../utils/api';
import { getValidationError } from '../../utils/validators';
import { MODEL_SIZE_OPTIONS, LANGUAGE_OPTIONS, ModelSize, ISOLanguage } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { ErrorMessage } from '../common/ErrorMessage';

const JobForm: React.FC = () => {
  const navigate = useNavigate();
  
  const [videoUrl, setVideoUrl] = useState('');
  const [modelSize, setModelSize] = useState<ModelSize>('medium');
  const [language, setLanguage] = useState<ISOLanguage>('auto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVideoUrl(value);
    
    // Clear error when user types
    if (urlError) {
      setUrlError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setError(null);
    setUrlError(null);

    // Validate URL
    const urlValidationError = getValidationError('video_url', videoUrl);
    if (urlValidationError) {
      setUrlError(urlValidationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitJob({
        video_url: videoUrl,
        model_size: modelSize,
        language,
      });

      // Navigate to status page
      navigate(`/status/${response.data!.job_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit transcription job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">New Transcription</h2>
          <p className="text-gray-600 mt-2">
            Enter a YouTube video URL to generate an accurate transcription with word-level timestamps
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="YouTube URL"
            value={videoUrl}
            onChange={handleUrlChange}
            placeholder="https://youtube.com/watch?v=..."
            required
            error={urlError || undefined}
            disabled={isSubmitting}
          />

          <Select
            label="Model Size"
            value={modelSize}
            onChange={(e) => setModelSize(e.target.value as ModelSize)}
            options={MODEL_SIZE_OPTIONS}
            disabled={isSubmitting}
          />

          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Model recommendations:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Medium:</strong> Best balance of speed and accuracy (recommended)</li>
              <li><strong>Large-v3:</strong> Highest accuracy, takes longer</li>
              <li><strong>Small:</strong> Faster processing, good for simple audio</li>
            </ul>
          </div>

          <Select
            label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as ISOLanguage)}
            options={LANGUAGE_OPTIONS}
            disabled={isSubmitting}
          />

          {error && <ErrorMessage message={error} />}

          <Button
            type="submit"
            disabled={isSubmitting}
            fullWidth
          >
            {isSubmitting ? 'Submitting...' : 'Start Transcription'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">How it works:</h3>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Submit your YouTube video URL</li>
            <li>Our system downloads and processes the audio using AI</li>
            <li>Get accurate transcription with word-level timestamps</li>
            <li>Download in multiple formats (JSON, SRT, TXT)</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default JobForm;