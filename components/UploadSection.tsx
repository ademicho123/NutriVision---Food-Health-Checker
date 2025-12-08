
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Upload, Camera, X, RefreshCcw } from 'lucide-react';

interface UploadSectionProps {
  onImageSelect: (file: File) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onImageSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Manage Camera Stream
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    setIsVideoReady(false);

    const startCamera = async () => {
      if (isCameraOpen) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: facingMode,
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            } 
          });
          
          currentStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Explicitly play to ensure feed starts on some mobile browsers
            try {
              await videoRef.current.play();
            } catch (playError) {
              console.error("Video play failed:", playError);
            }
          }
        } catch (err) {
          console.error("Camera access error:", err);
          alert("Unable to access camera. Please ensure you have granted permissions and no other app is using it.");
          setIsCameraOpen(false);
        }
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen, facingMode]);

  const handleVideoLoaded = () => {
    setIsVideoReady(true);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Utility to compress image before sending up
  const compressImage = (source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const maxWidth = 1024; // Limit width to 1024px for storage safety
      
      let width = 0;
      let height = 0;

      if (source instanceof HTMLVideoElement) {
         width = source.videoWidth;
         height = source.videoHeight;
      } else if (source instanceof HTMLImageElement) {
         width = source.naturalWidth;
         height = source.naturalHeight;
      } else {
         width = source.width;
         height = source.height;
      }

      // Calculate new dimensions
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      if (ctx) {
        if (facingMode === 'user' && source instanceof HTMLVideoElement) {
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(source, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "compressed-image.jpg", { type: "image/jpeg" });
            resolve(file);
          }
        }, 'image/jpeg', 0.7); // 70% quality
      }
    });
  };

  const handleCapture = async () => {
    if (videoRef.current && isVideoReady) {
      try {
        const file = await compressImage(videoRef.current);
        setIsCameraOpen(false);
        onImageSelect(file);
      } catch (e) {
        console.error("Capture failed", e);
        alert("Failed to capture image.");
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
    // Basic type check
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Load image to compress it
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const compressedFile = await compressImage(img);
        onImageSelect(compressedFile);
      } catch (e) {
        console.error("Compression failed", e);
        // Fallback to original if compression fails, though unlikely
        onImageSelect(file);
      }
    };
    
    img.onerror = () => {
       alert("Failed to load image.");
    };

    img.src = objectUrl;
  };

  if (isCameraOpen) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="relative w-full h-[400px] bg-black rounded-3xl overflow-hidden shadow-lg flex flex-col items-center justify-center">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            onLoadedMetadata={handleVideoLoaded}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isVideoReady ? 'opacity-100' : 'opacity-0'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
          
          {!isVideoReady && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8 z-10">
            <button 
              onClick={() => setIsCameraOpen(false)}
              className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
              title="Cancel"
            >
              <X size={24} />
            </button>
            
            <button 
              onClick={handleCapture}
              disabled={!isVideoReady}
              className={`group p-1 rounded-full border-4 border-white/50 transition-all duration-300 active:scale-95 ${!isVideoReady ? 'opacity-50 cursor-not-allowed' : 'hover:border-white cursor-pointer'}`}
              title="Capture Photo"
              data-testid="camera-capture-btn"
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center group-hover:scale-90 transition-transform shadow-lg">
                <div className="w-14 h-14 rounded-full border-2 border-slate-300"></div>
              </div>
            </button>

            <button 
              onClick={toggleCamera}
              className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
              title="Switch Camera"
            >
              <RefreshCcw size={24} />
            </button>
          </div>
        </div>
         <div className="mt-6 text-center">
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
          <p className="text-sm text-slate-500 mb-6">Supported: JPG, PNG, WEBP</p>
          
          <div className="flex gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-full font-medium shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors flex items-center gap-2"
              data-testid="upload-btn"
            >
              <Upload size={18} />
              Upload Image
            </button>
            <button 
              onClick={() => setIsCameraOpen(true)}
              className="px-6 py-2.5 bg-white text-emerald-600 border border-emerald-200 rounded-full font-medium shadow-sm hover:bg-emerald-50 transition-colors flex items-center gap-2"
              data-testid="camera-btn"
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
          data-testid="file-input"
        />
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">Powered by Gemini 3.0 Flash</p>
      </div>
    </div>
  );
};
