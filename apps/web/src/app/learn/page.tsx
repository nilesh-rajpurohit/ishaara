"use client";
import { useState } from "react";

interface Lesson {
  id: string;
  title: string;
  content: string;
  signGloss: string;
  order: number;
}

const SAMPLE_LESSONS: Lesson[] = [
  { id: "1", title: "Greetings", content: "Learn hello and namaste in ISL", signGloss: "HELLO", order: 1 },
  { id: "2", title: "Numbers 1-10", content: "Count from 1 to 10 using ISL", signGloss: "ONE TWO THREE", order: 2 },
  { id: "3", title: "Family Signs", content: "Mother, father, brother, sister", signGloss: "MOTHER FATHER", order: 3 },
  { id: "4", title: "Colors", content: "Learn colors in ISL", signGloss: "RED BLUE GREEN", order: 4 },
  { id: "5", title: "Days of Week", content: "Monday through Sunday in ISL", signGloss: "MONDAY TUESDAY", order: 5 },
];

export default function LearnPage() {
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizResult, setQuizResult] = useState<"correct" | "wrong" | null>(null);
  const [streak, setStreak] = useState(0);

  const handleComplete = (lessonId: string) => {
    setCompleted((prev) => new Set([...prev, lessonId]));
    setStreak((prev) => prev + 1);
    setActiveLesson(null);
  };

  const handleQuiz = () => {
    const correct = quizAnswer.toUpperCase().trim() === activeLesson?.signGloss?.split(" ")[0];
    setQuizResult(correct ? "correct" : "wrong");
    if (correct && activeLesson) {
      setTimeout(() => {
        handleComplete(activeLesson.id);
        setQuizMode(false);
        setQuizAnswer("");
        setQuizResult(null);
      }, 1500);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Learn ISL
            </h1>
            <p className="text-gray-400 mt-1">Indian Sign Language - one lesson at a time</p>
          </div>
          <div className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/40 rounded-xl px-4 py-2">
            <span className="text-2xl">??</span>
            <div>
              <p className="text-orange-400 font-bold text-xl">{streak}</p>
              <p className="text-gray-400 text-xs">streak</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="font-semibold text-white">ISL Basics</h2>
                <div className="mt-2 bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${(completed.size / SAMPLE_LESSONS.length) * 100}%` }}
                  />
                </div>
                <p className="text-gray-400 text-xs mt-1">{completed.size}/{SAMPLE_LESSONS.length} completed</p>
              </div>
              <div className="divide-y divide-gray-800">
                {SAMPLE_LESSONS.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => { setActiveLesson(lesson); setQuizMode(false); setQuizResult(null); }}
                    className={`w-full text-left p-4 flex items-center gap-3 hover:bg-gray-800 transition-all ${activeLesson?.id === lesson.id ? "bg-gray-800" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${completed.has(lesson.id) ? "bg-green-500 text-white" : "bg-gray-700 text-gray-400"}`}>
                      {completed.has(lesson.id) ? "+" : lesson.order}
                    </div>
                    <div>
                      <p className={`font-medium ${completed.has(lesson.id) ? "text-green-400" : "text-white"}`}>{lesson.title}</p>
                      <p className="text-gray-500 text-xs">{lesson.content.substring(0, 40)}...</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {activeLesson ? (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">{activeLesson.title}</h2>
                  <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 rounded-full px-3 py-1 text-xs font-medium">Beginner</span>
                </div>
                {!quizMode ? (
                  <>
                    <div className="bg-gray-800 rounded-2xl p-8 text-center mb-6">
                      <div className="text-8xl mb-4">??</div>
                      <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">Sign Gloss</p>
                      <p className="text-white font-mono text-2xl font-bold">{activeLesson.signGloss}</p>
                    </div>
                    <p className="text-gray-300 mb-6">{activeLesson.content}</p>
                    <div className="flex gap-3">
                      <button onClick={() => setQuizMode(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-all">
                        Take Quiz
                      </button>
                      <button onClick={() => handleComplete(activeLesson.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-xl transition-all">
                        Mark Complete
                      </button>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="bg-gray-800 rounded-2xl p-8 text-center mb-6">
                      <p className="text-gray-400 mb-4">What is the English word for this sign?</p>
                      <div className="text-8xl mb-4">??</div>
                      <p className="text-indigo-400 font-mono text-xl">{activeLesson.signGloss?.split(" ")[0]}</p>
                    </div>
                    {quizResult && (
                      <div className={`rounded-xl p-4 text-center mb-4 ${quizResult === "correct" ? "bg-green-500/20 border border-green-500/40 text-green-400" : "bg-red-500/20 border border-red-500/40 text-red-400"}`}>
                        {quizResult === "correct" ? "Correct! Well done!" : "Not quite. Try again!"}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={quizAnswer}
                        onChange={(e) => setQuizAnswer(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleQuiz()}
                        placeholder="Type your answer..."
                        className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
                      />
                      <button onClick={handleQuiz} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-all">
                        Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="text-6xl mb-4">??</div>
                  <p className="text-white text-lg font-medium">Select a lesson to begin</p>
                  <p className="text-gray-500 text-sm mt-1">Your journey to ISL starts here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
