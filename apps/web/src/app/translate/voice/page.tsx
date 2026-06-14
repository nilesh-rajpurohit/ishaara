"use client";
import { useState } from "react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

const LANGUAGES = [
  { code: "hi", name: "Hindi" },
  { code: "en", name: "English" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "bn", name: "Bengali" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "pa", name: "Punjabi" },
];

export default function VoiceTranslatePage() {
  const [language, setLanguage] = useState("hi");
  const [targetLang, setTargetLang] = useState("en");
  const [translation, setTranslation] = useState("");
  const [translating, setTranslating] = useState(false);

  const { isRecording, isProcessing, transcript, error, audioLevel, startRecording, stopRecording, clearTranscript } = useVoiceRecorder(language);

  const handleTranslate = async () => {
    if (!transcript.trim()) return;
    setTranslating(true);
    try {
      const res = await fetch("http://localhost:8001/translate/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: transcript,
          source_lang: language,
          target_lang: targetLang,
        }),
      });
      const data = await res.json();
      setTranslation(data.translated_text || "");
    } catch {
      setTranslation("Translation failed. Try again.");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">Home</a>
          <span className="text-gray-600">/</span>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Voice Translation
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">Speaking In</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500">
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">Translate To</label>
            <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500">
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center mb-6">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className={`absolute w-32 h-32 rounded-full transition-all duration-150 ${isRecording ? "bg-red-500/20 scale-110" : "bg-gray-800"}`}
              style={{ transform: isRecording ? `scale(${1.1 + audioLevel * 0.4})` : "scale(1)" }}
            />
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all z-10 ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : "bg-indigo-600 hover:bg-indigo-700"
              } disabled:opacity-50`}
            >
              {isProcessing ? "?" : isRecording ? "?" : "??"}
            </button>
          </div>

          <p className="text-gray-400 text-sm">
            {isProcessing
              ? "Transcribing with Whisper..."
              : isRecording
              ? "Recording... tap to stop"
              : "Tap the mic to start speaking"}
          </p>

          {isRecording && (
            <div className="flex items-center justify-center gap-1 mt-4">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-400 rounded-full transition-all duration-75"
                  style={{ height: `${8 + audioLevel * 32 * Math.sin((i + 1) * 0.5) * Math.random()}px` }}
                />
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {transcript && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Transcript</p>
              <button onClick={clearTranscript} className="text-gray-500 hover:text-white text-xs transition-colors">Clear</button>
            </div>
            <p className="text-white text-lg">{transcript}</p>
            <button
              onClick={handleTranslate}
              disabled={translating}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-xl transition-all text-sm"
            >
              {translating ? "Translating..." : "Translate"}
            </button>
          </div>
        )}

        {translation && (
          <div className="bg-gray-900 rounded-2xl border border-indigo-500/30 p-6">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Translation</p>
            <p className="text-white text-lg">{translation}</p>
          </div>
        )}
      </div>
    </main>
  );
}
