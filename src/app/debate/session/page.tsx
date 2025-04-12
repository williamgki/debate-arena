'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

type ArgumentNode = {
  nodeId: string;
  parentId: string | null;
  text: string;
  participantId: string;
  obfuscationFlag: boolean;
  score?: number;
  children: ArgumentNode[];
};

const findNodeById = (node: ArgumentNode, id: string): ArgumentNode | null => {
  if (node.nodeId === id) return node;
  for (const child of node.children) {
    const result = findNodeById(child, id);
    if (result) return result;
  }
  return null;
};

const modelOptions = [
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4.5 Preview', value: 'gpt-4.5-preview' },
  { label: 'O1 Pro', value: 'o1-pro' },
  { label: 'O3 Mini', value: 'o3-mini' },
];

export default function DebateSessionPage() {
  const searchParams = useSearchParams();
  const debaterARole = searchParams.get('debaterA') || 'human';
  const debaterBRole = searchParams.get('debaterB') || 'ai';
  const topic = searchParams.get('topic') || 'Should AI be regulated?';

  const [tree, setTree] = useState<ArgumentNode>({
    nodeId: uuidv4(),
    parentId: null,
    text: topic,
    participantId: 'system',
    obfuscationFlag: false,
    children: [],
  });

  const [debaterAModel, setDebaterAModel] = useState('gpt-3.5-turbo');
  const [debaterBModel, setDebaterBModel] = useState('gpt-3.5-turbo');
  const [judgeModel, setJudgeModel] = useState('gpt-3.5-turbo');

  const buildPromptForDebater = (
    participantId: 'debaterA' | 'debaterB',
    parentText: string
  ): string => {
    const stance = participantId === 'debaterA'
      ? `You are Debater A. You are arguing in **favour** of the following topic: "${topic}".`
      : `You are Debater B. You are arguing **against** the following topic: "${topic}".`;

    return `${stance}\n\nRespond to the following argument:\n"${parentText}"\n\nRespond concisely, then score your own response from 1 to 10.\n\nFormat:\nResponse: <text>\nScore: <number>`;
  };

  const callOpenAIWithScoring = async (
    prompt: string,
    model: string
  ): Promise<{ text: string; score: number }> => {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model }),
      });

      const data = await res.json();
      const match = data.message?.match(/Response:\s*(.*?)\n+Score:\s*(\d+)/is);
      if (match) {
        return {
          text: match[1].trim(),
          score: parseInt(match[2], 10),
        };
      }
      return { text: data.message || '[No response]', score: 0 };
    } catch (err) {
      console.error('Scored OpenAI call failed:', err);
      return { text: '[AI failed to respond]', score: 0 };
    }
  };

  const addAIResponse = async (parentId: string, participantId: 'debaterA' | 'debaterB') => {
    const parentText = findNodeById(tree, parentId)?.text;
    if (!parentText) return;

    const model = participantId === 'debaterA' ? debaterAModel : debaterBModel;
    const fullPrompt = buildPromptForDebater(participantId, parentText);
    const { text, score } = await callOpenAIWithScoring(fullPrompt, model);
    if (score < 6) return;

    const newNode: ArgumentNode = {
      nodeId: uuidv4(),
      parentId,
      text,
      score,
      participantId,
      obfuscationFlag: false,
      children: [],
    };

    const addNodeRecursively = (node: ArgumentNode): ArgumentNode => {
      if (node.nodeId === parentId) {
        return { ...node, children: [...node.children, newNode] };
      } else {
        return { ...node, children: node.children.map(addNodeRecursively) };
      }
    };

    setTree(prev => addNodeRecursively(prev));
  };

  const callAIJudge = async (nodeId: string) => {
    const node = findNodeById(tree, nodeId);
    if (!node) return;

    const judgePrompt = `
You are an impartial judge evaluating a debate argument. 
Your task is to assess the logic, relevance, and persuasiveness of the following argument:

"${node.text}"

After your analysis, you must clearly state the winner of this argument.
Choose only one: **Debater A** or **Debater B**.

Respond in this format:

Critique: <your evaluation>
Winner: Debater A or Debater B
`;

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: judgePrompt, model: judgeModel }),
    });

    const data = await res.json();

    const newNode: ArgumentNode = {
      nodeId: uuidv4(),
      parentId: nodeId,
      text: data.message || '[No judgment provided]',
      participantId: 'judge-ai',
      obfuscationFlag: false,
      children: [],
    };

    const addNodeRecursively = (n: ArgumentNode): ArgumentNode => {
      if (n.nodeId === nodeId) {
        return { ...n, children: [...n.children, newNode] };
      } else {
        return { ...n, children: n.children.map(addNodeRecursively) };
      }
    };

    setTree(prev => addNodeRecursively(prev));
  };

  const runAutonomousDebate = async () => {
    const maxTurns = 8;
    let updatedTree = tree;
    let currentNode = updatedTree;
    let currentTurn: 'debaterA' | 'debaterB' = 'debaterA';

    for (let i = 0; i < maxTurns; i++) {
      const model = currentTurn === 'debaterA' ? debaterAModel : debaterBModel;
      const fullPrompt = buildPromptForDebater(currentTurn, currentNode.text);
      const { text, score } = await callOpenAIWithScoring(fullPrompt, model);
      if (score < 6) break;

      const newNode: ArgumentNode = {
        nodeId: uuidv4(),
        parentId: currentNode.nodeId,
        text,
        score,
        participantId: currentTurn,
        obfuscationFlag: false,
        children: [],
      };

      const addNodeRecursively = (node: ArgumentNode): ArgumentNode => {
        if (node.nodeId === currentNode.nodeId) {
          return { ...node, children: [...node.children, newNode] };
        } else {
          return { ...node, children: node.children.map(addNodeRecursively) };
        }
      };

      updatedTree = addNodeRecursively(updatedTree);
      currentNode = newNode;
      currentTurn = currentTurn === 'debaterA' ? 'debaterB' : 'debaterA';
    }

    setTree(updatedTree);
  };

  const toggleObfuscation = (targetId: string) => {
    const updateFlag = (node: ArgumentNode): ArgumentNode => {
      if (node.nodeId === targetId) {
        return { ...node, obfuscationFlag: !node.obfuscationFlag };
      } else {
        return { ...node, children: node.children.map(updateFlag) };
      }
    };
    setTree(prev => updateFlag(prev));
  };

  const renderNode = (node: ArgumentNode) => (
    <div key={node.nodeId} className="border-l-2 pl-4 mt-4 relative">
      <p className="mb-1">
        <strong>{node.participantId}:</strong>{' '}
        <span className={node.obfuscationFlag ? 'bg-yellow-200 text-yellow-800 px-1 rounded' : ''}>
          {node.text}
        </span>
        {node.score !== undefined && (
          <span className="ml-2 text-sm text-gray-500">(Score: {node.score})</span>
        )}
        {node.obfuscationFlag && (
          <span className="ml-2 text-xs text-yellow-700 font-semibold">⚠️ Obfuscated</span>
        )}
      </p>
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => addAIResponse(node.nodeId, 'debaterA')}
          className="px-2 py-1 bg-blue-600 text-white text-sm rounded"
        >
          ➕ Add as Debater A
        </button>
        <button
          onClick={() => addAIResponse(node.nodeId, 'debaterB')}
          className="px-2 py-1 bg-purple-600 text-white text-sm rounded"
        >
          ➕ Add as Debater B
        </button>
        <button
          onClick={() => callAIJudge(node.nodeId)}
          className="px-2 py-1 bg-slate-800 text-white text-sm rounded"
        >
          🧑‍⚖️ Call AI Judge
        </button>
        <button
          onClick={() => toggleObfuscation(node.nodeId)}
          className="px-2 py-1 bg-yellow-500 text-black text-sm rounded"
        >
          ⚠️ Toggle Obfuscation
        </button>
      </div>
      <div className="ml-4">{node.children.map(renderNode)}</div>
    </div>
  );

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🧠 Live Debate</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block font-semibold mb-1">Model for Debater A</label>
            <select
              value={debaterAModel}
              onChange={(e) => setDebaterAModel(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {modelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Model for Debater B</label>
            <select
              value={debaterBModel}
              onChange={(e) => setDebaterBModel(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {modelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Model for Judge</label>
            <select
              value={judgeModel}
              onChange={(e) => setJudgeModel(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {modelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {debaterARole === 'ai' && debaterBRole === 'ai' && (
          <button
            onClick={runAutonomousDebate}
            className="mb-6 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
          >
            🤖 Run Full AI Debate (8 responses)
          </button>
        )}

        {renderNode(tree)}
      </div>
    </main>
  );
}

