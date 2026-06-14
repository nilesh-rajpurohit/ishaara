"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">??</span>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Ishaara</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/learn" className="text-gray-400 hover:text-white transition-colors text-sm">Learn</Link>
          <Link href="/translate/isl" className="text-gray-400 hover:text-white transition-colors text-sm">ISL</Link>
          <Link href="/translate/voice" className="text-gray-400 hover:text-white transition-colors text-sm">Voice</Link>
          <Link href="/translate/live" className="text-gray-400 hover:text-white transition-colors text-sm">Live</Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-gray-300 text-sm">Hi, {user.name.split(" ")[0]}</span>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm transition-colors">Sign Out</button>
            </div>
          ) : (
            <Link href="/auth/login" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all">Sign In</Link>
          )}
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-2 text-indigo-400 text-sm mb-8">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
          Built for 1.4 billion people
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Breaking Every
          <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Language Barrier
          </span>
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-12">
          Real-time Indian Sign Language translation, multilingual voice communication, and interactive ISL learning. Offline-first. Built for India.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/translate/isl" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl transition-all text-lg">
            Start Translating
          </Link>
          <Link href="/learn" className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-8 py-4 rounded-xl transition-all text-lg">
            Learn ISL
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Link href="/translate/isl" className="bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all group">
            <div className="text-4xl mb-4">??</div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">ISL Translation</h3>
            <p className="text-gray-400 text-sm">Sign in front of your camera. Ishaara reads your hands in real time.</p>
          </Link>
          <Link href="/translate/voice" className="bg-gray-900 border border-gray-800 hover:border-green-500/50 rounded-2xl p-6 transition-all group">
            <div className="text-4xl mb-4">??</div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">Voice Translation</h3>
            <p className="text-gray-400 text-sm">Speak in any Indian language. Ishaara transcribes and translates instantly.</p>
          </Link>
          <Link href="/translate/live" className="bg-gray-900 border border-gray-800 hover:border-purple-500/50 rounded-2xl p-6 transition-all group">
            <div className="text-4xl mb-4">??</div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Live Translation</h3>
            <p className="text-gray-400 text-sm">Connect with anyone across 10 Indian languages in real time.</p>
          </Link>
          <Link href="/learn" className="bg-gray-900 border border-gray-800 hover:border-pink-500/50 rounded-2xl p-6 transition-all group">
            <div className="text-4xl mb-4">??</div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">Learn ISL</h3>
            <p className="text-gray-400 text-sm">Interactive lessons, quizzes, and streak tracking.</p>
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <p className="text-4xl font-bold text-indigo-400">1.4B</p>
            <p className="text-gray-400 text-sm mt-1">People in India</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <p className="text-4xl font-bold text-purple-400">22</p>
            <p className="text-gray-400 text-sm mt-1">Official Languages</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <p className="text-4xl font-bold text-pink-400">18M</p>
            <p className="text-gray-400 text-sm mt-1">Deaf Indians</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <p className="text-4xl font-bold text-green-400">0</p>
            <p className="text-gray-400 text-sm mt-1">Barriers Left</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800 px-6 py-8 text-center text-gray-500 text-sm">
        <p>Ishaara - Breaking language barriers for every Indian. Built with purpose.</p>
      </footer>
    </main>
  );
}
