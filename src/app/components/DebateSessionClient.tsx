import React, { useState } from 'react';
import { DebateNode } from './DebateNode';
import { DebateNodeComponent } from './DebateNodeComponent';

// Helper function to generate a unique ID.
const generateId = (): string => Math.random().toString(36).substring(2, 15);

// Define the initial debate tree state (for instance, starting with a Judge's prompt)
const initialDebate: DebateNode = {
  id: generateId(),
  participant: 'Judge',
  text: 'Welcome to the debate. Start by posing your arguments.',
  children: [],
  timestamp: Date.now()
};

export const DebateSessionClient: React.FC = () => {
  const [debateTree, setDebateTree] = useState<DebateNode>(initialDebate);

  // Helper function to add a branch under a given node, using an immutable recursive update.
  const addBranch = (parentId: string, text: string) => {
    const newBranch: DebateNode = {
      id: generateId(),
      parentId,
      // For now we use "DebaterA" always; you can add logic to alternate or select as needed.
      participant: 'DebaterA',
      text,
      children: [],
      timestamp: Date.now()
    };

    const updateTree = (node: DebateNode): DebateNode => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, newBranch] };
      }
      return { ...node, children: node.children.map(child => updateTree(child)) };
    };

    setDebateTree(prevTree => updateTree(prevTree));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Debate Session</h2>
      {/* Renders the debate tree recursively.
          The "onAddBranch" prop ensures that the "Add Branch" button is shown for each node. */}
      <DebateNodeComponent node={debateTree} onAddBranch={addBranch} />
    </div>
  );
};
