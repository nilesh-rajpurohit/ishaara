"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { classifyISLLetter, classifyTwoHands } from "@/lib/islClassifier";
import type { ClassificationResult } from "@/lib/islClassifier";

// ISL sign data — emoji + description based on actual ISL chart
const ISL_SIGNS: Record<string, { emoji: string; desc: string; hands: 1 | 2 }> = {
  A: { emoji: "✊✊", desc: "Both fists together, thumbs up", hands: 2 },
  B: { emoji: "🖐", desc: "Four fingers up, thumb tucked", hands: 1 },
  C: { emoji: "🤏", desc: "Curved hand forming C shape", hands: 1 },
  D: { emoji: "☝️", desc: "Index up, thumb touches middle", hands: 1 },
  E: { emoji: "✊", desc: "All fingers curled, thumb tucked", hands: 1 },
  F: { emoji: "👌", desc: "Index+thumb pinch, 3 fingers up", hands: 1 },
  G: { emoji: "👉", desc: "Index+thumb point sideways", hands: 1 },
  H: { emoji: "🤞", desc: "Index+middle point horizontal", hands: 1 },
  I: { emoji: "🤙", desc: "Pinky finger only up", hands: 1 },
  K: { emoji: "✌️", desc: "Index+middle up, thumb between", hands: 1 },
  L: { emoji: "🤙", desc: "Index up + thumb out (L shape)", hands: 1 },
  M: { emoji: "🤜", desc: "3 fingers over tucked thumb", hands: 1 },
  N: { emoji: "✌️", desc: "2 fingers over tucked thumb", hands: 1 },
  O: { emoji: "👌", desc: "All tips meet thumb forming O", hands: 1 },
  P: { emoji: "🤞", desc: "Index+middle pointing downward", hands: 1 },
  Q: { emoji: "👇", desc: "Index+thumb pointing down", hands: 1 },
  R: { emoji: "🤞", desc: "Index+middle crossed", hands: 2 },
  S: { emoji: "✊", desc: "Fist, thumb over fingers", hands: 1 },
  T: { emoji: "👍", desc: "Thumb between index+middle", hands: 1 },
  U: { emoji: "✌️", desc: "Index+middle up close together", hands: 1 },
  V: { emoji: "✌️", desc: "Index+middle spread (peace sign)", hands: 1 },
  W: { emoji: "🤟", desc: "Index+middle+ring up spread", hands: 1 },
  X: { emoji: "🤞", desc: "Index fingers crossed (2 hands)", hands: 2 },
  Y: { emoji: "🤙", desc: "Thumb+pinky out (shaka)", hands: 1 },
};

const SIGN_KEYS = Object.keys(ISL_SIGNS);

