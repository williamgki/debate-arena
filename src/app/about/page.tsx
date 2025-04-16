import NextLink from "next/link";

export default function About() {
  return (
    <main className="min-h-screen px-8 py-12 bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-10">
        <h1 className="text-3xl font-bold text-center">🤔 About Debate Arena</h1>
        <p>
          Debate Arena is a platform designed to explore and evaluate AI debates and argumentation capabilities. 
          The project was created to foster insights into AI behavior, test innovative oversight methods, and 
          stimulate new approaches in AI safety.
        </p>

        {/* Contact + GitHub */}
        <p>
          You can find all our code and issues on{" "}
          <a
            href="https://github.com/williamgki/debate-arena"
            className="text-purple-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .<br />
          You can also reach me via email at williamgkirby&#64;gmail.com<br />
          (Less actively used) LinkedIn:{" "}
          <NextLink href="https://www.linkedin.com/in/wikirby/" legacyBehavior>
            <a className="text-blue-600 hover:underline">
              linkedin.com/in/wikirby
            </a>
          </NextLink>
        </p>

        <p>
          Donations of compute are welcome 💻⚡ — as API usage is currently funded by my government salary.
        </p>

        {/* Project Roadmap */}
        <h2 className="text-2xl font-semibold mt-8">🚀 Project Roadmap</h2>
        <ul className="list-disc pl-6 space-y-3">
          <li>
            ⚙️ <strong>Core Debate Engine</strong>: Build a stable foundation for AI-vs.-AI 
            and AI-vs.-Human debates on AI safety and alignment topics.
          </li>
          <li>
            🌳 <strong>Branching Discussions</strong> (we are here 🔎): Implement multi-response 
            generation to explore diverse argument paths, with pruning of low-quality branches.
          </li>
          <li>
            💯 <strong>Scoring & Pruning</strong>: Use self-reported scores and an AI “judge” 
            to filter out weaker arguments, focusing on the most insightful threads.
          </li>
          <li>
            🤯 <strong>Obfuscation Testing</strong>: Conduct empirical studies on intentionally 
            confusing or “obfuscated” arguments to gauge debate robustness and detect manipulative tactics.
          </li>
          <li>
            👩‍⚖️ <strong>Simulation of Human Judges</strong>: Investigate how hypothetical human 
            evaluators might scrutinize debates between AI systems that may exceed human-level capabilities.
          </li>
          <li>
            🛠️ <strong>Flexible UI</strong>: Provide an easy-to-configure interface for toggling 
            branching factors, pruning thresholds, obfuscation modes, and manual argument entry.
          </li>
          <li>
            📦 <strong>Standardized JSON</strong>: Develop a consistent schema for storing and 
            retrieving debate states, making it simple to archive, analyze, and revisit prior 
            discussion paths.
          </li>
          <li>
            🤖 <strong>Autonomous Debate Mode</strong>: Automate multi-turn debates using either 
            breadth-first or depth-first exploration to generate and expand promising argument branches.
          </li>
        </ul>

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
