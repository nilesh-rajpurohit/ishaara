"use client";
import { useRef, useEffect, useState } from "react";
import { useMediaPipe } from "@/hooks/useMediaPipe";

interface ISLCameraProps {
  onGestureDetected: (gesture: string, confidence: number) => void;
}

export const ISLCamera = ({ onGestureDetected }: ISLCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isLoaded, landmarks, error, initMediaPipe, stopDetection } = useMediaPipe(videoRef);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (landmarks && landmarks.length > 0) {
      onGestureDetected("detecting", 0.85);
    }
  }, [landmarks,onGestureDetected]);

  const handleStart = async () => {
    setIsActive(true);
    await initMediaPipe();
  };

  const handleStop = () => {
    setIsActive(false);
    stopDetection();
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-0" autoPlay playsInline muted />
        <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="text-6xl mb-4">??</div>
              <p className="text-white text-lg font-medium">ISL Camera</p>
              <p className="text-gray-400 text-sm mt-1">Sign language detection</p>
            </div>
          </div>
        )}
        {isLoaded && (
          <div className="absolute top-3 right-3 flex items-center gap-2 bg-green-500/20 border border-green-500/40 rounded-full px-3 py-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs font-medium">Live</span>
          </div>
        )}
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={handleStart} disabled={isActive} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-xl transition-all">
          {isLoaded ? "Detecting..." : "Start Camera"}
        </button>
        <button onClick={handleStop} disabled={!isActive} className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-xl transition-all">
          Stop
        </button>
      </div>
    </div>
  );
};