export default function ISLTranslatePage() {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const [isActive,  setIsActive]   = useState(false);
  const [isLoaded,  setIsLoaded]   = useState(false);
  const [result,    setResult]     = useState<ClassificationResult>({ letter: "", confidence: 0 });
  const [sentence,  setSentence]   = useState<string[]>([]);
  const [lastLetter,setLastLetter] = useState("");
  const [stableCount,setStableCount] = useState(0);
  const [justAdded, setJustAdded]  = useState("");
  const [progress,  setProgress]   = useState(0);
  const [handCount, setHandCount]  = useState(0);
  const handsRef  = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const STABLE_THRESHOLD = 20;

  const handleResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
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

      hands.forEach((landmarks: any, idx: number) => {
        ctx.strokeStyle = idx === 0 ? "#6366f1" : "#ec4899";
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
            setSentence((s) => [...s, classification.letter]);
            setJustAdded(classification.letter);
            setTimeout(() => setJustAdded(""), 700);
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
    const { Hands }  = await import("@mediapipe/hands");
    const { Camera } = await import("@mediapipe/camera_utils");
    const hands = new Hands({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.75,
      minTrackingConfidence: 0.65,
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

  const addSpace = () => setSentence((s) => [...s, " "]);
  const deleteLast = () => setSentence((s) => s.slice(0, -1));
  const clearAll = () => setSentence([]);

  const sentenceText = sentence.join("");
  const words = sentenceText.trim().split(" ").filter(Boolean);

  useEffect(() => { return () => { cameraRef.current?.stop(); }; }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">Home</a>
          <span className="text-gray-600">/</span>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ISL Translation
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* LEFT — Camera */}
          <div className="space-y-4">
            <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-0" autoPlay playsInline muted />
              <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />

              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl mb-2">🤟</div>
                    <p className="text-white font-medium text-sm">ISL Camera</p>
                    <p className="text-gray-500 text-xs mt-1">Show your hand sign to the camera</p>
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
                <div className="absolute top-3 left-3 bg-gray-800/80 rounded-full px-3 py-1">
                  <span className="text-white text-xs">{handCount} hand{handCount > 1 ? "s" : ""}</span>
                </div>
              )}
              {isActive && progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
                  <div
                    className="h-1.5 bg-indigo-500 transition-all duration-75"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={startCamera} disabled={isActive}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-all text-sm">
                {isActive ? "Camera Active" : "Start Camera"}
              </button>
              <button onClick={stopCamera} disabled={!isActive}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-all text-sm">
                Stop
              </button>
            </div>

            {/* Detected letter card */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Detected Sign</p>
              <div className={`text-7xl font-bold min-h-20 flex items-center justify-center transition-all duration-100 ${
                result.letter && result.letter !== "?" ? "text-white" : "text-gray-700"
              }`}>
                {result.letter && result.letter !== "?" ? (
                  <span className="flex flex-col items-center gap-1">
                    <span>{result.letter}</span>
                    {ISL_SIGNS[result.letter] && (
                      <span className="text-2xl">{ISL_SIGNS[result.letter].emoji}</span>
                    )}
                  </span>
                ) : "?"}
              </div>
              {result.letter && result.letter !== "?" && ISL_SIGNS[result.letter] && (
                <p className="text-indigo-300 text-xs mt-1">{ISL_SIGNS[result.letter].desc}</p>
              )}
              {result.confidence > 0 && result.letter !== "?" && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Confidence</span>
                    <span>{Math.round(result.confidence * 100)}%</span>
                  </div>
                  <div className="bg-gray-800 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${result.confidence * 100}%` }} />
                  </div>
                </div>
              )}
              {isActive && progress > 0 && (
                <p className="text-indigo-400 text-xs mt-2">Hold steady… {Math.round(progress)}%</p>
              )}
            </div>
          </div>

          {/* RIGHT — Output */}
          <div className="space-y-4">

            {/* Sentence box */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-xs uppercase tracking-widest">Sentence</p>
                <div className="flex gap-3">
                  <button onClick={addSpace}
                    className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-gray-700">
                    + Space
                  </button>
                  <button onClick={deleteLast}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-700">
                    ⌫ Delete
                  </button>
                  <button onClick={clearAll}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-700">
                    Clear
                  </button>
                </div>
              </div>

              {/* Character-by-character display */}
              <div className="min-h-12 flex flex-wrap gap-1 items-center">
                {sentence.length === 0 ? (
                  <span className="text-gray-600 text-sm">Hold a sign steady to add letters…</span>
                ) : (
                  sentence.map((ch, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center justify-center rounded-lg font-mono font-bold transition-all duration-300 ${
                        ch === " "
                          ? "w-4"
                          : i === sentence.length - 1 && justAdded
                          ? "text-lg w-8 h-8 bg-green-500 text-white scale-125"
                          : "text-lg w-8 h-8 bg-gray-700 text-white"
                      }`}
                    >
                      {ch === " " ? "" : ch}
                    </span>
                  ))
                )}
              </div>

              {/* Full sentence text */}
              {sentenceText.trim().length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-gray-500 text-xs mb-1">Full sentence</p>
                  <p className="text-white text-xl font-medium tracking-wide">{sentenceText}</p>
                  {words.length > 1 && (
                    <p className="text-gray-500 text-xs mt-1">{words.length} words · {sentenceText.replace(/ /g, "").length} letters</p>
                  )}
                </div>
              )}
            </div>

            {/* Supported signs grid with emoji */}
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-xs uppercase tracking-widest">Supported Signs</p>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>🟣 1 hand</span>
                  <span>🩷 2 hands</span>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {SIGN_KEYS.map((letter) => {
                  const sign = ISL_SIGNS[letter];
                  const isDetected = result.letter === letter;
                  const wasJustAdded = justAdded === letter;
                  return (
                    <div
                      key={letter}
                      className={`rounded-xl p-2 border text-center transition-all duration-150 cursor-default select-none ${
                        isDetected
                          ? "bg-indigo-700 border-indigo-400 scale-105 shadow-lg shadow-indigo-500/30"
                          : wasJustAdded
                          ? "bg-green-600 border-green-400 scale-110"
                          : sign.hands === 2
                          ? "bg-pink-950 border-pink-900 hover:border-pink-700"
                          : "bg-gray-800 border-gray-700 hover:border-gray-500"
                      }`}
                    >
                      {/* Letter */}
                      <p className="text-base font-bold text-white leading-none mb-1">{letter}</p>
                      {/* Arrow + emoji */}
                      <p className="text-xs text-gray-400 leading-none mb-1">→</p>
                      <p className="text-lg leading-none">{sign.emoji}</p>
                    </div>
                  );
                })}
              </div>

              {/* Tooltip for currently detected sign */}
              {result.letter && result.letter !== "?" && ISL_SIGNS[result.letter] && (
                <div className="mt-3 p-3 bg-indigo-950 border border-indigo-800 rounded-xl flex items-center gap-3">
                  <span className="text-3xl">{ISL_SIGNS[result.letter].emoji}</span>
                  <div>
                    <p className="text-indigo-200 text-sm font-semibold">{result.letter}</p>
                    <p className="text-gray-400 text-xs">{ISL_SIGNS[result.letter].desc}</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Full Reference Table */}
        <div className="mt-6 bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-4">Complete ISL Reference</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {SIGN_KEYS.map((letter) => {
              const sign = ISL_SIGNS[letter];
              return (
                <div key={letter}
                  className={`rounded-xl p-3 border transition-all ${
                    result.letter === letter
                      ? "bg-indigo-900 border-indigo-500"
                      : "bg-gray-800 border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl font-bold text-white">{letter}</span>
                    <span className="text-gray-500 text-sm">→</span>
                    <span className="text-xl">{sign.emoji}</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-snug">{sign.desc}</p>
                  {sign.hands === 2 && (
                    <span className="inline-block mt-1 text-xs text-pink-400 bg-pink-950 px-1.5 py-0.5 rounded">2 hands</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}