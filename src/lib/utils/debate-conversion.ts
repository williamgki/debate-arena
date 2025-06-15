// Utility functions to convert between old ArgumentNode format and new DebateDocument format
// This allows gradual migration from the old format to the new storage system

import { v4 as uuidv4 } from 'uuid';
import { apiCall } from '@/lib/api-config';
import { 
  DebateDocument, 
  DebateNode, 
  ParticipantInfo, 
  NodeFlag,
  CreateDebateRequest,
  UUID
} from '@/types/debate';

// Old format types (from existing codebase)
export type ArgumentNode = {
  nodeId: string;
  parentId: string | null;
  text: string;
  participantId: string;
  obfuscationFlag: boolean;
  score?: number;
  children: ArgumentNode[];
};

export interface LegacyDebateState {
  tree: ArgumentNode;
  topic: string;
  debaterARole: string;
  debaterBRole: string;
  debaterAModel: string;
  debaterBModel: string;
  judgeModel: string;
}

export class DebateConverter {
  
  // Convert old ArgumentNode tree to new DebateDocument format
  static convertToDebateDocument(legacyState: LegacyDebateState): DebateDocument {
    const debateId = uuidv4();
    const now = new Date().toISOString();
    
    // Create participants
    const participants: Record<UUID, ParticipantInfo> = {
      'system': {
        id: 'system',
        role: 'system',
        type: 'system',
        name: 'System'
      },
      'debaterA': {
        id: 'debaterA',
        role: 'debaterA',
        type: legacyState.debaterARole === 'ai' ? 'ai' : 'human',
        name: 'Debater A',
        model: legacyState.debaterARole === 'ai' ? legacyState.debaterAModel : undefined
      },
      'debaterB': {
        id: 'debaterB',
        role: 'debaterB',
        type: legacyState.debaterBRole === 'ai' ? 'ai' : 'human',
        name: 'Debater B',
        model: legacyState.debaterBRole === 'ai' ? legacyState.debaterBModel : undefined
      },
      'judge-ai': {
        id: 'judge-ai',
        role: 'judge',
        type: 'ai',
        name: 'AI Judge',
        model: legacyState.judgeModel
      },
      'manual-branch': {
        id: 'manual-branch',
        role: 'observer',
        type: 'human',
        name: 'Manual Input'
      },
      'system-error': {
        id: 'system-error',
        role: 'system',
        type: 'system',
        name: 'System Error'
      }
    };
    
    // Convert nodes
    const nodes: Record<UUID, DebateNode> = {};
    const threadId = uuidv4();
    
    const convertNode = (argNode: ArgumentNode, depth: number = 0, threadId: string = uuidv4()): DebateNode => {
      const flags: NodeFlag[] = [];
      
      // Convert old flags to new format
      if (argNode.obfuscationFlag) {
        flags.push('obfuscated');
      }
      
      if (argNode.participantId === 'system-error') {
        flags.push('ai_generated'); // Error nodes are typically from AI
      } else if (argNode.participantId === 'debaterA' || argNode.participantId === 'debaterB') {
        if (participants[argNode.participantId]?.type === 'ai') {
          flags.push('ai_generated');
        } else {
          flags.push('human_authored');
        }
      }
      
      const node: DebateNode = {
        id: argNode.nodeId,
        content: {
          text: argNode.text
        },
        participantId: argNode.participantId,
        timestamps: {
          created: now
        },
        relationships: {
          parents: argNode.parentId ? [{ targetNodeId: argNode.parentId, type: 'responds-to' }] : [],
          children: argNode.children.map(child => ({ targetNodeId: child.nodeId, type: 'responds-to' }))
        },
        position: {
          depth,
          threadId,
          sequenceInThread: 0 // Will be calculated later
        },
        flags,
        metrics: {
          selfScore: argNode.score,
          wordCount: argNode.text.split(' ').length
        },
        version: 1
      };
      
      nodes[argNode.nodeId] = node;
      
      // Recursively convert children
      argNode.children.forEach((child, index) => {
        const childThreadId = child.children.length > 0 ? uuidv4() : threadId;
        convertNode(child, depth + 1, childThreadId);
      });
      
      return node;
    };
    
    // Convert the tree
    convertNode(legacyState.tree, 0, threadId);
    
    // Calculate analytics
    const nodeArray = Object.values(nodes);
    const totalNodes = nodeArray.length;
    const depths = nodeArray.map(n => n.position.depth);
    const averageDepth = depths.reduce((sum, d) => sum + d, 0) / depths.length;
    const longestThread = Math.max(...depths) + 1;
    
    const debate: DebateDocument = {
      metadata: {
        id: debateId,
        version: '1.0',
        topic: {
          title: legacyState.topic,
          description: `Debate on: ${legacyState.topic}`,
          tags: ['ai-debate', 'imported'],
          category: 'general'
        },
        timestamps: {
          created: now,
          lastModified: now,
          started: now
        },
        status: 'active',
        format: 'tree',
        configuration: {
          allowObfuscation: true,
          scoringMethod: 'self-assessment',
          moderationLevel: 'none',
          allowPublicJudging: true
        },
        access: {
          level: 'public'
        },
        analytics: {
          totalNodes,
          totalParticipants: Object.keys(participants).length,
          totalJudgments: 0,
          totalFlags: nodeArray.filter(n => n.flags.length > 0).length,
          averageDepth,
          longestThread
        }
      },
      participants,
      nodes,
      annotations: {},
      rootNodeId: legacyState.tree.nodeId
    };
    
    return debate;
  }
  
