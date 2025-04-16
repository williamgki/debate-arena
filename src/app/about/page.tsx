// src/app/about/page.tsx

import NextLink from "next/link";

export default function About() {
  return (
    <main className="min-h-screen px-8 py-12 bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-10">
        <h1 className="text-3xl font-bold text-center">🤔 About Debate Arena</h1>
        <p>
          Debate Arena is a platform designed to explore and evaluate AI debates and argumentation capabilities. The project was created to foster insights into AI behavior, test innovative oversight methods, and stimulate new approaches in AI safety.
        </p>
        <p>
          Connect{" "}
          <NextLink href="https://www.linkedin.com/in/wikirby/" legacyBehavior>
            <a className="text-blue-600 hover:underline">LinkedIn</a>
          </NextLink>
          .
        </p>
        <p>
          You can also reach me at: williamgkirby&#64;gmail.com
        </p>
        <p>
          Donations of compute are welcome &mdash; as API usage is currently funded by my government salary.
        </p>
        {/* Discrete Home Link */}
        <div className="text-center mt-8">
          <NextLink href="/" legacyBehavior>
            <a className="text-gray-500 hover:text-gray-700 transition">
              Home
            </a>
          </NextLink>
        </div>
      </div>
    </main>
  );
}
