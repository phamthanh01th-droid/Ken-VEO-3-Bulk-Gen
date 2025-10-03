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

    // Unified logic for all prompt types. The prompt, whether simple text or a stringified JSON object,
    // is always placed within the 'parts' array as text content. The API model is trained to interpret this.
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

    const body = {
        contents: contents,
        aspectRatio: job.aspectRatio,
        sampleCount: job.outputCount,
        generationConfig: {} // The API requires this field, even if empty.
    };
    
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