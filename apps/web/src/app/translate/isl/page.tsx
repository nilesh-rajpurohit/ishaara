"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { classifyISLLetter, classifyTwoHands } from "@/lib/islClassifier";
import type { ClassificationResult } from "@/lib/islClassifier";

// Official ISLRTC-based sign data
// hands: 1 = one hand, 2 = two hands required
const ISL_SIGNS: Record<string, { gesture: string; desc: string; hands: 1 | 2 }> = {
  // Two-hand signs (from ISLRTC official chart)
  A: { gesture: "✊✊", desc: "Both fists touching side by side", hands: 2 },
  B: { gesture: "🖐🖐", desc: "Both open palms facing out together", hands: 2 },
  F: { gesture: "👌🖐", desc: "One hand pinch, other open", hands: 2 },
  G: { gesture: "👉👈", desc: "Both hands index+thumb point toward each other", hands: 2 },
  H: { gesture: "🤞🤞", desc: "Both hands index+middle horizontal", hands: 2 },
  K: { gesture: "☝️🖐", desc: "One index up, other hand open", hands: 2 },
  M: { gesture: "🖐🖐", desc: "Both open palms spread facing each other", hands: 2 },
  N: { gesture: "🖐🖐", desc: "Both open palms, four fingers each", hands: 2 },
  R: { gesture: "🤜🤛", desc: "Both fists clasped/interlocked", hands: 2 },
  S: { gesture: "✊✊", desc: "Both fists stacked vertically", hands: 2 },
  W: { gesture: "🤟🤟", desc: "Three fingers up on both hands", hands: 2 },
  X: { gesture: "☝️☝️", desc: "Both index fingers crossed over each other", hands: 2 },
  Z: { gesture: "☝️✊", desc: "Index up on one hand, fist on other", hands: 2 },
  // Single-hand signs
  C: { gesture: "🤏", desc: "Single hand curved in C shape", hands: 1 },
  D: { gesture: "👆", desc: "Index+thumb pinch pointing up", hands: 1 },
  E: { gesture: "☝️", desc: "Index hooked down, thumb out", hands: 1 },
  I: { gesture: "☝️", desc: "Index pointing up with thumb out", hands: 1 },
  J: { gesture: "🪝", desc: "Index hooked, thumb out", hands: 1 },
  L: { gesture: "🤙", desc: "Index up + thumb out at 90° (L shape)", hands: 1 },
  O: { gesture: "👌", desc: "All fingertips meet thumb forming O", hands: 1 },
  P: { gesture: "👇", desc: "Index pointing down, thumb out", hands: 1 },
  Q: { gesture: "👇", desc: "Thumb + index both point down", hands: 1 },
  T: { gesture: "👍", desc: "Thumb between index+middle fingers", hands: 1 },
  U: { gesture: "✌️", desc: "Index + middle up close together", hands: 1 },
  V: { gesture: "✌️", desc: "Index + middle spread apart (peace)", hands: 1 },
  Y: { gesture: "🤙", desc: "Thumb + pinky out (shaka)", hands: 1 },
  // Numbers
  "0": { gesture: "👌", desc: "O shape — thumb meets index", hands: 1 },
  "1": { gesture: "☝️", desc: "Index finger only pointing up", hands: 1 },
  "2": { gesture: "✌️", desc: "Index + middle spread up", hands: 1 },
  "3": { gesture: "🤟", desc: "Index + middle + ring up", hands: 1 },
  "4": { gesture: "🖖", desc: "All four fingers up, thumb tucked", hands: 1 },
  "5": { gesture: "🖐", desc: "Open hand, all five fingers", hands: 1 },
  "6": { gesture: "🤙", desc: "Thumb touches pinky, 3 fingers up", hands: 1 },
  "7": { gesture: "🤞", desc: "Thumb touches ring, rest up", hands: 1 },
  "8": { gesture: "🤌", desc: "Thumb touches middle, index+pinky up", hands: 1 },
  "9": { gesture: "👌", desc: "Thumb+index circle, others curled", hands: 1 },
};

const TWO_HAND_LETTERS = Object.entries(ISL_SIGNS)
  .filter(([, v]) => v.hands === 2)
  .map(([k]) => k);

const ONE_HAND_LETTERS = Object.entries(ISL_SIGNS)
  .filter(([, v]) => v.hands === 1 && isNaN(Number(k)))
  .map(([k]) => k);

const NUMBERS = ["0","1","2","3","4","5","6","7","8","9"];

// Get all sign keys in order
const ALL_KEYS = [
  ...Object.keys(ISL_SIGNS).filter(k => isNaN(Number(k))).sort(),
  ...NUMBERS,
];

