"use client";
import { useState, useRef, useCallback } from "react";

export interface VoiceRecorderState {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  audioLevel: number;
}

export const useVoiceRecorder = (language?: string) => {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    isProcessing: false,
    transcript: "",
    error: null,
    audioLevel: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const monitorLevel = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const level = data.reduce((a, b) => a + b, 0) / data.length;
    setState((prev) => ({ ...prev, audioLevel: Math.min(level / 128, 1) }));
    animFrameRef.current = requestAnimationFrame(monitorLevel);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((t) => t.stop());

        setState((prev) => ({ ...prev, isRecording: false, isProcessing: true, audioLevel: 0 }));

        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", blob, "recording.webm");
          if (language) formData.append("language", language);

          const res = await fetch("http://localhost:8001/asr/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Transcription failed");

          const data = await res.json();
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            transcript: data.text || "",
            error: null,
          }));
        } catch (err) {
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            error: "Could not transcribe. Try again.",
          }));
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      monitorLevel();
      setState((prev) => ({ ...prev, isRecording: true, error: null, transcript: "" }));
    } catch (err) {
      setState((prev) => ({ ...prev, error: "Microphone access denied." }));
    }
  }, [language, monitorLevel]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const clearTranscript = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: "", error: null }));
  }, []);

  return { ...state, startRecording, stopRecording, clearTranscript };
};
