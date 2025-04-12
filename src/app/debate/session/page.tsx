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

  const [model, setModel] = useState('gpt-3.5-turbo');

  const callOpenAIWithScoring = async (prompt: string): Promise<{ text: string; score: number }> => {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${prompt}\n\nRespond concisely, then score your own response from 1 to 10.\n\nFormat:\nResponse: <text>\nScore: <number>`,
          model,
        }),
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

  const addChild = (parentId: string, participantId: string) => {
    const role = participantId === 'debaterA' ? debaterARole : debaterBRole;
    if (role === 'ai') return addAIResponse(parentId, participantId);

    const text = prompt('Enter argument text:');
    if (!text) return;

    const newNode: ArgumentNode = {
      nodeId: uuidv4(),
      parentId,
      text,
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

  const addAIResponse = async (parentId: string, participantId: string) => {
    const parentText = findNodeById(tree, parentId)?.text;
    if (!parentText) return;

    const { text, score } = await callOpenAIWithScoring(parentText);

    // Prune weak arguments
    if (score < 6) return;

    const newNode: ArgumentNode = {
      nodeId: uuidv4(),
      parentId,
      text,
      participantId,
      score,
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

    const judgePrompt = `As an impartial judge, evaluate this argument:

"${node.text}"

Respond with a clear, reasoned verdict or critique.`;

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: judgePrompt, model }),
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

  const downloadJSON = (data: any, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    const flattenTree = (node: ArgumentNode): any[] => {
      const childIds = node.children.map(c => c.nodeId);
      const baseNode = {
        nodeId: node.nodeId,
        parentId: node.parentId,
        text: node.text,
        participantId: node.participantId,
        obfuscationFlag: node.obfuscationFlag,
        score: node.score,
        children: childIds,
        creationTimestamp: new Date().toISOString(),
      };
      return [baseNode, ...node.children.flatMap(flattenTree)];
    };

    const jsonExport = {
      debateId: uuidv4(),
      title: 'Debate Export',
      rootArgumentNodeId: tree.nodeId,
      participants: [
        { participantId: 'debaterA', role: 'DEBATER_A', type: debaterARole.toUpperCase(), displayName: 'Debater A' },
        { participantId: 'debaterB', role: 'DEBATER_B', type: debaterBRole.toUpperCase(), displayName: 'Debater B' },
        { participantId: 'judge1', role: 'JUDGE', type: 'HUMAN', displayName: 'Judge' },
      ],
      argumentNodes: flattenTree(tree),
      verdicts: [],
    };

    downloadJSON(jsonExport, 'debate-export.json');
  };

  const renderNode = (node: ArgumentNode) => (
    <div key={node.nodeId} className="border-l-2 pl-4 mt-4 relative">
      <p className="mb-1">
        <strong>{node.participantId}:</strong>{' '}
        <span className={node.obfuscationFlag ? 'bg-yellow-200 text-yellow-800 px-1 rounded' : ''}>
          {node.text}
        </span>
        {node.obfuscationFlag && (
          <span className="ml-2 text-xs text-yellow-700 font-semibold">⚠️ Obfuscated</span>
        )}
        {node.score !== undefined && (
          <span className="ml-2 text-sm text-gray-500">(Score: {node.score})</span>
        )}
      </p>
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => addChild(node.nodeId, 'debaterA')}
          className="px-2 py-1 bg-blue-600 text-white text-sm rounded"
        >
          ➕ Add as Debater A
        </button>
        <button
          onClick={() => addChild(node.nodeId, 'debaterB')}
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
      <div className="ml-4">{node.children.map(child => renderNode(child))}</div>
    </div>
  );

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🧠 Live Debate</h1>

        <div className="mb-6">
          <label htmlFor="model" className="block font-semibold mb-1">
            🤖 Choose AI Model:
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full max-w-xs p-2 border rounded"
          >
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4o">GPT-4o (2024)</option>
            <option value="gpt-4-0125-preview">GPT-4.5 Preview</option>
            <option value="openai/oaas-mini">O1 Mini</option>
            <option value="openai/oaas-pro">O1 Pro</option>
          </select>
        </div>

        <button
          onClick={handleExport}
          className="mb-6 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          📤 Export Debate as JSON
        </button>

        {renderNode(tree)}
      </div>
    </main>
  );
}
