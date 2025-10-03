import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Job, JobStatus } from './types';
import { JobInputForm } from './components/JobInputForm';
import { JobList } from './components/JobList';
import { useJobQueue } from './hooks/useJobQueue';
import { createZipAndDownload } from './utils/fileUtils';
import { DownloadIcon, PlayIcon, TrashIcon, GridViewIcon, ListViewIcon, StopIcon } from './components/Icons';
import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';

type ViewMode = 'grid' | 'list';

const App: React.FC = () => {
  const { user, accessToken, isInitialized } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(15);


  const { runningJobsCount } = useJobQueue(jobs, setJobs, isProcessing, accessToken);
  
  useEffect(() => {
    const pendingJobs = jobs.some(j => j.status === JobStatus.Pending);
    const runningJobs = jobs.some(j => j.status === JobStatus.Running);
    if (isProcessing && !pendingJobs && !runningJobs) {
      setIsProcessing(false);
    }
  }, [jobs, isProcessing]);

  useEffect(() => {
    setCurrentPage(1);
  }, [jobs.length, jobsPerPage]);

  const addJobs = (newJobs: Job[]) => {
    setJobs(prev => [...prev, ...newJobs]);
  };

  const handleStartProcessing = useCallback(() => {
    if (jobs.some(j => j.status === JobStatus.Pending)) {
      setIsProcessing(true);
    }
  }, [jobs]);
  
  const handleStopProcessing = useCallback(() => {
    setIsProcessing(false);
  }, []);

  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all jobs? This cannot be undone.')) {
        setJobs([]);
        setIsProcessing(false);
    }
  }, []);

  const handleDownloadAll = useCallback(async () => {
      const completedJobs = jobs.filter(j => j.status === JobStatus.Completed && j.resultUrl);
      if (completedJobs.length > 0) {
        await createZipAndDownload(completedJobs);
      } else {
        alert('No completed videos to download.');
      }
  }, [jobs]);
  
  const retryJob = (jobId: string) => {
    setJobs(prevJobs => prevJobs.map(job => 
      job.id === jobId ? { ...job, status: JobStatus.Pending, error: undefined, operationName: undefined } : job
    ));
  };
  
  const completedJobsCount = jobs.filter(j => j.status === JobStatus.Completed).length;
  const pendingJobsCount = jobs.filter(j => j.status === JobStatus.Pending).length;
  const failedJobsCount = jobs.filter(j => j.status === JobStatus.Failed).length;
  
  const paginatedJobs = useMemo(() => {
      const startIndex = (currentPage - 1) * jobsPerPage;
      const endIndex = startIndex + jobsPerPage;
      return jobs.slice(startIndex, endIndex);
  }, [jobs, currentPage, jobsPerPage]);

  const totalPages = Math.ceil(jobs.length / jobsPerPage);

  const handleNextPage = () => {
      setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  const handlePrevPage = () => {
      setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  if (!isInitialized) {
      return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Initializing...</div>;
  }
  
  if (!user) {
      return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      <div className="container mx-auto p-4 md:p-8">
        <main>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4 text-gray-200">Add Jobs</h2>
            <JobInputForm onAddJobs={addJobs} disabled={isProcessing} />
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-700">
             <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-semibold text-gray-200">Job Queue ({jobs.length})</h2>
                  <div className="flex items-center bg-gray-700/50 rounded-lg p-1">
                      <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-600'}`} aria-label="Grid View">
                          <GridViewIcon />
                      </button>
                      <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-600'}`} aria-label="List View">
                          <ListViewIcon />
                      </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-center">
                    <button
                        onClick={handleStartProcessing}
                        disabled={isProcessing || pendingJobsCount === 0}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 shadow-md"
                    >
                        <PlayIcon />
                        {isProcessing ? 'Queue Running...' : `Start Queue (${pendingJobsCount})`}
                    </button>
                    <button
                        onClick={handleStopProcessing}
                        disabled={!isProcessing}
                        className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-900/50 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 shadow-md"
                    >
                        <StopIcon />
                        Stop Queue
                    </button>
                    <button
                        onClick={handleDownloadAll}
                        disabled={completedJobsCount === 0}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-900/50 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 shadow-md"
                    >
                       <DownloadIcon />
                       Download All ({completedJobsCount})
                    </button>
                     <button
                        onClick={handleClearAll}
                        disabled={jobs.length === 0}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 shadow-md"
                    >
                       <TrashIcon />
                       Clear All
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 text-center text-sm mb-4">
                <div className="bg-gray-700/50 p-2 rounded-lg">Running: <span className="font-bold text-cyan-400">{runningJobsCount}</span></div>
                <div className="bg-gray-700/50 p-2 rounded-lg">Pending: <span className="font-bold text-yellow-400">{pendingJobsCount}</span></div>
                <div className="bg-gray-700/50 p-2 rounded-lg">Completed: <span className="font-bold text-green-400">{completedJobsCount}</span></div>
                <div className="bg-gray-700/50 p-2 rounded-lg">Failed: <span className="font-bold text-red-400">{failedJobsCount}</span></div>
                <div className="bg-gray-700/50 p-2 rounded-lg">Total: <span className="font-bold text-indigo-400">{jobs.length}</span></div>
            </div>

            <JobList jobs={paginatedJobs} view={view} onRetryJob={retryJob} />

            {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <label htmlFor="jobs-per-page" className="text-gray-400">Jobs per page:</label>
                        <select
                            id="jobs-per-page"
                            value={jobsPerPage}
                            onChange={(e) => setJobsPerPage(Number(e.target.value))}
                            className="bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        >
                            <option value={15}>15</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex items-center">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed rounded-l-md transition-colors"
                            >
                                Prev
                            </button>
                             <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed rounded-r-md transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;