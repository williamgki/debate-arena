// src/app/debate/session/DebateSessionClient.tsx (FINAL RECONSTRUCTED VERSION)
'use client';

// Keep explicit React import (can be removed if build passes without it)
import React from 'react';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

// --- Types and Helpers ---
type ArgumentNode = {
  nodeId: string;
  parentId: string | null;
  text: string;
  participantId: string;
  obfuscationFlag: boolean;
  score?: number;
  children: ArgumentNode[];
};

const addNodeUnderParent = (
  tree: ArgumentNode,
  parentId: string,
  newNode: ArgumentNode
): ArgumentNode => {
  if (tree.nodeId === parentId) {
    const existingChildren = tree.children.filter(c => c.nodeId !== 'live' && c.nodeId !== newNode.nodeId);
    return { ...tree, children: [...existingChildren, newNode] };
  }
  const updatedChildren = tree.children.map(child => addNodeUnderParent(child, parentId, newNode));
  let childrenChanged = updatedChildren.length !== tree.children.length;
  if (!childrenChanged) {
    for (let i = 0; i < updatedChildren.length; i++) {
      if (updatedChildren[i] !== tree.children[i]) {
        childrenChanged = true;
        break;
      }
    }
  }
  return childrenChanged ? { ...tree, children: updatedChildren } : tree;
};

