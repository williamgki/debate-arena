// src/app/debate/session/DebateSessionClient.tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

// --- Types and Helpers ---
type ArgumentNode = {
  nodeId: string;
  parentId: string | null;
  text: string;
  participantId: string; // 'system', 'debaterA', 'debaterB', 'judge-ai', 'system-error', 'live-...'
  obfuscationFlag: boolean;
  score?: number; // Optional score from AI debaters
  children: ArgumentNode[];
};

// Recursively adds newNode under the node with parentId in the tree
const addNodeUnderParent = (
  tree: ArgumentNode,
  parentId: string,
  newNode: ArgumentNode
): ArgumentNode => {
  // Base case: Found the parent
  if (tree.nodeId === parentId) {
    // Filter out potential temporary 'live' nodes or duplicate inserts
    const existingChildren = tree.children.filter(c => c.nodeId !== 'live' && c.nodeId !== newNode.nodeId);
    // Return a *new* parent node object with the new child added
    return { ...tree, children: [...existingChildren, newNode] };
  }

  // Recursive case: Search in children
  const updatedChildren = tree.children.map(child => addNodeUnderParent(child, parentId, newNode));

  // Check if any child reference changed to ensure immutability propagation
  let childrenChanged = updatedChildren.length !== tree.children.length; // Use let here as it might be reassigned below
  if (!childrenChanged) {
    for (let i = 0; i < updatedChildren.length; i++) {
      if (updatedChildren[i] !== tree.children[i]) {
        childrenChanged = true;
        break;
      }
    }
  }

  // If children changed, return a *new* current node object with the updated children
  return childrenChanged ? { ...tree, children: updatedChildren } : tree;
};

// Recursively updates a property of a node specified by targetId
const updateNodeProperty = <K extends keyof ArgumentNode>(
    tree: ArgumentNode,
    targetId: string,
    propertyName: K,
    newValue: ArgumentNode[K]
): ArgumentNode => {
    // Base case: Found the target node
    if (tree.nodeId === targetId) {
        // Return a *new* node object with the updated property
        return { ...tree, [propertyName]: newValue };
    }

    // Recursive case: Search in children
    const updatedChildren = tree.children.map(child => updateNodeProperty(child, targetId, propertyName, newValue));

    // Check if any child reference changed
    let childrenChanged = updatedChildren.length !== tree.children.length; // Use let here as it might be reassigned below
    if (!childrenChanged) {
      for (let i = 0; i < updatedChildren.length; i++) {
        if (updatedChildren[i] !== tree.children[i]) {
          childrenChanged = true;
          break;
        }
      }
    }
    // If children changed, return a *new* current node object
    return childrenChanged ? { ...tree, children: updatedChildren } : tree;
};

// Available AI models
const modelOptions = [
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4.5 Preview', value: 'gpt-4.5-preview' },
  { label: 'O1 Pro', value: 'o1-pro' },
  { label: 'O3 Mini', value: 'o3-mini' },
];

// Recursively finds a node by its ID in the tree
const findNodeById = (node: ArgumentNode, id: string): ArgumentNode | null => {
  if (!node) return null; // Added check for potentially null initial node
  if (node.nodeId === id) return node;
  for (const child of node.children) {
    const result = findNodeById(child, id);
    if (result) return result;
  }
  return null;
};
// --- End Types and Helpers ---


