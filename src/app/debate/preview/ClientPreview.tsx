'use client';

import { useSearchParams } from 'next/navigation';

export default function ClientPreview() {
  const params = useSearchParams();
  const topic = params.get('topic') || 'No topic provided';

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-2">🧠 Debate Preview</h1>
      <p>Topic: <strong>{topic}</strong></p>
    </div>
  );
}
