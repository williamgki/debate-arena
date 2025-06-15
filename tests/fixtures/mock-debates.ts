// Mock debate data for testing
import { v4 as uuidv4 } from 'uuid';
import { DebateDocument, CreateDebateRequest, ParticipantInfo, DebateNode } from '@/types/debate';

export const mockParticipants: Record<string, ParticipantInfo> = {
  'system': {
    id: 'system',
    role: 'system',
    type: 'system',
    name: 'System'
  },
  'debaterA': {
    id: 'debaterA',
    role: 'debaterA',
    type: 'human',
    name: 'Alice'
  },
  'debaterB': {
    id: 'debaterB',
    role: 'debaterB',
    type: 'ai',
    name: 'GPT-4',
    model: 'gpt-4'
  },
  'judge-ai': {
    id: 'judge-ai',
    role: 'judge',
    type: 'ai',
    name: 'AI Judge',
    model: 'gpt-4'
  }
};

export const createMockDebateRequest = (): CreateDebateRequest => ({
  topic: {
    title: 'AI Safety in Autonomous Systems',
    description: 'Debate on the safety measures needed for autonomous AI systems',
    tags: ['ai', 'safety', 'autonomous'],
    category: 'technology'
  },
  format: 'tree',
  configuration: {
    allowObfuscation: true,
    scoringMethod: 'self-assessment',
    moderationLevel: 'light',
    allowPublicJudging: true
  },
  access: {
    level: 'public'
  },
  initialTopic: 'Autonomous AI systems require strict safety protocols before deployment.',
  participants: [
    mockParticipants.debaterA,
    mockParticipants.debaterB,
    mockParticipants['judge-ai']
  ]
});

export const createMockDebateDocument = (overrides?: Partial<DebateDocument>): DebateDocument => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const rootNodeId = uuidv4();
  
  const baseDebate: DebateDocument = {
    metadata: {
      id,
      version: '1.0',
      topic: {
        title: 'Test Debate Topic',
        description: 'A test debate for unit testing',
        tags: ['test', 'unit-test'],
        category: 'testing'
      },
      timestamps: {
        created: now,
        lastModified: now
      },
      status: 'active',
      format: 'tree',
      configuration: {
        allowObfuscation: false,
        scoringMethod: 'self-assessment',
        moderationLevel: 'none',
        allowPublicJudging: true
      },
      access: {
        level: 'public'
      },
      analytics: {
        totalNodes: 1,
        totalParticipants: 2,
        totalJudgments: 0,
        totalFlags: 0,
        averageDepth: 0,
        longestThread: 1
      }
    },
    participants: mockParticipants,
    nodes: {
      [rootNodeId]: {
        id: rootNodeId,
        content: {
          text: 'This is the root topic for testing'
        },
        participantId: 'system',
        timestamps: {
          created: now
        },
        relationships: {
          parents: [],
          children: []
        },
        position: {
          depth: 0,
          threadId: uuidv4(),
          sequenceInThread: 0
        },
        flags: [],
        metrics: {},
        version: 1
      }
    },
    annotations: {},
    rootNodeId
  };
  
  return { ...baseDebate, ...overrides };
};

export const createMockNode = (overrides?: Partial<DebateNode>): DebateNode => {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  return {
    id,
    content: {
      text: 'This is a test argument node'
    },
    participantId: 'debaterA',
    timestamps: {
      created: now
    },
    relationships: {
      parents: [],
      children: []
    },
    position: {
      depth: 1,
      threadId: uuidv4(),
      sequenceInThread: 1
    },
    flags: [],
    metrics: {
      selfScore: 7,
      wordCount: 6
    },
    version: 1,
    ...overrides
  };
};

export const createComplexMockDebate = (): DebateDocument => {
  const debate = createMockDebateDocument();
  const rootId = debate.rootNodeId;
  
  // Create a debate tree with multiple branches
  const nodeA1 = createMockNode({
    content: { text: 'AI safety protocols are essential for preventing catastrophic failures.' },
    participantId: 'debaterA',
    relationships: {
      parents: [{ targetNodeId: rootId, type: 'responds-to' }],
      children: []
    }
  });
  
  const nodeB1 = createMockNode({
    content: { text: 'Over-regulation could stifle AI innovation and progress.' },
    participantId: 'debaterB',
    relationships: {
      parents: [{ targetNodeId: nodeA1.id, type: 'refutes' }],
      children: []
    },
    position: { depth: 2, threadId: nodeA1.position.threadId, sequenceInThread: 2 }
  });
  
  const nodeA2 = createMockNode({
    content: { text: 'The risks of uncontrolled AI far outweigh potential innovation delays.' },
    participantId: 'debaterA',
    relationships: {
      parents: [{ targetNodeId: nodeB1.id, type: 'responds-to' }],
      children: []
    },
    position: { depth: 3, threadId: nodeA1.position.threadId, sequenceInThread: 3 },
    flags: ['high_quality']
  });
  
  const judgeNode = createMockNode({
    content: { text: 'Both arguments have merit. Debater A provides stronger evidence.' },
    participantId: 'judge-ai',
    relationships: {
      parents: [{ targetNodeId: nodeA2.id, type: 'judges' }],
      children: []
    },
    position: { depth: 4, threadId: nodeA1.position.threadId, sequenceInThread: 4 }
  });
  
  // Update relationships
  debate.nodes[rootId].relationships.children = [{ targetNodeId: nodeA1.id, type: 'responds-to' }];
  nodeA1.relationships.children = [{ targetNodeId: nodeB1.id, type: 'refutes' }];
  nodeB1.relationships.children = [{ targetNodeId: nodeA2.id, type: 'responds-to' }];
  nodeA2.relationships.children = [{ targetNodeId: judgeNode.id, type: 'judges' }];
  
  // Add nodes to debate
  debate.nodes[nodeA1.id] = nodeA1;
  debate.nodes[nodeB1.id] = nodeB1;
  debate.nodes[nodeA2.id] = nodeA2;
  debate.nodes[judgeNode.id] = judgeNode;
  
  // Update analytics
  debate.metadata.analytics.totalNodes = 5;
  debate.metadata.analytics.totalJudgments = 1;
  debate.metadata.analytics.totalFlags = 1;
  debate.metadata.analytics.averageDepth = 2;
  debate.metadata.analytics.longestThread = 5;
  
  return debate;
};

export const mockSearchResults = [
  createMockDebateDocument({
    metadata: {
      ...createMockDebateDocument().metadata,
      topic: {
        title: 'Climate Change Policy',
        description: 'Debate on effective climate policies',
        tags: ['climate', 'policy', 'environment'],
        category: 'environment'
      },
      status: 'completed'
    }
  }),
  createMockDebateDocument({
    metadata: {
      ...createMockDebateDocument().metadata,
      topic: {
        title: 'Universal Basic Income',
        description: 'Economic debate on UBI implementation',
        tags: ['economics', 'ubi', 'policy'],
        category: 'economics'
      },
      status: 'active'
    }
  })
];

export const mockApiResponses = {
  success: {
    createDebate: {
      success: true,
      data: createMockDebateDocument()
    },
    getDebate: {
      success: true,
      data: createMockDebateDocument()
    },
    searchDebates: {
      success: true,
      data: {
        debates: mockSearchResults,
        totalCount: 2
      }
    }
  },
  error: {
    notFound: {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Debate not found'
      }
    },
    validation: {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data'
      }
    }
  }
};