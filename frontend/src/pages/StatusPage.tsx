import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJobStatus } from '../utils/api';
import { formatTimestamp, formatProcessingTime, formatDuration } from '../utils/formatters';
//import { Job } from '../types';
import { usePolling } from '../hooks/usePolling';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';

const StatusPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Create stable fetch function to prevent infinite polling loop
  const fetchJobStatus = React.useCallback(() => getJobStatus(id!), [id]);

  // Poll job status every 3 seconds until completed or failed
  const { data: response, error, isLoading } = usePolling(
    fetchJobStatus,
    {
      interval: 3000,
      shouldStop: (res) => {
        const status = res.data?.status;
        return status === 'completed' || status === 'failed';
      },
    }
  );

  const job = response?.data;

  // Navigate to player when completed
  useEffect(() => {
    if (job?.status === 'completed') {
      // Auto-redirect after 2 seconds
      const timer = setTimeout(() => {
        navigate(`/player/${job.id}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [job, navigate]);

  if (isLoading && !job) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <LoadingSpinner size="large" text="Loading job status..." />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <ErrorMessage
            message={error?.message || 'Job not found'}
            onRetry={() => window.location.reload()}
          />
          <Button
            onClick={() => navigate('/')}
            variant="secondary"
            className="mt-4"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Job Status</h2>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm text-gray-500">Job ID: {job.id}</p>
        </div>

        {/* Job Details */}
        <div className="space-y-4 mb-6">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Video Information</h3>
            <div className="space-y-2">
              {job.video_title && (
                <div>
                  <span className="text-sm text-gray-500">Title: </span>
                  <span className="text-sm text-gray-900">{job.video_title}</span>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-500">URL: </span>
                <a
                  href={job.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {job.video_url}
                </a>
              </div>
              {job.video_duration && (
                <div>
                  <span className="text-sm text-gray-500">Duration: </span>
                  <span className="text-sm text-gray-900">
                    {formatDuration(job.video_duration)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Processing Details</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-500">Model: </span>
                <span className="text-sm text-gray-900">{job.model_size}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Language: </span>
                <span className="text-sm text-gray-900">{job.language}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Created: </span>
                <span className="text-sm text-gray-900">{formatTimestamp(job.created_at)}</span>
              </div>
              {job.processing_time && (
                <div>
                  <span className="text-sm text-gray-500">Processing Time: </span>
                  <span className="text-sm text-gray-900">
                    {formatProcessingTime(job.processing_time)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status-specific content */}
        {job.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⏳ Job is queued and waiting to be processed...
            </p>
          </div>
        )}

        {job.status === 'processing' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <LoadingSpinner size="small" />
              <div>
                <p className="text-sm font-medium text-blue-900">Processing your video</p>
                <p className="text-sm text-blue-700 mt-1">
                  This usually takes a few minutes depending on video length...
                </p>
              </div>
            </div>
          </div>
        )}

        {job.status === 'completed' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900">✅ Transcription completed!</p>
              <p className="text-sm text-green-700 mt-1">
                Redirecting to player in 2 seconds...
              </p>
            </div>

            <Button
              onClick={() => navigate(`/player/${job.id}`)}
              fullWidth
            >
              View Transcript Now
            </Button>
          </div>
        )}

        {job.status === 'failed' && (
          <div className="space-y-4">
            <ErrorMessage
              message={job.error_message || 'Transcription failed'}
            />

            {job.error_code && (
              <div className="text-sm text-gray-600">
                <p className="font-medium">Error Code: {job.error_code}</p>
                {job.error_details && (
                  <pre className="mt-2 bg-gray-50 p-3 rounded overflow-auto">
                    {JSON.stringify(job.error_details, null, 2)}
                  </pre>
                )}
              </div>
            )}

            <Button
              onClick={() => navigate('/')}
              variant="secondary"
              fullWidth
            >
              Try Another Video
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusPage;