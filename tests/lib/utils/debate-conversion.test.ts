// Tests for debate conversion utilities
import { DebateConverter, DebateAPI } from '@/lib/utils/debate-conversion';
import { createMockDebateDocument, createComplexMockDebate } from '../../fixtures/mock-debates';
import { DebateDocument } from '@/types/debate';

// Mock fetch for DebateAPI tests
global.fetch = jest.fn();

describe('DebateConverter', () => {
  describe('convertToDebateDocument', () => {
    test('should convert legacy state to DebateDocument', () => {
      const legacyState = {
        tree: {
          nodeId: 'root-node',
          parentId: null,
          text: 'Test topic',
          participantId: 'system',
          obfuscationFlag: false,
          children: [
            {
              nodeId: 'child-1',
              parentId: 'root-node',
              text: 'First argument',
              participantId: 'debaterA',
              obfuscationFlag: false,
              score: 8,
              children: []
            },
            {
              nodeId: 'child-2',
              parentId: 'root-node',
              text: 'Second argument',
              participantId: 'debaterB',
              obfuscationFlag: true,
              score: 6,
              children: []
            }
          ]
        },
        topic: 'Test Debate Topic',
        debaterARole: 'human',
        debaterBRole: 'ai',
        debaterAModel: 'human',
        debaterBModel: 'gpt-4',
        judgeModel: 'gpt-4'
      };
      
      const result = DebateConverter.convertToDebateDocument(legacyState);
      
      // Verify basic structure
      expect(result.metadata.id).toBeDefined();
      expect(result.metadata.topic.title).toBe('Test Debate Topic');
      expect(result.rootNodeId).toBe('root-node');
      
      // Verify participants
      expect(result.participants['debaterA']).toBeDefined();
      expect(result.participants['debaterA'].type).toBe('human');
      expect(result.participants['debaterB']).toBeDefined();
      expect(result.participants['debaterB'].type).toBe('ai');
      expect(result.participants['debaterB'].model).toBe('gpt-4');
      
      // Verify nodes
      expect(result.nodes['root-node']).toBeDefined();
      expect(result.nodes['child-1']).toBeDefined();
      expect(result.nodes['child-2']).toBeDefined();
      
      // Verify flags
      expect(result.nodes['child-1'].flags).not.toContain('obfuscated');
      expect(result.nodes['child-2'].flags).toContain('obfuscated');
      
      // Verify scores
      expect(result.nodes['child-1'].metrics.selfScore).toBe(8);
      expect(result.nodes['child-2'].metrics.selfScore).toBe(6);
      
      // Verify relationships
      expect(result.nodes['root-node'].relationships.children).toHaveLength(2);
      expect(result.nodes['child-1'].relationships.parents).toHaveLength(1);
      expect(result.nodes['child-1'].relationships.parents[0].targetNodeId).toBe('root-node');
    });
    
    test('should handle nested arguments correctly', () => {
      const legacyState = {
        tree: {
          nodeId: 'root',
          parentId: null,
          text: 'Root topic',
          participantId: 'system',
          obfuscationFlag: false,
          children: [
            {
              nodeId: 'level-1',
              parentId: 'root',
              text: 'Level 1 argument',
              participantId: 'debaterA',
              obfuscationFlag: false,
              children: [
                {
                  nodeId: 'level-2',
                  parentId: 'level-1',
                  text: 'Level 2 argument',
                  participantId: 'debaterB',
                  obfuscationFlag: false,
                  children: []
                }
              ]
            }
          ]
        },
        topic: 'Nested Debate',
        debaterARole: 'ai',
        debaterBRole: 'ai',
        debaterAModel: 'gpt-3.5-turbo',
        debaterBModel: 'gpt-4',
        judgeModel: 'gpt-4'
      };
      
      const result = DebateConverter.convertToDebateDocument(legacyState);
      
      // Verify depth calculations
      expect(result.nodes['root'].position.depth).toBe(0);
      expect(result.nodes['level-1'].position.depth).toBe(1);
      expect(result.nodes['level-2'].position.depth).toBe(2);
      
      // Verify analytics
      expect(result.metadata.analytics.totalNodes).toBe(3);
      expect(result.metadata.analytics.averageDepth).toBe(1);
      expect(result.metadata.analytics.longestThread).toBe(3);
    });
  });
  
  describe('convertFromDebateDocument', () => {
    test('should convert DebateDocument back to legacy format', () => {
      const debateDoc = createComplexMockDebate();
      const result = DebateConverter.convertFromDebateDocument(debateDoc);
      
      // Verify root node
      expect(result.nodeId).toBe(debateDoc.rootNodeId);
      expect(result.participantId).toBe('system');
      expect(result.parentId).toBeNull();
      
      // Verify children exist
      expect(result.children).toHaveLength(1);
      
      // Verify nested structure
      const firstChild = result.children[0];
      expect(firstChild.participantId).toBe('debaterA');
      expect(firstChild.children).toHaveLength(1);
      
      const secondChild = firstChild.children[0];
      expect(secondChild.participantId).toBe('debaterB');
    });
    
    test('should preserve scores and flags', () => {
      const debateDoc = createComplexMockDebate();
      const result = DebateConverter.convertFromDebateDocument(debateDoc);
      
      // Find the high quality node
      const findNodeWithFlag = (node: any): any => {
        if (node.obfuscationFlag || node.score) return node;
        for (const child of node.children) {
          const found = findNodeWithFlag(child);
          if (found) return found;
        }
        return null;
      };
      
      const flaggedNode = findNodeWithFlag(result);
      expect(flaggedNode).toBeTruthy();
    });
  });
  
  describe('createDebateRequest', () => {
    test('should create valid CreateDebateRequest from legacy state', () => {
      const legacyState = {
        tree: { nodeId: 'root', parentId: null, text: 'Topic', participantId: 'system', obfuscationFlag: false, children: [] },
        topic: 'AI Ethics Discussion',
        debaterARole: 'human',
        debaterBRole: 'ai',
        debaterAModel: 'human',
        debaterBModel: 'gpt-4',
        judgeModel: 'gpt-4'
      };
      
      const result = DebateConverter.createDebateRequest(legacyState);
      
      expect(result.topic.title).toBe('AI Ethics Discussion');
      expect(result.initialTopic).toBe('AI Ethics Discussion');
      expect(result.participants).toHaveLength(3);
      expect(result.format).toBe('tree');
      
      // Verify participants
      const debaterA = result.participants.find(p => p.role === 'debaterA');
      const debaterB = result.participants.find(p => p.role === 'debaterB');
      const judge = result.participants.find(p => p.role === 'judge');
      
      expect(debaterA?.type).toBe('human');
      expect(debaterB?.type).toBe('ai');
      expect(debaterB?.model).toBe('gpt-4');
      expect(judge?.type).toBe('ai');
      expect(judge?.model).toBe('gpt-4');
    });
  });
});

