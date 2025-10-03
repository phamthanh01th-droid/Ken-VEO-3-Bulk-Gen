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
    
    // Construct the correct Vertex AI endpoint for video generation
    const url = `${API_BASE_URL}/v1/projects/${config.GOOGLE_PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${job.model}:generateContent`;

    // The 'parts' array was inferred as `Array<{text: string}>`, which prevents adding image data.
    // By defining a more flexible type for the parts array, we can include both text and image data.
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

    // FIX: The Vertex AI VEO API expects video-specific parameters like 'aspectRatio'
    // to be in a top-level 'parameters' object, not inside 'generationConfig'.
    // Also, connecting the 'outputCount' from the UI to the 'sampleCount' API parameter.
    const body = {
        contents: contents,
        parameters: {
            aspectRatio: job.aspectRatio,
            sampleCount: job.outputCount,
        },
        generationConfig: {
            // This object is for general generation parameters like temperature, etc.
            // Leaving it empty for now as we don't have UI controls for it.
        }
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
    
    // Vertex AI operation names are full resource paths
    // e.g., projects/PROJECT_ID/locations/LOCATION/operations/OPERATION_ID
    if (!data.name) {
        console.error("Unexpected response from generateVideo:", data);
        throw new Error("API did not return a valid operation name.");
    }
    return data.name;
};


export const pollVideoStatus = async (operationName: string, accessToken: string): Promise<string | undefined> => {
    // The operationName from Vertex is a full resource path, so we use it with the base URL.
    const url = `${API_BASE_URL}/v1/${operationName}`;

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds

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
            // The result format for Vertex AI VEO might be different.
            // The video URI is often in response.generatedVideos[0].video.uri
            // Even if multiple videos are generated, we'll only process the first one for now.
            return operation.response?.generatedVideos?.[0]?.video?.uri;
        }
    }
};

export const fetchVideoAsBlob = async (uri: string, accessToken: string): Promise<string> => {
    // The URI from the operation is a protected resource and needs authentication.
    const response = await fetch(uri, {
        headers: {
            // Note: Some signed URLs may not require an additional auth header.
            // If downloads fail, this might be the reason.
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
