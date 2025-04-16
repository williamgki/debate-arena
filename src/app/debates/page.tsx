import Link from "next/link";

export default function DebatesPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900">
      <h1 className="text-4xl font-bold mb-4">Coming Soon</h1>
      <p className="text-lg mb-8">
        Our debates feature will be launching soon. In the meantime, why not create your own debate?
      </p>
      <Link
        href="/setup"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
      >
        Create Your Debate
      </Link>
      <p className="mt-4 text-sm text-gray-500">
        Don&apos;t miss out on the latest AI debates!
      </p>
    </main>
  );
}
