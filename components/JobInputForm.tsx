

import React, { useState, useCallback, ChangeEvent } from 'react';
import { Job, InputType, Model, AspectRatio, JobStatus } from '../types';
import { parsePrompts, fileToBase64 } from '../utils/fileUtils';
import { UploadIcon, PlusIcon } from './Icons';

interface JobInputFormProps {
  onAddJobs: (jobs: Job[]) => void;
  disabled: boolean;
}

const modelDisplayNames: Record<Model, string> = {
    [Model.VEO_3_FAST]: 'VEO 3 Fast',
    [Model.VEO_2]: 'VEO 2',
};

export const JobInputForm: React.FC<JobInputFormProps> = ({ onAddJobs, disabled }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [inputType, setInputType] = useState<InputType>(InputType.TEXT);
  const [model, setModel] = useState<Model>(Model.VEO_3_FAST);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.LANDSCAPE);
  const [outputCount, setOutputCount] = useState<number>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const createJobsFromPrompts = async (prompts: string[]) => {
    if (prompts.length === 0) return [];
    
    if (inputType === InputType.IMAGE && !imageFile) {
        alert("Please upload an image for Image-to-Video generation.");
        return [];
    }
    
    let imagePayload;
    if (inputType === InputType.IMAGE && imageFile) {
        imagePayload = await fileToBase64(imageFile);
    }

    const newJobs: Job[] = prompts.map(p => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      prompt: p,
      inputType,
      model,
      aspectRatio,
      outputCount,
      image: imagePayload,
      status: JobStatus.Pending,
    }));
    
    return newJobs;
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const content = await file.text();
        const prompts = parsePrompts(content);
        if (prompts.length > 0) {
          const newJobs = await createJobsFromPrompts(prompts);
          if (newJobs.length > 0) {
              onAddJobs(newJobs);
          }
        } else {
          alert('No valid prompts found in the file. Prompts should be enclosed in "quotes" or be valid JSON objects in {curly braces}.');
        }
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Failed to read the prompt file.");
      }
      // Reset file input to allow uploading the same file again
      e.target.value = '';
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      if (imagePreview) {
          URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  const resetForm = () => {
    setPrompt('');
    setOutputCount(1);
    // Do not reset other settings like model, aspect ratio etc.
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const prompts = parsePrompts(prompt);
    
    if (prompts.length === 0) {
      alert("Please enter at least one prompt.");
      return;
    }

    const newJobs = await createJobsFromPrompts(prompts);
    if (newJobs.length > 0) {
        onAddJobs(newJobs);
        resetForm();
    }
  }, [prompt, inputType, model, aspectRatio, outputCount, imageFile, onAddJobs]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="prompts" className="block text-sm font-medium text-gray-300 mb-1">Prompts (one per line, supports JSON)</label>
          <textarea
            id="prompts"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder='"A robot holding a red skateboard."\n{"prompt": "A cat driving a car", "negativePrompt": "dogs"}'
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="prompt-file" className="block text-sm font-medium text-gray-300 mb-1">Or upload prompts from .txt</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <UploadIcon />
              <div className="flex text-sm text-gray-400">
                <label htmlFor="prompt-file" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-indigo-500">
                  <span>Upload a file</span>
                  <input id="prompt-file" name="prompt-file" type="file" className="sr-only" accept=".txt" onChange={handleFileChange} disabled={disabled}/>
                </label>
                <p className="pl-1">and add to queue</p>
              </div>
              <p className="text-xs text-gray-500">Adds jobs directly</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="input-type" className="block text-sm font-medium text-gray-300">Input Type</label>
          <select id="input-type" value={inputType} onChange={(e) => setInputType(e.target.value as InputType)} disabled={disabled} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-200">
            {Object.values(InputType).map(it => <option key={it} value={it}>{it}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-300">Model</label>
          <select id="model" value={model} onChange={(e) => setModel(e.target.value as Model)} disabled={disabled} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-200">
            {Object.values(Model).map(m => <option key={m} value={m}>{modelDisplayNames[m]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-300">Aspect Ratio</label>
          <select id="aspect-ratio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} disabled={disabled} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-200">
            {Object.values(AspectRatio).map(ar => <option key={ar} value={ar}>{ar}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="output-count" className="block text-sm font-medium text-gray-300">Outputs</label>
          <input type="number" id="output-count" value={outputCount} onChange={(e) => setOutputCount(Math.max(1, parseInt(e.target.value)))} min="1" max="4" disabled={disabled} className="mt-1 block w-full pl-3 pr-2 py-2 text-base bg-gray-700 border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-200"/>
        </div>
      </div>
      
      {inputType === InputType.IMAGE && (
        <div>
          <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300">Upload Image</label>
          <div className="mt-1 flex items-center gap-4">
            <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition" disabled={disabled}/>
            {imagePreview && <img src={imagePreview} alt="Image preview" className="h-16 w-16 object-cover rounded-md" />}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={disabled} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 shadow-md">
          <PlusIcon />
          Add Job(s) to Queue
        </button>
      </div>
    </form>
  );
};