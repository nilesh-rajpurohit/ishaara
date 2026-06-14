"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface MediaPipeState {
  isLoaded: boolean;
  isDetecting: boolean;
  landmarks: HandLandmark[][] | null;
  error: string | null;
}

export const useMediaPipe = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [state, setState] = useState<MediaPipeState>({
    isLoaded: false,
    isDetecting: false,
    landmarks: null,
    error: null,
  });

  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  const initMediaPipe = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const { Hands } = await import("@mediapipe/hands");
      const { Camera } = await import("@mediapipe/camera_utils");
      const hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });
      hands.onResults((results: any) => {
        setState((prev) => ({
          ...prev,
          landmarks: results.multiHandLandmarks?.length
            ? results.multiHandLandmarks
            : null,
        }));
      });
      handsRef.current = hands;
      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });
        cameraRef.current = camera;
        await camera.start();
      }
      setState((prev) => ({ ...prev, isLoaded: true, isDetecting: true }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "MediaPipe failed to load",
      }));
    }
  }, [videoRef]);

  const stopDetection = useCallback(() => {
    cameraRef.current?.stop();
    setState((prev) => ({ ...prev, isDetecting: false }));
  }, []);

  useEffect(() => {
    return () => { cameraRef.current?.stop(); };
  }, []);

  return { ...state, initMediaPipe, stopDetection };
};
