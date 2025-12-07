import React, { useCallback, useRef } from 'react';
import { Upload, Camera, Image as ImageIcon } from 'lucide-react';

interface UploadSectionProps {
  onImageSelect: (file: File) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onImageSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  }, [onImageSelect]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const validateAndProcess = (file: File) => {
    // Simple validation
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      alert('File size too large. Max 10MB.');
      return;
    }
    onImageSelect(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative group cursor-pointer flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-emerald-300 rounded-3xl bg-white hover:bg-emerald-50 transition-all duration-300 shadow-sm hover:shadow-md hover:border-emerald-500"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          <div className="bg-emerald-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
             <img src="https://cdn-icons-png.flaticon.com/512/706/706164.png" alt="Food Plate" className="w-12 h-12 opacity-80" />
          </div>
          <p className="mb-2 text-xl font-semibold text-slate-700">Drag & Drop your meal here</p>
          <p className="text-sm text-slate-500 mb-6">Supported: JPG, PNG, WEBP (Max 10MB)</p>
          
          <div className="flex gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-full font-medium shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <Upload size={18} />
              Upload Image
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()} // On mobile this triggers options including camera
              className="px-6 py-2.5 bg-white text-emerald-600 border border-emerald-200 rounded-full font-medium shadow-sm hover:bg-emerald-50 transition-colors flex items-center gap-2"
            >
              <Camera size={18} />
              Take Photo
            </button>
          </div>
        </div>
        
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleChange}
          accept="image/*"
        />
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">Powered by Gemini 3.0 Flash</p>
      </div>
    </div>
  );
};