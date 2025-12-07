import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Upload, Camera, X } from 'lucide-react';

interface UploadSectionProps {
  onImageSelect: (file: File) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onImageSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Manage Camera Stream
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    if (isCameraOpen) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          currentStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Camera access error:", err);
          alert("Unable to access camera. Please ensure you have granted camera permissions.");
          setIsCameraOpen(false);
        });
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Match canvas size to video resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
            setIsCameraOpen(false); // Clean up state
            onImageSelect(file); // Pass to parent
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

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

  if (isCameraOpen) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="relative w-full h-80 bg-black rounded-3xl overflow-hidden shadow-lg flex flex-col items-center justify-center">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8 z-10">
            <button 
              onClick={() => setIsCameraOpen(false)}
              className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
              title="Cancel"
            >
              <X size={24} />
            </button>
            
            <button 
              onClick={handleCapture}
              className="group p-1 rounded-full border-4 border-white/50 hover:border-white transition-all duration-300 active:scale-95"
              title="Capture Photo"
            >
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center group-hover:scale-90 transition-transform">
                <div className="w-12 h-12 rounded-full border-2 border-slate-300"></div>
              </div>
            </button>

            <div className="w-12"></div> {/* Spacer to balance layout */}
          </div>
        </div>
         <div className="mt-8 text-center">
          <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">Align food within frame</p>
        </div>
      </div>
    );
  }

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
              onClick={() => setIsCameraOpen(true)}
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