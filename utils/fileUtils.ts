import { Job } from './types';

declare const JSZip: any;

export const parsePrompts = (content: string): string[] => {
    const prompts: string[] = [];
    let remainingText = content.trim();

    while (remainingText.length > 0) {
        remainingText = remainingText.trim();

        // Check for a JSON object first
        if (remainingText.startsWith('{')) {
            let braceCount = 0;
            let jsonEndIndex = -1;

            for (let i = 0; i < remainingText.length; i++) {
                if (remainingText[i] === '{') {
                    braceCount++;
                } else if (remainingText[i] === '}') {
                    braceCount--;
                }
                
                // When braceCount is zero, we've found the end of a potential JSON object
                if (braceCount === 0 && i > 0) {
                    jsonEndIndex = i + 1;
                    break;
                }
            }

            if (jsonEndIndex > 0) {
                const potentialJson = remainingText.substring(0, jsonEndIndex);
                try {
                    // Try to validate it's a real JSON object
                    JSON.parse(potentialJson);
                    prompts.push(potentialJson);
                    remainingText = remainingText.substring(jsonEndIndex);
                    continue; // Go to the next iteration of the while loop
                } catch (e) {
                    // It started with '{' but wasn't valid JSON. Fall through to treat it as a line of text.
                }
            }
        }

        // If it's not a valid JSON object, treat it as a line-based prompt
        const newlineIndex = remainingText.indexOf('\n');
        
        if (newlineIndex !== -1) {
            // There are more lines
            const line = remainingText.substring(0, newlineIndex).trim();
            if (line) {
                prompts.push(line);
            }
            remainingText = remainingText.substring(newlineIndex + 1);
        } else {
            // This is the last line in the remaining text
            const line = remainingText.trim();
            if (line) {
                prompts.push(line);
            }
            remainingText = ''; // End the loop
        }
    }

    return prompts;
};


export const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // The result is a data URL: "data:image/png;base64,iVBORw0KGgo..."
            // We need to extract just the base64 part.
            const base64Data = result.split(',')[1];
            resolve({ base64: base64Data, mimeType: file.type });
        };
        reader.onerror = (error) => reject(error);
    });
};

export const createZipAndDownload = async (jobs: Job[]): Promise<void> => {
    const zip = new JSZip();
    
    for (const job of jobs) {
        if (job.resultUrl) {
            try {
                // We use the blob URL directly, which doesn't need re-fetching
                const response = await fetch(job.resultUrl);
                const blob = await response.blob();
                // Sanitize prompt for filename
                 let safePrompt = "video";
                try {
                    // Try parsing as JSON to get a prompt field
                    const promptObj = JSON.parse(job.prompt);
                    if (typeof promptObj.prompt === 'string') {
                       safePrompt = promptObj.prompt;
                    } else if (typeof promptObj.scene_description === 'string') {
                       safePrompt = promptObj.scene_description;
                    }
                } catch (e) {
                    // It's a plain string
                    safePrompt = job.prompt;
                }
                const fileName = `${safePrompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}_${job.id.substring(0,5)}.mp4`;
                zip.file(fileName, blob);
            } catch (error) {
                console.error(`Failed to process video for job ${job.id}:`, error);
            }
        }
    }
    
    zip.generateAsync({ type: 'blob' }).then(content => {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'veo_videos_batch.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
};