// --- React Component ---
export default function DebateSessionClient() {
  const searchParams = useSearchParams();
  const debaterARole = searchParams.get('debaterA') || 'human';
  const debaterBRole = searchParams.get('debaterB') || 'ai';
  const topic = searchParams.get('topic') || 'Should AI be regulated?';

  // --- State ---
  const [tree, setTree] = useState<ArgumentNode>({
    nodeId: uuidv4(), // Root node ID
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

  // --- ADDED LOG: Log tree state on every render ---
  // console.log("--- DebateSessionClient RENDER ---");
  // // Use JSON.stringify for a snapshot, avoiding potential console object mutation display issues
  // // Note: This can be slow for very large trees
  // try {
  //   console.log("Current tree state:", JSON.stringify(tree, null, 2));
  // } catch (e) {
  //   console.error("Failed to stringify tree state:", e);
  //   console.log("Current tree state (direct):", tree); // Fallback direct log
  // }
  // --- END ADDED LOG --- (Commented out for less console noise)

  // --- Prompt Builders ---
  const buildDebaterPrompt = (
    participantId: 'debaterA' | 'debaterB',
    parentText: string
  ): string => {
    const stance = participantId === 'debaterA'
      ? `You are Debater A. You are arguing in **favour** of the following topic: "${topic}".`
      : `You are Debater B. You are arguing **against** the following topic: "${topic}".`;

    // Ensure consistent formatting request
    return `${stance}\n\nRespond to the following argument:\n"${parentText}"\n\nRespond concisely, then score your own response from 1 to 10.\n\nFormat exactly as:\nResponse: <Your argument text>\nScore: <Score number 1-10>`;
  };

  const buildJudgePrompt = (argumentText: string): string => {
     return `You are an impartial judge evaluating a debate argument.
Your task is to assess the logic, relevance, and persuasiveness of the following argument:

"${argumentText}"

After your analysis, you must clearly state the winner of this argument.
Choose only one: **Debater A** or **Debater B**.

Respond in this format exactly:

Critique: <your evaluation>
Winner: <Debater A or Debater B>`;
  };
  // --- End Prompt Builders ---


  // --- API Call Function ---
  const callOpenAIWithScoring = async (
    prompt: string,
    model: string,
    stream: boolean,
    onToken?: (chunk: string) => void
  ): Promise<{ text: string; score: number; error?: string }> => {
    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, model, stream }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('API Error Response:', errorText);
            return { text: `[API Error: ${res.status} ${errorText}]`, score: 0, error: errorText };
        }

        // Non-Streaming Path
        if (!stream || !res.body) {
            const data = await res.json();
            // Check for potential error structure from non-streaming backend response
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

        // Streaming Path
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        let streamedText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
             // Check if the chunk indicates an error (simple check, might need refinement)
             if (chunk.includes('"error":')) {
                 try {
                    const errorData = JSON.parse(chunk); // Try parsing potential JSON error
                    if (errorData.error) {
                        console.error("Streaming API Error Chunk:", errorData.error);
                        return { text: `[Streaming API Error: ${errorData.error}]`, score: 0, error: errorData.error };
                    }
                 } catch (parseError) {
                    // If not valid JSON, treat as part of the text or log differently
                    console.warn("Received non-JSON chunk potentially indicating error:", chunk);
                 }
             }
            fullText += chunk;
            streamedText += chunk; // Accumulate raw streamed text for display fallback
            onToken?.(chunk); // Send raw chunk to UI updater
        }

        // Parse score/text from accumulated fullText AFTER stream ends
        const match = fullText.match(/Response:\s*(.*?)\s*Score:\s*(\d+)\s*$/is);

        if (match) {
            return { text: match[1].trim(), score: parseInt(match[2], 10) };
        } else {
             console.warn("Could not parse score from streamed response. Raw text:", JSON.stringify(fullText));
             const fallbackMatch = fullText.match(/Score:\s*(\d+)/i);
             const fallbackScore = fallbackMatch ? parseInt(fallbackMatch[1], 10) : 0;
             const textOnly = fullText.replace(/Score:\s*\d+\s*$/i, '').replace(/^Response:\s*/i, '').trim();
             // Use textOnly if extraction worked, otherwise use the raw accumulated streamed text
             return { text: textOnly || streamedText.trim() || '[Parsing Failed]', score: fallbackScore };
        }

    } catch (err: unknown) { // Catch as unknown
      console.error('API call failed:', err);
       // Check if err is an Error object before accessing .message
       const errorMessage = err instanceof Error ? err.message : 'Unknown fetch error';
      return { text: `[Fetch Error: ${errorMessage}]`, score: 0, error: errorMessage };
    }
  };
  // --- End API Call Function ---


  // --- Other Core Logic Functions ---
  const addAIResponse = async (parentId: string, participantId: 'debaterA' | 'debaterB') => {
    const parentNode = findNodeById(tree, parentId);
    if (!parentNode || !parentNode.text) return;

    const model = participantId === 'debaterA' ? debaterAModel : debaterBModel;
    const prompt = buildDebaterPrompt(participantId, parentNode.text);
    let streamedTextAccumulator = '';

    const liveNodeId = 'live-' + uuidv4(); // Unique temporary ID
    const liveNode: ArgumentNode = {
        nodeId: liveNodeId, parentId, text: '▋', participantId,
        obfuscationFlag: false, children: [], score: undefined // Explicitly undefined score
    };
    // Add temporary node for visual feedback
    setTree(currentTree => addNodeUnderParent(currentTree, parentId, liveNode));

    const supportsStreaming = model.startsWith('gpt-');

    // Call API, providing onToken callback to update the live node
    const { text: finalText, score, error } = await callOpenAIWithScoring(
        prompt, model, supportsStreaming,
        (token) => { // onToken callback
            streamedTextAccumulator += token;
            setTree(currentTree => {
                // Find and update the live node's text immutably
                const updateLiveNodeText = (node: ArgumentNode): ArgumentNode => {
                     if (node.nodeId === liveNodeId) {
                        // Return NEW node object with updated text
                        return { ...node, text: streamedTextAccumulator + '▋' };
                    }
                    // Recursively update children, ensuring immutability
                    const updatedChildren = node.children.map(updateLiveNodeText);
                    // Return new parent node only if children actually changed reference
                    // Use 'let' because it's reassigned in the loop
                    let childrenChanged = node.children.length !== updatedChildren.length;
                     if (!childrenChanged) {
                         for (let i = 0; i < updatedChildren.length; i++) {
                             if (updatedChildren[i] !== node.children[i]) {
                                 childrenChanged = true;
                                 break;
                             }
                         }
                     }
                    return childrenChanged ? { ...node, children: updatedChildren } : node;
                };
                return updateLiveNodeText(currentTree);
            });
        }
    );

    // Finalize: Remove live node, add final node or error node
    setTree(currentTree => {
        // 1. Remove the live node immutably
        const removeLiveNode = (node: ArgumentNode): ArgumentNode | null => {
            if (node.nodeId === liveNodeId) return null; // Remove by returning null
            const updatedChildren = node.children.map(removeLiveNode).filter(n => n !== null) as ArgumentNode[]; // Filter out nulls
             // Use 'let' because it's reassigned in the loop
             let childrenChanged = node.children.length !== updatedChildren.length;
             if (!childrenChanged) {
                 for (let i = 0; i < updatedChildren.length; i++) {
                     if (updatedChildren[i] !== node.children[i]) {
                         childrenChanged = true;
                         break;
                     }
                 }
             }
            return childrenChanged ? { ...node, children: updatedChildren } : node;
        };
        // Apply removal starting from root, handle potential root removal if needed
        // Use const here as it's assigned once based on the result of removeLiveNode
        const treeWithoutLive = removeLiveNode(currentTree) || currentTree;

        // 2. Add final or error node if appropriate
        if (!error && score >= 6) {
            const finalNode: ArgumentNode = {
                nodeId: uuidv4(), parentId, text: finalText, participantId,
                score, obfuscationFlag: false, children: [],
            };
            return addNodeUnderParent(treeWithoutLive, parentId, finalNode);
        } else if (error) {
             const errorNode: ArgumentNode = {
                 nodeId: uuidv4(), parentId, text: `Error: ${finalText}`, // Use finalText which contains error message
                 participantId: 'system-error', obfuscationFlag: true, children: [], score: 0
             };
             return addNodeUnderParent(treeWithoutLive, parentId, errorNode);
        } else {
             // Score too low - just return the tree without the live node
             console.log(`Pruning response with score ${score} from ${participantId}`);
             return treeWithoutLive;
        }
    });
  };

  const callAIJudge = async (nodeId: string) => {
    const nodeToJudge = findNodeById(tree, nodeId);
    if (!nodeToJudge) return;
    const judgePrompt = buildJudgePrompt(nodeToJudge.text);
    // Judge remains non-streaming for now
    const { text: judgeResponse, error } = await callOpenAIWithScoring(judgePrompt, judgeModel, false);
    let responseText = judgeResponse;
    if (error) { responseText = `[Judge Error: ${judgeResponse}]`; } // Use the text which contains error info
    const newNode: ArgumentNode = {
      nodeId: uuidv4(), parentId: nodeId, text: responseText, participantId: 'judge-ai',
      obfuscationFlag: false, children: [], score: undefined // No score for judge
    };
     setTree(currentTree => addNodeUnderParent(currentTree, nodeId, newNode));
  };

  const toggleObfuscation = (targetId: string) => {
     const node = findNodeById(tree, targetId);
     if (!node) return;
     const currentFlag = node.obfuscationFlag;
     // Use immutable update helper
     setTree(currentTree => updateNodeProperty(currentTree, targetId, 'obfuscationFlag', !currentFlag));
  };

  const runAutonomousDebate = async () => {
    setIsAutonomousRunning(true);
    console.log('--- Starting Autonomous Debate ---');

    const maxTurns = 8;
    let currentTreeState = tree; // Initialize local tree state from React state
    let currentParentNodeId = tree.nodeId; // ID of the node to reply to
    let currentTurn: 'debaterA' | 'debaterB' = 'debaterA';

    for (let i = 0; i < maxTurns; i++) {
        // Find node in LOCAL tree state
        const parentNode = findNodeById(currentTreeState, currentParentNodeId);

        if (!parentNode) {
             console.error(`Autonomous debate error: Parent node not found at start of turn ${i + 1}. ID: ${currentParentNodeId}`);
             break;
        }

        const model = currentTurn === 'debaterA' ? debaterAModel : debaterBModel;
        const prompt = buildDebaterPrompt(currentTurn, parentNode.text);
        const supportsStreaming = model.startsWith('gpt-');

        // Call the API - don't need onToken callback for autonomous mode display
        const { text: responseText, score, error } = await callOpenAIWithScoring(
            prompt, model, supportsStreaming, undefined
        );

        // Check score/error
        if (error || score < 6) {
            console.log(`Breaking loop in turn ${i + 1}: Error=${error}, Score=${score}`);
             // Optionally add an error node to the UI here if desired
             if (error) {
                 const errorNode: ArgumentNode = {
                     nodeId: uuidv4(), parentId: currentParentNodeId,
                     text: `Auto-Debate Error: ${responseText}`,
                     participantId: 'system-error', obfuscationFlag: true, children: [], score: 0
                 };
                 const errorTreeState = addNodeUnderParent(currentTreeState, currentParentNodeId, errorNode);
                 currentTreeState = errorTreeState;
                 setTree(errorTreeState); // Update UI with error
             }
            break;
        }

        // Create the new node
        const newNode: ArgumentNode = {
            nodeId: uuidv4(),
            parentId: currentParentNodeId,
            text: responseText,
            score,
            participantId: currentTurn,
            obfuscationFlag: false,
            children: [],
        };

        console.log(`Turn ${i + 1}: Adding Node: ID=${newNode.nodeId}, ParentID=${currentParentNodeId}, Participant=${newNode.participantId}`);
        const newNodeId = newNode.nodeId;

        // --- STATE UPDATE ---
        const nextTreeState = addNodeUnderParent(currentTreeState, currentParentNodeId, newNode);
        currentTreeState = nextTreeState; // Update local state for the next iteration
        setTree(nextTreeState); // Update React's state to trigger UI re-render
        // --- END STATE UPDATE ---

        // Update parent ID for the next turn
        currentParentNodeId = newNodeId;
        // Switch turn
        currentTurn = currentTurn === 'debaterA' ? 'debaterB' : 'debaterA';

         // Add a small delay between turns to allow UI updates and prevent rate limiting
         await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
    }

    console.log('--- Autonomous Debate Finished ---');
    setIsAutonomousRunning(false); // Re-enable buttons
  };
  // --- End Core Logic Functions ---


  // --- Rendering ---
  const renderNode = (node: ArgumentNode): JSX.Element | null => {
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

     return (
        <div key={node.nodeId} className={`border-l-2 border-gray-300 pl-4 mt-4 relative node-${node.participantId}`}>
            <p className={`mb-1 ${participantColor}`}>
                <strong className="font-semibold">{node.participantId}:</strong>{' '}
                <span className={`${obfuscatedStyle} ${liveStyle}`}>
                    {/* Use whitespace pre-wrap to preserve formatting like newlines */}
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
                {node.participantId !== 'judge-ai' && node.participantId !== 'system-error' && ( // Also hide judge button on errors
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
                    ? node.children.map(childNode => renderNode(childNode))
                    : null
                }
            </div>
        </div>
     );
  };
  // --- End Rendering ---

  // --- Component Return JSX ---
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
             {renderNode(tree)}
         </div>
      </div>
    </main>
  );
 // --- End Component Return JSX ---

} // End of component