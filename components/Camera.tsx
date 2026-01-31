import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera as CameraIcon, RotateCcw, Check, X } from 'lucide-react';

interface CameraProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
  variant?: 'fullscreen' | 'inline';
  facingMode?: 'user' | 'environment';
}

export const Camera: React.FC<CameraProps> = ({ onCapture, onClose, variant = 'fullscreen', facingMode = 'user' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  const isFullscreen = variant === 'fullscreen';

  useEffect(() => {
    let localStream: MediaStream | null = null;
    let isMounted = true;

    const startCamera = async () => {
      try {
        const constraints = { 
            video: { 
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }, 
            audio: false 
        };
        
        // Request camera access only once and stop tracks on unmount
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!isMounted) {
            mediaStream.getTracks().forEach(track => track.stop());
            return;
        }

        localStream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {}); // Handle play promise rejection
          videoRef.current.onloadedmetadata = () => {
            if (isMounted) setIsReady(true);
          };
        }
      } catch (err) {
        if (isMounted) setError('Camera Access Required');
        console.error("Camera access error:", err);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (localStream) localStream.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current && isReady) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
        
        // Mirror the image if user-facing camera
        if (facingMode === 'user') {
            context.save();
            context.scale(-1, 1);
            context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            context.restore();
        } else {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.9)); // Higher quality
      }
    }
  }, [isReady, facingMode]);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-red-900/20 text-red-400 p-6 text-center text-sm font-medium"> {/* Adjusted text-sm */}
        <X size={28} className="mb-3"/>
        <p>Error: {error}. Please ensure camera permissions are granted.</p>
        <button onClick={onClose} className="mt-4 px-5 py-2.5 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors ios-press text-sm">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-black overflow-hidden`}>
      {!capturedImage ? (
          <>
              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center text-white/30 text-xs font-black tracking-[0.4em] uppercase animate-pulse z-10">
                  Initializing Lens
                </div>
              )}
              <video ref={videoRef} autoPlay playsInline muted 
                     className={`w-full h-full object-cover ${!isReady ? 'hidden' : ''}`} />
              
              {/* SHUTTER BUTTON */}
              <div className="absolute bottom-5 left-0 right-0 flex justify-center items-center z-20">
                  <button onClick={capture} disabled={!isReady} className="w-16 h-16 rounded-full border-[3px] border-white flex items-center justify-center active:scale-90 transition-all shadow-lg bg-white/20 backdrop-blur-sm">
                      <div className="w-10 h-10 bg-white rounded-full shadow-inner"></div>
                  </button>
              </div>
          </>
      ) : (
          <div className="w-full h-full relative">
              <img src={capturedImage} alt="Capture" className="w-full h-full object-cover" />
              <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-5 z-20">
                  <button onClick={() => setCapturedImage(null)} className="w-14 h-14 bg-[#232323] rounded-full flex items-center justify-center text-white/80 ios-press"><RotateCcw size={22}/></button>
                  <button onClick={() => onCapture(capturedImage)} className="w-14 h-14 bg-[#34C759] rounded-full flex items-center justify-center text-white ios-press shadow-xl"><Check size={26}/></button>
              </div>
          </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};