describe('DebateAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createDebate', () => {
    test('should call API endpoint correctly', async () => {
      const mockResponse = {
        success: true,
        data: createMockDebateDocument()
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });
      
      const request = {
        topic: { title: 'Test', tags: [], category: 'test' },
        format: 'tree' as const,
        configuration: {},
        access: { level: 'public' as const },
        initialTopic: 'Test topic',
        participants: []
      };
      
      const result = await DebateAPI.createDebate(request);
      
      expect(global.fetch).toHaveBeenCalledWith('/api/debates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      expect(result).toEqual(mockResponse.data);
    });
    
    test('should handle API errors gracefully', async () => {
      const mockErrorResponse = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid data' }
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockErrorResponse)
      });
      
      const request = {
        topic: { title: 'Test', tags: [], category: 'test' },
        format: 'tree' as const,
        configuration: {},
        access: { level: 'public' as const },
        initialTopic: 'Test topic',
        participants: []
      };
      
      const result = await DebateAPI.createDebate(request);
      
      expect(result).toBeNull();
    });
    
    test('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const request = {
        topic: { title: 'Test', tags: [], category: 'test' },
        format: 'tree' as const,
        configuration: {},
        access: { level: 'public' as const },
        initialTopic: 'Test topic',
        participants: []
      };
      
      const result = await DebateAPI.createDebate(request);
      
      expect(result).toBeNull();
    });
  });
  
  describe('getDebate', () => {
    test('should retrieve debate by ID', async () => {
      const mockDebate = createMockDebateDocument();
      const mockResponse = {
        success: true,
        data: mockDebate
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });
      
      const result = await DebateAPI.getDebate('test-id');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/debates/test-id');
      expect(result).toEqual(mockDebate);
    });
  });
  
  describe('searchDebates', () => {
    test('should search debates with query parameters', async () => {
      const mockDebates = [createMockDebateDocument()];
      const mockResponse = {
        success: true,
        data: { debates: mockDebates }
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });
      
      const query = { q: 'AI safety', status: 'active', limit: 10 };
      const result = await DebateAPI.searchDebates(query);
      
      expect(global.fetch).toHaveBeenCalledWith('/api/debates?q=AI+safety&status=active&limit=10');
      expect(result).toEqual(mockDebates);
    });
  });
  
  describe('exportDebate', () => {
    test('should export debate in specified format', async () => {
      const mockBlob = new Blob(['test content'], { type: 'application/json' });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      });
      
      const result = await DebateAPI.exportDebate('test-id', 'json');
      
      expect(global.fetch).toHaveBeenCalledWith('/api/debates/test-id/export?format=json');
      expect(result).toEqual(mockBlob);
    });
    
    test('should handle export errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });
      
      const result = await DebateAPI.exportDebate('non-existent-id', 'json');
      
      expect(result).toBeNull();
    });
  });
});