  // Convert new DebateDocument back to old ArgumentNode format (for compatibility)
  static convertFromDebateDocument(debate: DebateDocument): ArgumentNode {
    const convertNode = (nodeId: string): ArgumentNode => {
      const node = debate.nodes[nodeId];
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }
      
      const children = node.relationships.children.map(rel => convertNode(rel.targetNodeId));
      
      return {
        nodeId: node.id,
        parentId: node.relationships.parents[0]?.targetNodeId || null,
        text: node.content.text,
        participantId: node.participantId,
        obfuscationFlag: node.flags.includes('obfuscated'),
        score: node.metrics.selfScore,
        children
      };
    };
    
    return convertNode(debate.rootNodeId);
  }
  
  // Create a CreateDebateRequest from legacy state
  static createDebateRequest(legacyState: LegacyDebateState): CreateDebateRequest {
    const participants: ParticipantInfo[] = [
      {
        id: 'debaterA',
        role: 'debaterA',
        type: legacyState.debaterARole === 'ai' ? 'ai' : 'human',
        name: 'Debater A',
        model: legacyState.debaterARole === 'ai' ? legacyState.debaterAModel : undefined
      },
      {
        id: 'debaterB',
        role: 'debaterB',
        type: legacyState.debaterBRole === 'ai' ? 'ai' : 'human',
        name: 'Debater B',
        model: legacyState.debaterBRole === 'ai' ? legacyState.debaterBModel : undefined
      },
      {
        id: 'judge-ai',
        role: 'judge',
        type: 'ai',
        name: 'AI Judge',
        model: legacyState.judgeModel
      }
    ];
    
    return {
      topic: {
        title: legacyState.topic,
        description: `Debate on: ${legacyState.topic}`,
        tags: ['ai-debate'],
        category: 'general'
      },
      format: 'tree',
      configuration: {
        allowObfuscation: true,
        scoringMethod: 'self-assessment',
        moderationLevel: 'none',
        allowPublicJudging: true
      },
      access: {
        level: 'public'
      },
      initialTopic: legacyState.topic,
      participants
    };
  }
}

// Utility functions for API calls
export class DebateAPI {
  
  static async createDebate(request: CreateDebateRequest): Promise<DebateDocument | null> {
    try {
      const response = await fetch('/api/debates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error('Failed to create debate:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error creating debate:', error);
      return null;
    }
  }
  
  static async getDebate(id: string): Promise<DebateDocument | null> {
    try {
      const response = await apiCall(`/api/debates/${id}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error('Failed to get debate:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error getting debate:', error);
      return null;
    }
  }
  
  static async updateDebate(id: string, updates: Partial<DebateDocument>): Promise<DebateDocument | null> {
    try {
      const response = await fetch(`/api/debates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error('Failed to update debate:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error updating debate:', error);
      return null;
    }
  }
  
  static async searchDebates(query: any): Promise<DebateDocument[] | null> {
    try {
      const queryString = new URLSearchParams(query).toString();
      const response = await fetch(`/api/debates?${queryString}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data.debates;
      } else {
        console.error('Failed to search debates:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error searching debates:', error);
      return null;
    }
  }
  
  static async exportDebate(id: string, format: string = 'json'): Promise<Blob | null> {
    try {
      const response = await fetch(`/api/debates/${id}/export?format=${format}`);
      
      if (response.ok) {
        return await response.blob();
      } else {
        console.error('Failed to export debate:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error exporting debate:', error);
      return null;
    }
  }
}