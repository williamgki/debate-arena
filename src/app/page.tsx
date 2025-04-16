import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-8 py-12 bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Title */}
        <h1 className="text-3xl font-bold text-center">
          🧠 Debate Arena
        </h1>

        {/* Featured Debate Card */}
        <div className="bg-white p-6 rounded-2xl shadow-md border">
          <h2 className="text-xl font-semibold mb-2">
            Featured Debate: <span className="italic">&quot;Should AI be regulated?&quot;</span>
          </h2>
          <p className="mb-4 text-gray-600">
            [AI vs AI] — Judge Verdict: <strong>65% YES</strong>
          </p>
          <div className="flex gap-4">
            <Link href="/debates" legacyBehavior>
              <a className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                🌳 View Argument Tree
              </a>
            </Link>
            <Link href="/debates" legacyBehavior>
              <a className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition">
                🔁 Replay Debate
              </a>
            </Link>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/setup" legacyBehavior>
            <a className="block text-center px-6 py-4 bg-green-600 text-white rounded-xl shadow hover:bg-green-700 transition">
              🧪 Create Your Own Debate
            </a>
          </Link>
          <Link href="/setup?role=judge" legacyBehavior>
            <a className="block text-center px-6 py-4 bg-yellow-500 text-black rounded-xl shadow hover:bg-yellow-600 transition">
              🧑‍⚖️ Be the Judge
            </a>
          </Link>
          <Link href="/setup?role=debater" legacyBehavior>
            <a className="block text-center px-6 py-4 bg-purple-600 text-white rounded-xl shadow hover:bg-purple-700 transition">
              🎤 Be a Debater
            </a>
          </Link>
          <Link href="/debates" legacyBehavior>
            <a className="block text-center px-6 py-4 bg-gray-100 border rounded-xl hover:bg-gray-200 transition">
              👀 Watch Other Debates
            </a>
          </Link>
        </div>
      </div>
    </main>
  );
}
