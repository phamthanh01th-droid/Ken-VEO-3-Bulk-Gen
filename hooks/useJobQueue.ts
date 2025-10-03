import { useState, useEffect, useRef, useCallback } from 'react';
import { Job, JobStatus } from '../types';
import { generateVideo, pollVideoStatus, fetchVideoAsBlob } from '../services/geminiService';

const MAX_CONCURRENT_JOBS = 5;
const MAX_JOBS_PER_MINUTE = 4;
const ONE_MINUTE_MS = 60000;

export const useJobQueue = (
    jobs: Job[], 
    setJobs: React.Dispatch<React.SetStateAction<Job[]>>,
    isProcessing: boolean,
    accessToken: string | null
) => {
    const [runningJobsCount, setRunningJobsCount] = useState(0);
    const jobTimestampsRef = useRef<number[]>([]);
    
    const updateJobStatus = useCallback((jobId: string, updates: Partial<Job>) => {
        setJobs(prevJobs => prevJobs.map(j => j.id === jobId ? { ...j, ...updates } : j));
    }, [setJobs]);
    
    const processJob = useCallback(async (job: Job) => {
        if (!accessToken) {
            updateJobStatus(job.id, { status: JobStatus.Failed, error: 'Authentication token is missing.' });
            return;
        }

        updateJobStatus(job.id, { status: JobStatus.Running });
        try {
            const operationName = await generateVideo(job, accessToken);
            updateJobStatus(job.id, { operationName });

            const videoUri = await pollVideoStatus(operationName, accessToken);
            if (!videoUri) throw new Error("Video URI not found after polling.");

            const videoBlobUrl = await fetchVideoAsBlob(videoUri, accessToken);
            
            updateJobStatus(job.id, { status: JobStatus.Completed, resultUrl: videoBlobUrl });
        } catch (error: any) {
            console.error(`Job ${job.id} failed:`, error);
            updateJobStatus(job.id, { status: JobStatus.Failed, error: error.message || 'Unknown error' });
        }
    }, [updateJobStatus, accessToken]);

    useEffect(() => {
        if (!isProcessing || !accessToken) {
            return;
        }

        const currentRunning = jobs.filter(j => j.status === JobStatus.Running).length;
        setRunningJobsCount(currentRunning);
        
        const processNextJob = () => {
            const now = Date.now();
            jobTimestampsRef.current = jobTimestampsRef.current.filter(ts => now - ts < ONE_MINUTE_MS);
            
            const currentRunningJobs = jobs.filter(j => j.status === JobStatus.Running).length;
            const canStartMore = currentRunningJobs < MAX_CONCURRENT_JOBS && jobTimestampsRef.current.length < MAX_JOBS_PER_MINUTE;
            
            if (canStartMore) {
                const pendingJob = jobs.find(j => j.status === JobStatus.Pending);
                if (pendingJob) {
                    jobTimestampsRef.current.push(Date.now());
                    processJob(pendingJob);
                }
            }
        };

        const interval = setInterval(processNextJob, 2000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobs, isProcessing, processJob, accessToken]);
    
    useEffect(() => {
        setRunningJobsCount(jobs.filter(j => j.status === JobStatus.Running).length);
    }, [jobs]);
    
    return { runningJobsCount };
};