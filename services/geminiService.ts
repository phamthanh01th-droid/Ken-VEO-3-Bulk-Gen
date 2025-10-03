import { Job, InputType } from '../types';
import config from '../config';

// VEO models are hosted on Vertex AI, which requires a region-specific endpoint.
const LOCATION = 'us-central1';
const API_BASE_URL = `https://${LOCATION}-aiplatform.googleapis.com`;

const handleApiResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || `API request failed with status ${response.status}`;
        console.error("API Error Response:", errorData);
        throw new Error(errorMessage);
    }
    return response.json();
};

export const generateVideo = async (job: Job, accessToken: string): Promise<string> => {
    if (!config.GOOGLE_PROJECT_ID) {
        throw new Error("Google Project ID is not configured.");
    }
    
    const url = `${API_BASE_URL}/v1/projects/${config.GOOGLE_PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${job.model}:generateContent`;

    let body;

    try {
        // Attempt to parse the prompt as JSON. If it succeeds, it's a complex prompt.
        const parsedPrompt = JSON.parse(job.prompt);
        
        // Use the parsed JSON as the base of the request body.
        // This allows for detailed, structured prompts like those from Google Labs.
        // We merge the UI settings into this object.
        body = {
            ...parsedPrompt,
            aspectRatio: job.aspectRatio,
            sampleCount: job.outputCount,
        };

        // If an image is provided, add it to the 'parts' array within the user's JSON structure.
        if (job.inputType === InputType.IMAGE && job.image) {
            const imagePart = {
                inlineData: {
                    mimeType: job.image.mimeType,
                    data: job.image.base64
                }
            };
            // Ensure contents and parts exist before pushing
            if (!body.contents) body.contents = [{ role: "user", parts: [] }];
            if (!body.contents[0].parts) body.contents[0].parts = [];
            body.contents[0].parts.push(imagePart);
        }

    } catch (error) {
        // If parsing fails, treat it as a simple plain text prompt.
        const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [{ text: job.prompt }];

        if (job.inputType === InputType.IMAGE && job.image) {
            parts.push({
                inlineData: {
                    mimeType: job.image.mimeType,
                    data: job.image.base64
                }
            });
        }
        
        const contents = [{
            role: "user",
            parts: parts
        }];

        // FIX: The VEO API expects aspectRatio and sampleCount at the root level, not inside a 'parameters' object.
        // This was the cause of the error for simple text prompts.
        body = {
            contents: contents,
            aspectRatio: job.aspectRatio,
            sampleCount: job.outputCount,
            generationConfig: {}
        };
    }
    
    // This is an async endpoint that returns an operation
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
    });

    const data = await handleApiResponse(response);
    
    if (!data.name) {
        console.error("Unexpected response from generateVideo:", data);
        throw new Error("API did not return a valid operation name.");
    }
    return data.name;
};


export const pollVideoStatus = async (operationName: string, accessToken: string): Promise<string | undefined> => {
    const url = `${API_BASE_URL}/v1/${operationName}`;

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 10000)); 

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            }
        });

        const operation = await handleApiResponse(response);

        if (operation.done) {
            if (operation.error) {
                throw new Error(`Operation failed: ${operation.error.message}`);
            }
            return operation.response?.generatedVideos?.[0]?.video?.uri;
        }
    }
};

export const fetchVideoAsBlob = async (uri: string, accessToken: string): Promise<string> => {
    const response = await fetch(uri, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch video: ${response.statusText}. Details: ${errorText}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};