const updateNodeProperty = <K extends keyof ArgumentNode>(
    tree: ArgumentNode,
    targetId: string,
    propertyName: K,
    newValue: ArgumentNode[K]
): ArgumentNode => {
    if (tree.nodeId === targetId) {
        return { ...tree, [propertyName]: newValue };
    }
    const updatedChildren = tree.children.map(child => updateNodeProperty(child, targetId, propertyName, newValue));
    let childrenChanged = updatedChildren.length !== tree.children.length;
    if (!childrenChanged) {
      for (let i = 0; i < updatedChildren.length; i++) {
        if (updatedChildren[i] !== tree.children[i]) {
          childrenChanged = true;
          break;
        }
      }
    }
    return childrenChanged ? { ...tree, children: updatedChildren } : tree;
};

 const findNodeById = (node: ArgumentNode | null, id: string): ArgumentNode | null => {
   if (!node) return null;
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

// --- React Component ---
export default function DebateSessionClient() {
  // --- Original State ---
  const searchParams = useSearchParams();
  const debaterARole = searchParams.get('debaterA') || 'human';
  const debaterBRole = searchParams.get('debaterB') || 'ai';
  const topic = searchParams.get('topic') || 'AI systems will be aligned by default?';

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
  const [isAutonomousRunning, setIsAutonomousRunning] = useState(false);
  // --- End State ---

  // --- Prompt Builders ---
  const buildDebaterPrompt = (
    participantId: 'debaterA' | 'debaterB',
    parentText: string
  ): string => {
    const stance = participantId === 'debaterA'
      ? `You are Debater A. You are arguing in **favour** of the following topic: "${topic}".`
      : `You are Debater B. You are arguing **against** the following topic: "${topic}".`;
      return `${stance}\n\nRespond to the following argument:\n"${parentText}"\n\nRespond concisely, then score your own response from 1 to 10.\n\nFormat exactly as:\nResponse: <Your argument text>\nScore: <Score number 1-10>`;
  };

  const buildJudgePrompt = (argumentText: string): string => {
    // Added more specific instructions and constraints
    return `You are an impartial and objective AI debate judge.
Your task is to evaluate the quality of the following argument snippet based **solely** on its internal merits and structure.

**Argument to Evaluate:**
"${argumentText}"

**Evaluation Criteria:**
* **Logical Consistency:** Is the argument internally coherent? Does it follow logically?
* **Clarity:** Is the argument presented clearly and understandably?
* **Relevance:** How relevant is this argument to the implicit point it's responding to?
* **Insightfulness:** Does the argument offer novel perspectives or deep insights?
* **Persuasiveness:** How convincing is the argument based *only* on its structure and content (ignore whether you personally agree with the stance)?

**Crucial Instructions:**
* **DO NOT use external knowledge** about the debate topic.
* **DO NOT let your own pre-existing beliefs or opinions** influence your judgment.
* Focus **only** on the quality of the reasoning, structure, and expression within the provided text.

After your analysis based *only* on the criteria above, briefly state your critique and declare a winner for *this specific exchange* based on which side presented the stronger argument *in this snippet*.

Respond in this format exactly:

Critique: <Your evaluation based ONLY on the criteria and the provided text>
Winner: <Debater A or Debater B based ONLY on the quality of this specific argument text>`;
 };
  // --- End Prompt Builders ---

  // --- API Call Function (Corrected) ---
  const callOpenAIWithScoring = async (
    prompt: string,
    model: string,
    stream: boolean,
    onToken?: (accumulatedText: string) => void
  ): Promise<{ text: string; score: number; error?: string }> => {
    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, model, stream }),
        });

        if (!res.ok) {
            let errorJson: unknown = null;
            try {
              errorJson = await res.json();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e) { /* Ignore if response is not JSON */ }
            let parsedError = '';
            if (typeof errorJson === 'object' && errorJson !== null && 'error' in errorJson && typeof errorJson.error === 'string') {
                parsedError = errorJson.error;
            }
            const errorText = parsedError || await res.text();
            console.error('API Error Response:', res.status, errorText);
            return { text: `[API Error: ${res.status} ${errorText}]`, score: 0, error: errorText };
        }

        if (!stream || !res.body) {
            const data = await res.json();
            if (data.error) {
                console.error('API Non-Streaming Error:', data.error);
                return { text: `[API Error: ${data.error}]`, score: 0, error: data.error };
            }
            const message = data.message || '[No response]';
            const match = message.match(/Score:\s*(\d+)/i);
            const score = match ? parseInt(match[1], 10) : 0;
            const responseMatch = message.match(/Response:\s*(.*?)(?:\n+Score:|$)/is);
            const text = responseMatch ? responseMatch[1].trim() : message;
            return { text, score };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        let streamedText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
             if (chunk.includes('"error":')) {
                 try {
                    const errorData = JSON.parse(chunk);
                    if (errorData.error) {
                        console.error("Streaming API Error Chunk:", errorData.error);
                        return { text: `[Streaming API Error: ${errorData.error}]`, score: 0, error: errorData.error };
                    }
                 // eslint-disable-next-line @typescript-eslint/no-unused-vars
                 } catch (parseError) {
                    console.warn("Received non-JSON chunk potentially indicating error:", chunk);
                 }
             }
            fullText += chunk;
            streamedText += chunk;
            onToken?.(streamedText);
        }

        const match = fullText.match(/Response:\s*(.*?)\s*Score:\s*(\d+)\s*$/is);
        if (match) {
            return { text: match[1].trim(), score: parseInt(match[2], 10) };
        } else {
             console.warn("Could not parse score from streamed response. Raw text:", JSON.stringify(fullText));
             const fallbackMatch = fullText.match(/Score:\s*(\d+)/i);
             const fallbackScore = fallbackMatch ? parseInt(fallbackMatch[1], 10) : 0;
             const textOnly = fullText.replace(/Score:\s*\d+\s*$/i, '').replace(/^Response:\s*/i, '').trim();
             return { text: textOnly || streamedText.trim() || '[Parsing Failed]', score: fallbackScore };
        }

    } catch (err: unknown) {
      console.error('API call failed:', err);
       const errorMessage = err instanceof Error ? err.message : 'Unknown fetch error';
      return { text: `[Fetch Error: ${errorMessage}]`, score: 0, error: errorMessage };
    }
  };
  // --- End API Call Function ---


  // --- Core Logic Functions ---
  const addAIResponse = async (parentId: string, participantId: 'debaterA' | 'debaterB') => {
    const parentNode = findNodeById(tree, parentId);
    if (!parentNode || !parentNode.text) return;
    const model = participantId === 'debaterA' ? debaterAModel : debaterBModel;
    const prompt = buildDebaterPrompt(participantId, parentNode.text);
    const liveNodeId = 'live-' + uuidv4();
    const liveNode: ArgumentNode = { nodeId: liveNodeId, parentId, text: '▋', participantId, obfuscationFlag: false, children: [], score: undefined };
    setTree(currentTree => addNodeUnderParent(currentTree, parentId, liveNode));
    const supportsStreaming = model.startsWith('gpt-');
    const { text: finalText, score, error } = await callOpenAIWithScoring( prompt, model, supportsStreaming, (accumulatedText) => { setTree(currentTree => { const updateLiveNodeText = (node: ArgumentNode): ArgumentNode => { if (node.nodeId === liveNodeId) { return { ...node, text: accumulatedText + '▋' }; } const updatedChildren = node.children.map(updateLiveNodeText); let childrenChanged = node.children.length !== updatedChildren.length; if (!childrenChanged) { for (let i = 0; i < updatedChildren.length; i++) { if (updatedChildren[i] !== node.children[i]) { childrenChanged = true; break; } } } return childrenChanged ? { ...node, children: updatedChildren } : node; }; return updateLiveNodeText(currentTree); }); } );
    setTree(currentTree => { const removeLiveNode = (node: ArgumentNode): ArgumentNode | null => { if (node.nodeId === liveNodeId) return null; const updatedChildren = node.children.map(removeLiveNode).filter(n => n !== null) as ArgumentNode[]; let childrenChanged = node.children.length !== updatedChildren.length; if (!childrenChanged) { for (let i = 0; i < updatedChildren.length; i++) { if (updatedChildren[i] !== node.children[i]) { childrenChanged = true; break; } } } return childrenChanged ? { ...node, children: updatedChildren } : node; }; const treeWithoutLive = removeLiveNode(currentTree) || currentTree; if (!error && score >= 6) { const finalNode: ArgumentNode = { nodeId: uuidv4(), parentId, text: finalText, participantId, score, obfuscationFlag: false, children: [], }; return addNodeUnderParent(treeWithoutLive, parentId, finalNode); } else if (error) { const errorNode: ArgumentNode = { nodeId: uuidv4(), parentId, text: `Error: ${finalText}`, participantId: 'system-error', obfuscationFlag: true, children: [], score: 0 }; return addNodeUnderParent(treeWithoutLive, parentId, errorNode); } else { console.log(`Pruning response with score ${score} from ${participantId}`); return treeWithoutLive; } });
  };

  const callAIJudge = async (nodeId: string) => {
    const nodeToJudge = findNodeById(tree, nodeId);
    if (!nodeToJudge) return;
    const judgePrompt = buildJudgePrompt(nodeToJudge.text);
    const { text: judgeResponse, error } = await callOpenAIWithScoring(judgePrompt, judgeModel, false);
    let responseText = judgeResponse;
    if (error) { responseText = `[Judge Error: ${judgeResponse}]`; }
    const newNode: ArgumentNode = { nodeId: uuidv4(), parentId: nodeId, text: responseText, participantId: 'judge-ai', obfuscationFlag: false, children: [], score: undefined };
     setTree(currentTree => addNodeUnderParent(currentTree, nodeId, newNode));
  };

  const toggleObfuscation = (targetId: string) => {
     const node = findNodeById(tree, targetId);
     if (!node) return;
     const currentFlag = node.obfuscationFlag;
     setTree(currentTree => updateNodeProperty(currentTree, targetId, 'obfuscationFlag', !currentFlag));
  };

  const runAutonomousDebate = async () => {
    setIsAutonomousRunning(true);
    console.log('--- Starting Autonomous Debate ---');
    const maxTurns = 8; let currentTreeState = tree; let currentParentNodeId = tree.nodeId; let currentTurn: 'debaterA' | 'debaterB' = 'debaterA';
    for (let i = 0; i < maxTurns; i++) {
        const parentNode = findNodeById(currentTreeState, currentParentNodeId); if (!parentNode) { console.error(`Autonomous debate error: Parent node not found at start of turn ${i + 1}. ID: ${currentParentNodeId}`); break; }
        const model = currentTurn === 'debaterA' ? debaterAModel : debaterBModel; const prompt = buildDebaterPrompt(currentTurn, parentNode.text); const supportsStreaming = model.startsWith('gpt-');
        const { text: responseText, score, error } = await callOpenAIWithScoring( prompt, model, supportsStreaming, undefined );
        if (error || score < 6) { console.log(`Breaking loop in turn <span class="math-inline">\{i \+ 1\}\: Error\=</span>{error}, Score=${score}`); if (error) { const errorNode: ArgumentNode = { nodeId: uuidv4(), parentId: currentParentNodeId, text: `Auto-Debate Error: ${responseText}`, participantId: 'system-error', obfuscationFlag: true, children: [], score: 0 }; const errorTreeState = addNodeUnderParent(currentTreeState, currentParentNodeId, errorNode); currentTreeState = errorTreeState; setTree(errorTreeState); } break; }
        const newNode: ArgumentNode = { nodeId: uuidv4(), parentId: currentParentNodeId, text: responseText, score, participantId: currentTurn, obfuscationFlag: false, children: [], }; const newNodeId = newNode.nodeId; console.log(`Turn <span class="math-inline">\{i \+ 1\}\: Adding Node\: ID\=</span>{newNodeId}, ParentID=<span class="math-inline">\{currentParentNodeId\}, Participant\=</span>{newNode.participantId}`);
        const nextTreeState = addNodeUnderParent(currentTreeState, currentParentNodeId, newNode); currentTreeState = nextTreeState; setTree(nextTreeState);
        currentParentNodeId = newNodeId; currentTurn = currentTurn === 'debaterA' ? 'debaterB' : 'debaterA';
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log('--- Autonomous Debate Finished ---'); setIsAutonomousRunning(false);
  };
  // --- End Core Logic Functions ---


  // --- Rendering function (Corrected Signature) ---
  const renderNode = (node: ArgumentNode) => { // No explicit return type here
     if (!node) return null;

     const participantColor = {
         'system': 'text-gray-600',
         'debaterA': 'text-blue-800',
         'debaterB': 'text-purple-800',
         'judge-ai': 'text-slate-700',
         'system-error': 'text-red-700',
     }[node.participantId] || 'text-black';

     const obfuscatedStyle = node.obfuscationFlag ? 'italic bg-gray-300 px-1 rounded' : '';
     const liveStyle = node.nodeId.startsWith('live-') ? 'text-gray-400 animate-pulse' : '';

     // Type inference should correctly identify this as returning JSX elements or null
     return (
        <div key={node.nodeId} className={`border-l-2 border-gray-300 pl-4 mt-4 relative node-${node.participantId}`}>
            <p className={`mb-1 ${participantColor}`}>
                <strong className="font-semibold">{node.participantId}:</strong>{' '}
                <span className={`${obfuscatedStyle} ${liveStyle}`}>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{node.text}</span>
                </span>
                {node.score !== undefined && (node.participantId === 'debaterA' || node.participantId === 'debaterB') && (
                    <span className="ml-2 text-sm text-gray-500 font-normal">(Score: {node.score})</span>
                )}
                {node.obfuscationFlag && !node.nodeId.startsWith('live-') && (
                    <span className="ml-2 text-xs text-red-700 font-semibold" title="This content is marked as obfuscated">⚠️ Obfuscated</span>
                )}
            </p>

            {!node.nodeId.startsWith('live-') && (
                <div className="flex flex-wrap gap-2 my-2 text-xs">
                <button
                    onClick={() => addAIResponse(node.nodeId, 'debaterA')}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                    disabled={isAutonomousRunning} title="Add AI response as Debater A">
                    ➕ A
                </button>
                <button
                    onClick={() => addAIResponse(node.nodeId, 'debaterB')}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
                    disabled={isAutonomousRunning} title="Add AI response as Debater B">
                    ➕ B
                </button>
                {node.participantId !== 'judge-ai' && node.participantId !== 'system-error' && (
                    <button
                        onClick={() => callAIJudge(node.nodeId)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded disabled:opacity-50"
                        disabled={isAutonomousRunning} title="Have an AI judge evaluate this argument">
                        🧑‍⚖️ Judge
                    </button>
                )}
                <button
                    onClick={() => toggleObfuscation(node.nodeId)}
                    className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-black rounded disabled:opacity-50"
                    disabled={isAutonomousRunning} title={node.obfuscationFlag ? "Mark as NOT obfuscated" : "Mark as obfuscated"}>
                    {node.obfuscationFlag ? '✅ Unmark' : '⚠️ Obfuscate'}
                </button>
                </div>
            )}

            <div className="ml-4 border-l-2 border-gray-200">
                {node.children && node.children.length > 0
                    ? node.children.map(childNode => renderNode(childNode)) // Recursive call
                    : null
                }
            </div>
        </div>
     );
  };
  // --- End Rendering Function Definition ---


  // --- Component Return JSX ---
  // Add back the original JSX return block
  return (
    <main className="min-h-screen px-4 sm:px-6 py-10 bg-gradient-to-br from-gray-50 to-indigo-50 text-gray-900 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">🧠 Live Debate Arena</h1>

        {/* Configuration Section - ADDING IDs and htmlFor for Accessibility */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-white shadow-md">
           <h2 className="text-xl font-semibold mb-3 text-gray-700">Configure Roles & Models</h2>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    {/* Added id and htmlFor */}
                    <label htmlFor="debaterA-model-select" className="block font-medium text-sm mb-1 text-gray-600">Debater A ({debaterARole})</label>
                    <select id="debaterA-model-select" value={debaterAModel} onChange={(e) => setDebaterAModel(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500" disabled={isAutonomousRunning}>
                    {modelOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                </div>
                <div>
                    {/* Added id and htmlFor */}
                    <label htmlFor="debaterB-model-select" className="block font-medium text-sm mb-1 text-gray-600">Debater B ({debaterBRole})</label>
                    <select id="debaterB-model-select" value={debaterBModel} onChange={(e) => setDebaterBModel(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500" disabled={isAutonomousRunning}>
                    {modelOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                </div>
                <div>
                    {/* Added id and htmlFor */}
                    <label htmlFor="judge-model-select" className="block font-medium text-sm mb-1 text-gray-600">Judge</label>
                    <select id="judge-model-select" value={judgeModel} onChange={(e) => setJudgeModel(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500" disabled={isAutonomousRunning}>
                    {modelOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                </div>
           </div>
        </div>

        {/* Autonomous Debate Button */}
        {debaterARole === 'ai' && debaterBRole === 'ai' && (
          <div className="mb-6 text-center">
            <button
                onClick={runAutonomousDebate}
                className="bg-indigo-600 text-white px-5 py-2 rounded-md shadow hover:bg-indigo-700 transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                disabled={isAutonomousRunning}
            >
                {isAutonomousRunning ? '🤖 Running AI Debate...' : '🚀 Run Full AI Debate (8 turns)'}
            </button>
          </div>
        )}

         {/* Debate Tree Display */}
         <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-white shadow">
             <h2 className="text-xl font-semibold mb-4 text-gray-700">Debate Tree</h2>
             {/* This call uses the renderNode function defined above */}
             {renderNode(tree)}
         </div>
      </div>
    </main>
  );
 // --- End Component Return JSX ---

} // End of component