"use client";
import { useState, useRef } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";

const generateId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default function LiveTranslatePage() {
  const sessionIdRef = useRef<string>(generateId());
  const userIdRef = useRef<string>("user-" + Math.random().toString(36).substring(2, 6));
  const [language, setLanguage] = useState("hi");
  const [inputText, setInputText] = useState("");

  const { isConnected, messages, remoteUsers, sendTranslation } = useWebRTC({
    sessionId: sessionIdRef.current,
    userId: userIdRef.current,
    language,
  });

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendTranslation(inputText);
    setInputText("");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Live Translation
          </h1>
          <p className="text-gray-400 mt-2">Real-time peer-to-peer translation session</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Session ID</p>
            <p className="text-white font-mono text-xl font-bold">{sessionIdRef.current}</p>
            <p className="text-gray-500 text-xs mt-1">Share this with others</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              <span className="text-white font-medium">{isConnected ? "Connected" : "Connecting..."}</span>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Participants</p>
            <p className="text-white font-bold text-xl">{remoteUsers.length + 1}</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 mb-4">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Messages</h2>
          </div>
          <div className="p-4 h-64 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600">
                <p>Waiting for messages...</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-indigo-400 text-xs font-medium">{msg.fromUserId}</span>
                    <span className="text-gray-600 text-xs">{msg.language}</span>
                    <span className="text-gray-600 text-xs ml-auto">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-white">{msg.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500">
            <option value="hi">Hindi</option>
            <option value="en">English</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
            <option value="bn">Bengali</option>
            <option value="mr">Marathi</option>
            <option value="gu">Gujarati</option>
            <option value="kn">Kannada</option>
            <option value="ml">Malayalam</option>
            <option value="pa">Punjabi</option>
          </select>
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type to translate..." className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500" />
          <button onClick={handleSend} disabled={!isConnected || !inputText.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-xl transition-all">
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
