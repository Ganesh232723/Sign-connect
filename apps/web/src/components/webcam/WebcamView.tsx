import { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface WebcamViewProps {
  onVideoReady?: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
  isActive: boolean;
}

export default function WebcamView({ onVideoReady, isActive }: WebcamViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function setupCamera() {
      if (!isActive) {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        return;
      }

      setIsLoading(true);
      setHasCameraError(false);

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            setIsLoading(false);
            if (videoRef.current && canvasRef.current && onVideoReady) {
              onVideoReady(videoRef.current, canvasRef.current);
            }
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setHasCameraError(true);
        setIsLoading(false);
      }
    }

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, onVideoReady]);

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-200">
      {/* Video Element (Hidden but feeds data) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100", 
          (!isActive || hasCameraError || isLoading) && "hidden"
        )}
      />
      
      {/* Skeleton Overlay Canvas */}
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100 z-10 pointer-events-none",
          (!isActive || hasCameraError || isLoading) && "hidden"
        )}
      />

      {/* States */}
      {!isActive && !hasCameraError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100">
          <CameraOff className="w-12 h-12 mb-4 text-slate-300" />
          <p className="font-medium">Camera is paused</p>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-900/50 backdrop-blur-sm z-20">
          <Loader2 className="w-10 h-10 mb-4 animate-spin text-primary" />
          <p className="font-medium text-white">Initializing AI tracking...</p>
        </div>
      )}

      {hasCameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 bg-red-50">
          <Camera className="w-12 h-12 mb-4" />
          <p className="font-bold text-red-600 mb-2">Camera Access Denied</p>
          <p className="text-sm text-red-500 mb-4">Please grant browser permissions to use the live translator.</p>
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-100" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