export default function ISLTranslatePage() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isActive,    setIsActive]    = useState(false);
  const [isLoaded,    setIsLoaded]    = useState(false);
  const [result,      setResult]      = useState<ClassificationResult>({ letter: "", confidence: 0 });
  const [sentence,    setSentence]    = useState<string>("");
  const [lastLetter,  setLastLetter]  = useState("");
  const [stableCount, setStableCount] = useState(0);
  const [justAdded,   setJustAdded]   = useState("");
  const [progress,    setProgress]    = useState(0);
  const [handCount,   setHandCount]   = useState(0);
  const [isSpeaking,  setIsSpeaking]  = useState(false);

  const handsRef  = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastSpokenRef = useRef<string>("");
  const STABLE_THRESHOLD = 22;

  // ── Text-to-speech helper ──────────────────────────────────────────────────
  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!text || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = 0.92;
    utt.pitch = 1;
    utt.lang  = "en-US";
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => { setIsSpeaking(false); onDone?.(); };
    window.speechSynthesis.speak(utt);
  }, []);

  // Speak just-detected letter
  const speakLetter = useCallback((letter: string) => {
    if (letter === lastSpokenRef.current) return;
    lastSpokenRef.current = letter;
    // Say the letter name clearly
    const label = ISL_SIGNS[letter] ? letter : letter;
    speak(label);
  }, [speak]);

  // ── Camera result handler ──────────────────────────────────────────────────
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
        ctx.lineWidth   = 2;
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
            // ── ADD LETTER TO SENTENCE ──
            setSentence((s) => s + classification.letter);
            setJustAdded(classification.letter);
            speakLetter(classification.letter);
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
  }, [lastLetter, speakLetter]);

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
    window.speechSynthesis?.cancel();
    setIsActive(false);
    setIsLoaded(false);
    setResult({ letter: "", confidence: 0 });
    setProgress(0);
    setStableCount(0);
  };

  useEffect(() => {
    return () => {
      cameraRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const readSentence = () => {
    if (sentence.trim()) speak(sentence);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-white text-sm">Home</a>
          <span className="text-gray-600">/</span>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ISL Translation
          </h1>
        </div>

        {/* ── Main grid ── */}
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
                    <p className="text-white text-sm font-medium">ISL Camera</p>
                    <p className="text-gray-500 text-xs mt-1">Show your hand sign to start</p>
                  </div>
                </div>
              )}
              {isLoaded && (
                <div className="absolute top-3 right-3 flex items-center gap-2 bg-green-500/20 border border-green-500/40 rounded-full px-3 py-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-xs">Live</span>
                </div>
              )}
              {isActive && handCount > 0 && (
                <div className="absolute top-3 left-3 bg-gray-900/80 rounded-full px-3 py-1">
                  <span className="text-white text-xs">{handCount} hand{handCount > 1 ? "s" : ""}</span>
                </div>
              )}
              {isActive && progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
                  <div className="h-1.5 bg-indigo-500 transition-all duration-75" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={startCamera} disabled={isActive}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm transition-all">
                {isActive ? "Camera Active" : "Start Camera"}
              </button>
              <button onClick={stopCamera} disabled={!isActive}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm transition-all">
                Stop
              </button>
            </div>

            {/* Detected sign card */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Detected Sign</p>
              <div className={`text-8xl font-bold min-h-24 flex items-center justify-center transition-all duration-100 ${
                result.letter && result.letter !== "?" ? "text-white" : "text-gray-700"
              }`}>
                {result.letter && result.letter !== "?" ? (
                  <div className="flex flex-col items-center gap-1">
                    <span>{result.letter}</span>
                    {ISL_SIGNS[result.letter] && (
                      <span className="text-3xl">{ISL_SIGNS[result.letter].gesture}</span>
                    )}
                  </div>
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
                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${result.confidence * 100}%` }} />
                  </div>
                </div>
              )}
              {isActive && progress > 0 && (
                <p className="text-indigo-400 text-xs mt-2">Hold steady… {Math.round(progress)}%</p>
              )}
            </div>
          </div>

          {/* RIGHT — Sentence + Signs */}
          <div className="space-y-4">

            {/* ── Sentence Box ── */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-xs uppercase tracking-widest">Sentence</p>
                <div className="flex gap-2">
                  <button onClick={() => setSentence((s) => s + " ")}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-2 py-1 rounded-lg transition-all">
                    Space
                  </button>
                  <button onClick={() => setSentence((s) => s.slice(0, -1))}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-red-400 px-2 py-1 rounded-lg transition-all">
                    ⌫
                  </button>
                  <button onClick={() => { setSentence(""); lastSpokenRef.current = ""; }}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-red-400 px-2 py-1 rounded-lg transition-all">
                    Clear
                  </button>
                </div>
              </div>

              {/* Letter tiles */}
              <div className="min-h-14 flex flex-wrap gap-1.5 items-center mb-3">
                {sentence.length === 0 ? (
                  <span className="text-gray-600 text-sm">Hold a sign steady to add letters…</span>
                ) : (
                  sentence.split("").map((ch, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center justify-center font-mono font-bold rounded-lg transition-all duration-200 ${
                        ch === " "
                          ? "w-3 h-8"
                          : i === sentence.length - 1 && justAdded
                          ? "w-8 h-8 text-base bg-green-500 text-white scale-125 shadow-lg shadow-green-500/40"
                          : "w-8 h-8 text-base bg-indigo-900 border border-indigo-700 text-white"
                      }`}
                    >
                      {ch === " " ? "" : ch}
                    </span>
                  ))
                )}
              </div>

              {/* Full readable sentence */}
              {sentence.trim().length > 0 && (
                <div className="border-t border-gray-800 pt-3">
                  <p className="text-white text-lg font-medium tracking-wide leading-relaxed break-all">
                    {sentence}
                  </p>
                </div>
              )}

              {/* Audio controls */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={readSentence}
                  disabled={!sentence.trim() || isSpeaking}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-xl transition-all"
                >
                  {isSpeaking ? (
                    <>
                      <span className="animate-pulse">🔊</span> Speaking…
                    </>
                  ) : (
                    <>🔊 Read Sentence</>
                  )}
                </button>
                <button
                  onClick={() => window.speechSynthesis?.cancel()}
                  disabled={!isSpeaking}
                  className="px-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm rounded-xl transition-all"
                >
                  ⏹
                </button>
              </div>
            </div>

            {/* ── Supported Signs Grid ── */}
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-xs uppercase tracking-widest">Signs Reference</p>
                <div className="flex gap-3 text-xs">
                  <span className="text-indigo-400">● 1 hand</span>
                  <span className="text-pink-400">● 2 hands</span>
                </div>
              </div>

              {/* Letters */}
              <p className="text-gray-600 text-xs mb-2">Letters A–Z</p>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 mb-4">
                {Object.keys(ISL_SIGNS).filter(k => isNaN(Number(k))).sort().map((letter) => {
                  const sign = ISL_SIGNS[letter];
                  const isDetected = result.letter === letter;
                  const wasAdded   = justAdded === letter;
                  return (
                    <div key={letter}
                      className={`rounded-xl p-2 border text-center transition-all duration-150 ${
                        isDetected
                          ? "bg-indigo-700 border-indigo-400 scale-110 shadow-lg shadow-indigo-500/30"
                          : wasAdded
                          ? "bg-green-600 border-green-400 scale-115"
                          : sign.hands === 2
                          ? "bg-pink-950/60 border-pink-900"
                          : "bg-gray-800 border-gray-700"
                      }`}
                    >
                      <p className="text-white font-bold text-sm leading-none">{letter}</p>
                      <p className="text-gray-400 text-xs leading-none my-0.5">→</p>
                      <p className="text-base leading-none">{sign.gesture}</p>
                    </div>
                  );
                })}
              </div>

              {/* Numbers */}
              <p className="text-gray-600 text-xs mb-2">Numbers 0–9</p>
              <div className="grid grid-cols-5 gap-2">
                {NUMBERS.map((num) => {
                  const sign = ISL_SIGNS[num];
                  const isDetected = result.letter === num;
                  return (
                    <div key={num}
                      className={`rounded-xl p-2 border text-center transition-all duration-150 ${
                        isDetected
                          ? "bg-indigo-700 border-indigo-400 scale-110 shadow-lg shadow-indigo-500/30"
                          : "bg-gray-800 border-gray-700"
                      }`}
                    >
                      <p className="text-white font-bold text-sm leading-none">{num}</p>
                      <p className="text-gray-400 text-xs leading-none my-0.5">→</p>
                      <p className="text-base leading-none">{sign.gesture}</p>
                    </div>
                  );
                })}
              </div>

              {/* Active sign tooltip */}
              {result.letter && result.letter !== "?" && ISL_SIGNS[result.letter] && (
                <div className="mt-3 p-3 bg-indigo-950 border border-indigo-800 rounded-xl flex items-center gap-3">
                  <span className="text-3xl">{ISL_SIGNS[result.letter].gesture}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg">{result.letter}</span>
                      {ISL_SIGNS[result.letter].hands === 2 && (
                        <span className="text-pink-400 text-xs bg-pink-950 px-1.5 py-0.5 rounded">2 hands</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs">{ISL_SIGNS[result.letter].desc}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Full reference table ── */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-1">Complete ISL Reference (ISLRTC Official)</h2>
          <p className="text-gray-600 text-xs mb-4">Click any card to manually add that letter to your sentence</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {ALL_KEYS.map((key) => {
              const sign = ISL_SIGNS[key];
              if (!sign) return null;
              return (
                <button
                  key={key}
                  onClick={() => setSentence((s) => s + key)}
                  className={`rounded-xl p-3 border text-left transition-all hover:scale-105 active:scale-95 ${
                    result.letter === key
                      ? "bg-indigo-900 border-indigo-500 shadow-indigo-500/20 shadow-lg"
                      : sign.hands === 2
                      ? "bg-pink-950/40 border-pink-900/60 hover:border-pink-700"
                      : "bg-gray-800 border-gray-700 hover:border-gray-500"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold text-lg">{key}</span>
                    <span className="text-gray-500 text-xs">→</span>
                    <span className="text-xl">{sign.gesture}</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-snug">{sign.desc}</p>
                  {sign.hands === 2 && (
                    <span className="inline-block mt-1 text-xs text-pink-400 bg-pink-950 px-1.5 py-0.5 rounded">2 hands</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}