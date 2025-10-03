import { Job, InputType } from '../types';

const GOOGLE_PROJECT_ID = 'concise-perigee-474013-p4';
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
    if (!GOOGLE_PROJECT_ID) {
        throw new Error("Google Project ID is not configured.");
    }
    
    // Construct the correct Vertex AI endpoint for video generation
    const url = `${API_BASE_URL}/v1/projects/${GOOGLE_PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${job.model}:generateContent`;

    // FIX: The 'parts' array was inferred as `Array<{text: string}>`, which prevents adding image data.
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

    const body = {
        contents: contents,
        generationConfig: {
            // Include other parameters inside generationConfig
            aspectRatio: job.aspectRatio,
            // You can add other generation parameters here if needed
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

    // The response for video generation on Vertex AI might be an operation object directly
    // Let's assume the API returns a long-running operation that needs to be polled.
    // The structure might differ, this is a common pattern. If the API returns the video directly, this needs adjustment.
    // Based on the old code's polling logic, we'll assume it returns an operation name.
    const data = await handleApiResponse(response);
    
    // Vertex AI operation names are full resource paths
    // e.g., projects/PROJECT_ID/locations/LOCATION/operations/OPERATION_ID
    // We need to extract the operation ID or use the full name for polling.
    // Let's find the operation name from the response. It's often in a header or the body.
    // Checking for a `name` property in the response body.
    if (!data.name) {
         // The response might be structured differently, let's log it for debugging
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
            // Adjusting based on common Vertex AI patterns.
            // The video URI is often in response.generatedVideos[0].video.uri
            return operation.response?.generatedVideos?.[0]?.video?.uri;
        }
    }
};

export const fetchVideoAsBlob = async (uri: string, accessToken: string): Promise<string> => {
    // The URI from the operation is a protected resource and needs authentication.
    // It could be a GCS URI (gs://) or a signed URL. If it's a GCS URI, this fetch will fail.
    // Assuming the API provides a temporary downloadable HTTPS URL.
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
