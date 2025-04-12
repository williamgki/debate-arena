'use client';

import { useSearchParams } from 'next/navigation';

export default function DebatePreviewPage() {
  const params = useSearchParams();

  const debaterA = params.get('a');
  const debaterB = params.get('b');
  const judge = params.get('judge');
  const topic = params.get('topic');

  return (
    <main className="min-h-screen px-8 py-12 text-gray-800 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧠 Debate Preview</h1>

        <p><strong>Topic:</strong> {topic}</p>
        <p><strong>Debater A:</strong> {debaterA}</p>
        <p><strong>Debater B:</strong> {debaterB}</p>
        <p><strong>Judge:</strong> {judge}</p>

        <div className="mt-10 text-gray-600">
          <p>This is a placeholder. In the next step, you’ll implement debate logic and argument trees.</p>
        </div>
      </div>
    </main>
  );
}
export const dynamic = 'force-dynamic';
