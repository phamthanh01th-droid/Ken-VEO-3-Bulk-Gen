export enum JobStatus {
  Pending = 'Pending',
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed',
}

export enum InputType {
  TEXT = 'Text-to-Video',
  IMAGE = 'Image-to-Video',
}

export enum Model {
  VEO_3_FAST = 'veo-3.0-fast-generate-001',
  VEO_2 = 'veo-2.0-generate-001',
}

export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
}

export interface Job {
  id: string;
  prompt: string;
  inputType: InputType;
  model: Model;
  aspectRatio: AspectRatio;
  outputCount: number;
  image?: {
      base64: string;
      mimeType: string;
  };
  status: JobStatus;
  resultUrl?: string;
  error?: string;
  operationName?: string;
}

// FIX: Added missing User interface to resolve type error in contexts/AuthContext.tsx.
export interface User {
  name: string;
  picture: string;
}