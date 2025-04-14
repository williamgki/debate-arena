import React, { useState } from 'react';
import { DebateNode } from './DebateNode';

interface DebateNodeProps {
  node: DebateNode;
  level?: number;
  onAddBranch?: (parentId: string, text: string) => void;
}

export const DebateNodeComponent: React.FC<DebateNodeProps> = ({ node, level = 0, onAddBranch }) => {
  const [branchInput, setBranchInput] = useState("");

  const handleAdd = () => {
    if (onAddBranch && branchInput.trim() !== "") {
      onAddBranch(node.id, branchInput.trim());
      setBranchInput("");
    }
  };

  return (
    <div style={{ marginLeft: level * 20, borderLeft: '1px solid #ddd', paddingLeft: 10, marginTop: 10 }}>
      <div>
        <strong>{node.participant}:</strong> {node.text}
      </div>
      {onAddBranch && (
        <div style={{ marginTop: 5 }}>
          <input
            type="text"
            placeholder="Add branch response..."
            value={branchInput}
            onChange={e => setBranchInput(e.target.value)}
            style={{ width: "70%", padding: 5 }}
          />
          <button onClick={handleAdd} style={{ marginLeft: 5, padding: "5px 10px" }}>
            Add Branch
          </button>
        </div>
      )}
      {node.children && node.children.map(child => (
        <DebateNodeComponent key={child.id} node={child} level={level + 1} onAddBranch={onAddBranch} />
      ))}
    </div>
  );
};
