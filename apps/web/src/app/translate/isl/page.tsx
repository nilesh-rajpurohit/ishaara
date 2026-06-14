"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { classifyISLLetter, classifyTwoHands } from "@/lib/islClassifier";
import type { ClassificationResult } from "@/lib/islClassifier";

const SUPPORTED = ["A","B","C","D","E","F","G","H","I","L","O","U","V","W","Y"];

export default function ISLTranslatePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [result, setResult] = useState<ClassificationResult>({ letter: "", confidence: 0 });
  const [sentence, setSentence] = useState<string>("");
  const [lastLetter, setLastLetter] = useState("");
  const [stableCount, setStableCount] = useState(0);
  const [justAdded, setJustAdded] = useState("");
  const [progress, setProgress] = useState(0);
  const [handCount, setHandCount] = useState(0);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const STABLE_THRESHOLD = 20;

  const handleResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const hands = results.multiHandLandmarks || [];
    setHandCount(hands.length);

    if (hands.length > 0) {
      const connections = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],
        [0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],
        [5,9],[9,13],[13,17],
      ];

      const colors = ["#6366f1", "#ec4899"];

      hands.forEach((landmarks: any, idx: number) => {
        ctx.strokeStyle = colors[idx] || "#6366f1";
        ctx.lineWidth = 2;
        connections.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(landmarks[a].x * canvas.width, landmarks[a].y * canvas.height);
          ctx.lineTo(landmarks[b].x * canvas.width, landmarks[b].y * canvas.height);
          ctx.stroke();
        });
        landmarks.forEach((pt: any) => {
          ctx.beginPath();
          ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 4, 0, 2 * Math.PI);
          ctx.fillStyle = idx === 0 ? "#a78bfa" : "#f472b6";
          ctx.fill();
        });
      });

      const classification = hands.length === 2
        ? classifyTwoHands(hands[0], hands[1])
        : classifyISLLetter(hands[0]);

      setResult(classification);

      if (
        classification.letter === lastLetter &&
        classification.letter !== "" &&
        classification.letter !== "?"
      ) {
        setStableCount((prev) => {
          const next = prev + 1;
          setProgress(Math.min((next / STABLE_THRESHOLD) * 100, 100));
          if (next >= STABLE_THRESHOLD) {
            setSentence((s) => s + classification.letter);
            setJustAdded(classification.letter);
            setTimeout(() => setJustAdded(""), 600);
            setProgress(0);
            return 0;
          }
          return next;
        });
      } else {
        setLastLetter(classification.letter);
        setStableCount(0);
        setProgress(0);
      }
    } else {
      setResult({ letter: "", confidence: 0 });
      setStableCount(0);
      setProgress(0);
    }
  }, [lastLetter]);

  const startCamera = async () => {
    const { Hands } = await import("@mediapipe/hands");
    const { Camera } = await import("@mediapipe/camera_utils");

    const hands = new Hands({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6,
    });

    hands.onResults(handleResults);
    handsRef.current = hands;

    if (videoRef.current) {
      const cam = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) await hands.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      cameraRef.current = cam;
      await cam.start();
    }

    setIsLoaded(true);
    setIsActive(true);
  };

  const stopCamera = () => {
    cameraRef.current?.stop();
    setIsActive(false);
    setIsLoaded(false);
    setResult({ letter: "", confidence: 0 });
    setProgress(0);
    setStableCount(0);
  };

  useEffect(() => {
    return () => { cameraRef.current?.stop(); };
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">Home</a>
          <span className="text-gray-600">/</span>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ISL Translation
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-0" autoPlay playsInline muted />
              <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-3">??</div>
                    <p className="text-white font-medium">ISL Camera</p>
                    <p className="text-gray-500 text-sm mt-1">Supports 1 and 2 hands</p>
                  </div>
                </div>
              )}
              {isLoaded && (
                <div className="absolute top-3 right-3 flex items-center gap-2 bg-green-500/20 border border-green-500/40 rounded-full px-3 py-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-xs font-medium">Live</span>
                </div>
              )}
              {isActive && handCount > 0 && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-gray-800/80 rounded-full px-3 py-1">
                  <span className="text-white text-xs">{handCount} hand{handCount > 1 ? "s" : ""} detected</span>
                </div>
              )}
              {isActive && progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                  <div className="h-1 bg-indigo-500 transition-all duration-75" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={startCamera} disabled={isActive} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all">
                {isActive ? "Camera Active" : "Start Camera"}
              </button>
              <button onClick={stopCamera} disabled={!isActive} className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all">
                Stop
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Detected Letter</p>
              <div className={`text-8xl font-bold mb-3 min-h-24 flex items-center justify-center transition-all duration-150 ${
                result.letter && result.letter !== "?" ? "text-white scale-110" : "text-gray-600"
              }`}>
                {result.letter || "?"}
              </div>
              {result.confidence > 0 && result.letter !== "?" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Confidence</span>
                    <span>{Math.round(result.confidence * 100)}%</span>
                  </div>
                  <div className="bg-gray-800 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${result.confidence * 100}%` }} />
                  </div>
                </div>
              )}
              {isActive && progress > 0 && (
                <p className="text-indigo-400 text-xs mt-3">Hold steady... {Math.round(progress)}%</p>
              )}
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Sentence</p>
                <div className="flex gap-3">
                  <button onClick={() => setSentence((s) => s.slice(0, -1))} className="text-gray-500 hover:text-white text-xs transition-colors">Delete</button>
                  <button onClick={() => setSentence("")} className="text-gray-500 hover:text-white text-xs transition-colors">Clear</button>
                </div>
              </div>
              <p className="text-white text-2xl font-mono min-h-16 break-all">
                {sentence || <span className="text-gray-600 text-base">Hold a sign steady to add letters...</span>}
              </p>
            </div>

            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Supported Signs</p>
                <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span>1 hand</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-pink-500 rounded-full"></span>2 hands</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED.map((l) => (
                  <span
                    key={l}
                    className={`text-xs font-mono px-3 py-2 rounded-lg border transition-all duration-150 ${
                      result.letter === l
                        ? "bg-indigo-600 border-indigo-400 text-white scale-110 shadow-lg shadow-indigo-500/30"
                        : justAdded === l
                        ? "bg-green-500 border-green-400 text-white scale-125"
                        : "bg-gray-800 border-gray-700 text-gray-300"
                    }`}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
