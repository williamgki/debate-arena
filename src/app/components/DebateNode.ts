export interface DebateNode {
    id: string;               // Unique identifier for the node
    parentId?: string;        // Parent node (undefined for the root)
    participant: "DebaterA" | "DebaterB" | "Judge";
    text: string;             // The content for this node
    children: DebateNode[];   // Branches from this node
    timestamp?: number;       // Timestamp for ordering
  }
  