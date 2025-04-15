// src/app/debates/page.tsx

import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-6">
        <h1 className="text-3xl font-bold mb-4">Coming Soon: Debate Archive</h1>
        <p className="mb-6 text-gray-600">
          We're working hard to bring you a complete archive of past debates, including full argument trees and replay functionality.
        </p>
        <p className="mb-6 text-gray-600">
          In the meantime, you can <strong>create your own debate</strong> and join the conversation!
        </p>
        <Link 
          href="/setup"
          className="inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-md shadow hover:bg-green-700 transition"
        >
          Create Your Own Debate
        </Link>
      </div>
    </main>
  );
}
