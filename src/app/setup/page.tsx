// src/app/setup/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from "next/link";

export default function SetupPage() {
  const router = useRouter();

  const [debaterA, setDebaterA] = useState('human');
  const [debaterB, setDebaterB] = useState('ai');
  const [topic, setTopic] = useState('AI will be safe by default - concerns are overblown like Y2K?');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const queryParams = new URLSearchParams({
      debaterA,
      debaterB,
      topic,
    });

    router.push(`/debate/session?${queryParams.toString()}`);
  };

  return (
    <main className="min-h-screen px-8 py-12 bg-white text-gray-900">
      <div className="max-w-xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-center">🧪 Set Up Your Debate</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-semibold mb-1">Debater A:</label>
            <select
              className="w-full p-2 border rounded"
              value={debaterA}
              onChange={(e) => setDebaterA(e.target.value)}
            >
              <option value="human">Human</option>
              <option value="ai">AI</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Debater B:</label>
            <select
              className="w-full p-2 border rounded"
              value={debaterB}
              onChange={(e) => setDebaterB(e.target.value)}
            >
              <option value="human">Human</option>
              <option value="ai">AI</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Debate Topic:</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 transition"
          >
            🚀 Start Debate
          </button>
        </form>

        {/* Discrete About Link */}
        <div className="text-center mt-8">
          <Link href="/about" legacyBehavior>
            <a className="text-gray-500 hover:text-gray-700 transition">
              About
            </a>
          </Link>
        </div>
      </div>
    </main>
  );
}
