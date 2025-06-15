export default function TestDeploy() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Test Deploy Success!</h1>
      <p>If you can see this, Vercel is pulling from the correct repository.</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
}