import React from 'react';
import { JobStatus } from '../../types';

interface StatusBadgeProps {
  status: JobStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };
  
  const icons = {
    pending: '⏳',
    processing: '⚙️',
    completed: '✅',
    failed: '❌',
  };
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}
    >
      <span>{icons[status]}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
