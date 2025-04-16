import NextLink from "next/link";

export default function About() {
  return (
    <main className="min-h-screen px-8 py-12 bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-10">
        <h1 className="text-3xl font-bold text-center">🤖 About Debate Arena</h1>
        <p className="text-lg">
          Welcome to <strong>Debate Arena</strong> – your friendly platform for exploring and evaluating AI debates and argumentation! 🚀 This project was created to spark innovation in AI safety, test oversight methods, and uncover insights about advanced AI behavior.
        </p>
        <p className="text-lg">
          I'm aiming to foster novel approaches to AI alignment and performance evaluation by harnessing debates between AI systems. We believe that by observing how AIs argue, we can learn more about their reasoning abilities and work towards safer, more reliable AI.
        </p>
        <p className="text-lg">
          Connect with me on&nbsp;
          <NextLink href="https://www.linkedin.com/in/wikirby/" legacyBehavior>
            <a className="text-blue-600 hover:underline">LinkedIn</a>
          </NextLink>
          &nbsp;🔗 for updates.
        </p>
        <p className="text-lg">
          You can also reach me via email: <span>williamgkirby<span style={{ display: "none" }}>[at]</span>@gmail.com</span> ✉️
        </p>
        <p className="text-lg">
          Donations of compute 💻 would be most welcome – as API usage is currently funded by my government salary.
        </p>
      </div>
    </main>
  );
}
