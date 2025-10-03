
import React from 'react';
import { Job } from '../types';
import { JobItem } from './JobItem';

interface JobListProps {
  jobs: Job[];
  view: 'grid' | 'list';
  onRetryJob: (jobId: string) => void;
}

export const JobList: React.FC<JobListProps> = ({ jobs, view, onRetryJob }) => {
  if (jobs.length === 0) {
    return <div className="text-center text-gray-500 py-10">Your job queue is empty. Add some jobs above to get started!</div>;
  }

  const containerClasses = view === 'grid'
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
    : 'flex flex-col gap-4';

  return (
    <div className={containerClasses}>
      {jobs.map(job => (
        <JobItem key={job.id} job={job} view={view} onRetry={onRetryJob} />
      ))}
    </div>
  );
};