
import React, { useState, useEffect } from 'react';
import { Job, JobStatus } from '../types';
import { DownloadIcon, RetryIcon } from './Icons';

interface JobItemProps {
  job: Job;
  view: 'grid' | 'list';
  onRetry: (jobId: string) => void;
}

const loadingMessages = [
  "Summoning digital actors...",
  "Warming up the VEO core...",
  "Composing the perfect shot...",
  "Rendering pixel by pixel...",
  "Teaching AI about cinematography...",
  "Waiting for the director's call...",
  "Adjusting the virtual lighting...",
  "This can take a few minutes...",
];

const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const baseClasses = "px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block flex-shrink-0";
  const statusConfig = {
    [JobStatus.Pending]: "bg-yellow-500/20 text-yellow-300",
    [JobStatus.Running]: "bg-cyan-500/20 text-cyan-300 animate-pulse",
    [JobStatus.Completed]: "bg-green-500/20 text-green-300",
    [JobStatus.Failed]: "bg-red-500/20 text-red-300",
  };
  return <span className={`${baseClasses} ${statusConfig[status]}`}>{status}</span>;
};


export const JobItem: React.FC<JobItemProps> = ({ job, view, onRetry }) => {
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    if (job.status === JobStatus.Running) {
      const intervalId = setInterval(() => {
        setCurrentLoadingMessage(prev => {
          const currentIndex = loadingMessages.indexOf(prev);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 3000);
      return () => clearInterval(intervalId);
    }
  }, [job.status]);

  const handleDownload = () => {
    if (job.resultUrl) {
        const a = document.createElement('a');
        a.href = job.resultUrl;
        a.download = `veo_video_${job.id}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
  };

  const VideoPreview: React.FC = () => (
    <div className={view === 'grid' ? "aspect-video bg-gray-900/50 flex items-center justify-center overflow-hidden" : "w-40 md:w-48 h-full flex-shrink-0 bg-gray-900/50 flex items-center justify-center overflow-hidden rounded-l-xl"}>
        {job.status === JobStatus.Completed && job.resultUrl ? (
          <video controls src={job.resultUrl} className="w-full h-full object-cover" />
        ) : job.status === JobStatus.Running ? (
          <div className="text-center p-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto"></div>
            <p className="text-xs text-gray-400 mt-2 truncate">{currentLoadingMessage}</p>
          </div>
        ) : job.status === JobStatus.Failed ? (
          <div className="text-center p-2 text-red-400">
            <p className="text-sm font-semibold">Failed</p>
            <p className="text-xs text-gray-500 mt-1 truncate" title={job.error}>{job.error}</p>
          </div>
        ) : (
          <div className="text-center p-2 text-gray-500">
            <p className="text-sm">Pending</p>
          </div>
        )}
    </div>
  );

  if (view === 'list') {
      return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg flex flex-row h-24 transition-shadow hover:shadow-indigo-500/20">
            <VideoPreview />
            <div className="flex-grow p-3 flex flex-col justify-between overflow-hidden">
                <p className="text-sm text-gray-300 truncate whitespace-nowrap pr-1" title={job.prompt}>
                  {job.prompt}
                </p>
                <div className="flex justify-between items-center gap-2">
                    <StatusBadge status={job.status} />
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{job.aspectRatio}</span>
                        {job.status === JobStatus.Completed && (
                            <button onClick={handleDownload} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors" aria-label="Download">
                                <DownloadIcon />
                            </button>
                        )}
                        {job.status === JobStatus.Failed && (
                            <button onClick={() => onRetry(job.id)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors" aria-label="Retry">
                                <RetryIcon />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // Grid view (default)
  return (
    <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg flex flex-col h-full transition-shadow hover:shadow-indigo-500/20">
      <div className="p-4 flex-grow">
        <div className="flex justify-between items-start mb-2">
            <StatusBadge status={job.status} />
            <div className="text-xs text-gray-500">{job.aspectRatio}</div>
        </div>
        <p className="text-sm text-gray-300 h-16 overflow-y-auto pr-1">
          {job.prompt}
        </p>
      </div>
      
      <div className="rounded-b-xl overflow-hidden border-t border-gray-700/50">
          <VideoPreview />
      </div>

      <div className="p-2">
        <div className="flex justify-end items-center gap-2 min-h-[36px]">
            {job.status === JobStatus.Completed && (
                 <button onClick={handleDownload} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors" aria-label="Download">
                    <DownloadIcon />
                </button>
            )}
            {job.status === JobStatus.Failed && (
                <button onClick={() => onRetry(job.id)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors" aria-label="Retry">
                    <RetryIcon />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};