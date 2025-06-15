// Tests for file-based storage implementation
import { FileStorage } from '@/lib/storage/file-storage';
import { createMockDebateRequest, createMockDebateDocument, mockParticipants } from '../../fixtures/mock-debates';
import { promises as fs } from 'fs';
import path from 'path';

describe('FileStorage', () => {
  let storage: FileStorage;
  const testDataDir = './tests/data/debates';
  
  beforeEach(async () => {
    storage = new FileStorage(testDataDir);
    await storage.initialize();
  });
  
  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  });
  
  describe('Initialization', () => {
    test('should create necessary directories and index file', async () => {
      await storage.initialize();
      
      // Check if directories exist
      const debatesDir = path.join(testDataDir, 'debates');
      expect(await fs.access(debatesDir).then(() => true).catch(() => false)).toBe(true);
      
      // Check if index file exists
      const indexFile = path.join(testDataDir, 'index.json');
      expect(await fs.access(indexFile).then(() => true).catch(() => false)).toBe(true);
      
      // Verify index file content
      const indexContent = await fs.readFile(indexFile, 'utf-8');
      const index = JSON.parse(indexContent);
      expect(index).toHaveProperty('debates');
      expect(index).toHaveProperty('lastUpdated');
    });
  });
  
  describe('createDebate', () => {
    test('should create a new debate successfully', async () => {
      const request = createMockDebateRequest();
      const result = await storage.createDebate(request);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.metadata.topic.title).toBe(request.topic.title);
      expect(result.data!.rootNodeId).toBeDefined();
      expect(result.data!.nodes[result.data!.rootNodeId]).toBeDefined();
    });
    
    test('should create debate file on disk', async () => {
      const request = createMockDebateRequest();
      const result = await storage.createDebate(request);
      
      const debateId = result.data!.metadata.id;
      const debateFile = path.join(testDataDir, 'debates', `${debateId}.json`);
      
      expect(await fs.access(debateFile).then(() => true).catch(() => false)).toBe(true);
      
      const fileContent = await fs.readFile(debateFile, 'utf-8');
      const debate = JSON.parse(fileContent);
      expect(debate.metadata.id).toBe(debateId);
    });
    
    test('should update index file with new debate', async () => {
      const request = createMockDebateRequest();
      const result = await storage.createDebate(request);
      
      const indexFile = path.join(testDataDir, 'index.json');
      const indexContent = await fs.readFile(indexFile, 'utf-8');
      const index = JSON.parse(indexContent);
      
      const debateId = result.data!.metadata.id;
      expect(index.debates[debateId]).toBeDefined();
      expect(index.debates[debateId].title).toBe(request.topic.title);
    });
  });
  
  describe('getDebate', () => {
    test('should retrieve existing debate', async () => {
      // Create a debate first
      const request = createMockDebateRequest();
      const createResult = await storage.createDebate(request);
      const debateId = createResult.data!.metadata.id;
      
      // Retrieve the debate
      const getResult = await storage.getDebate(debateId);
      
      expect(getResult.success).toBe(true);
      expect(getResult.data!.metadata.id).toBe(debateId);
      expect(getResult.data!.metadata.topic.title).toBe(request.topic.title);
    });
    
    test('should return error for non-existent debate', async () => {
      const result = await storage.getDebate('non-existent-id');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });
  
  describe('updateDebate', () => {
    test('should update existing debate', async () => {
      // Create a debate first
      const request = createMockDebateRequest();
      const createResult = await storage.createDebate(request);
      const debateId = createResult.data!.metadata.id;
      
      // Update the debate
      const updates = {
        metadata: {
          ...createResult.data!.metadata,
          topic: {
            ...createResult.data!.metadata.topic,
            title: 'Updated Title'
          }
        }
      };
      
      const updateResult = await storage.updateDebate(debateId, updates);
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data!.metadata.topic.title).toBe('Updated Title');
      expect(updateResult.data!.metadata.timestamps.lastModified).not.toBe(
        createResult.data!.metadata.timestamps.created
      );
    });
    
    test('should return error for non-existent debate', async () => {
      const result = await storage.updateDebate('non-existent-id', {});
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });
  
  describe('deleteDebate', () => {
    test('should delete existing debate', async () => {
      // Create a debate first
      const request = createMockDebateRequest();
      const createResult = await storage.createDebate(request);
      const debateId = createResult.data!.metadata.id;
      
      // Delete the debate
      const deleteResult = await storage.deleteDebate(debateId);
      
      expect(deleteResult.success).toBe(true);
      
      // Verify file is deleted
      const debateFile = path.join(testDataDir, 'debates', `${debateId}.json`);
      expect(await fs.access(debateFile).then(() => true).catch(() => false)).toBe(false);
      
      // Verify index is updated
      const indexFile = path.join(testDataDir, 'index.json');
      const indexContent = await fs.readFile(indexFile, 'utf-8');
      const index = JSON.parse(indexContent);
      expect(index.debates[debateId]).toBeUndefined();
    });
  });
  
  describe('addNode', () => {
    test('should add node to existing debate', async () => {
      // Create a debate first
      const request = createMockDebateRequest();
      const createResult = await storage.createDebate(request);
      const debateId = createResult.data!.metadata.id;
      const rootNodeId = createResult.data!.rootNodeId;
      
      // Add a node
      const nodeRequest = {
        debateId,
        content: { text: 'This is a test argument' },
        participantId: 'debaterA',
        parentNodeIds: [rootNodeId],
        flags: [],
        metrics: { selfScore: 8 }
      };
      
      const result = await storage.addNode(nodeRequest);
      
      expect(result.success).toBe(true);
      expect(result.data!.metadata.analytics.totalNodes).toBe(2);
      
      // Find the new node
      const newNode = Object.values(result.data!.nodes).find(
        node => node.content.text === 'This is a test argument'
      );
      expect(newNode).toBeDefined();
      expect(newNode!.participantId).toBe('debaterA');
    });
    
    test('should update parent-child relationships', async () => {
      const request = createMockDebateRequest();
      const createResult = await storage.createDebate(request);
      const debateId = createResult.data!.metadata.id;
      const rootNodeId = createResult.data!.rootNodeId;
      
      const nodeRequest = {
        debateId,
        content: { text: 'Child argument' },
        participantId: 'debaterA',
        parentNodeIds: [rootNodeId],
        flags: [],
        metrics: {}
      };
      
      const result = await storage.addNode(nodeRequest);
      
      // Check parent node has child relationship
      const rootNode = result.data!.nodes[rootNodeId];
      expect(rootNode.relationships.children).toHaveLength(1);
      
      // Check child node has parent relationship
      const childNodeId = rootNode.relationships.children[0].targetNodeId;
      const childNode = result.data!.nodes[childNodeId];
      expect(childNode.relationships.parents).toHaveLength(1);
      expect(childNode.relationships.parents[0].targetNodeId).toBe(rootNodeId);
    });
  });
  
  describe('searchDebates', () => {
    beforeEach(async () => {
      // Create test debates
      await storage.createDebate({
        ...createMockDebateRequest(),
        topic: { title: 'AI Safety', description: 'AI safety debate', tags: ['ai', 'safety'], category: 'technology' }
      });
      
      await storage.createDebate({
        ...createMockDebateRequest(),
        topic: { title: 'Climate Change', description: 'Climate policy debate', tags: ['climate', 'policy'], category: 'environment' }
      });
    });
    
    test('should search debates by text', async () => {
      const result = await storage.searchDebates({ text: 'AI' });
      
      expect(result.success).toBe(true);
      expect(result.data!.debates).toHaveLength(1);
      expect(result.data!.debates[0].metadata.topic.title).toBe('AI Safety');
    });
    
    test('should filter debates by status', async () => {
      const result = await storage.searchDebates({ status: ['draft'] });
      
      expect(result.success).toBe(true);
      expect(result.data!.debates).toHaveLength(2); // All created debates are drafts by default
    });
    
    test('should apply pagination', async () => {
      const result = await storage.searchDebates({ limit: 1, offset: 0 });
      
      expect(result.success).toBe(true);
      expect(result.data!.debates).toHaveLength(1);
    });
  });
  
  describe('exportDebate', () => {
    test('should export debate as JSON', async () => {
      const request = createMockDebateRequest();
      const createResult = await storage.createDebate(request);
      const debateId = createResult.data!.metadata.id;
      
      const exportResult = await storage.exportDebate(debateId, { format: 'json' });
      
      expect(exportResult.success).toBe(true);
      expect(exportResult.data!.mimeType).toBe('application/json');
      expect(exportResult.data!.filename).toBe(`debate-${debateId}.json`);
      
      const exportedData = JSON.parse(exportResult.data!.data as string);
      expect(exportedData.metadata.id).toBe(debateId);
    });
    
    test('should export debate as Markdown', async () => {
      const request = createMockDebateRequest();
      const createResult = await storage.createDebate(request);
      const debateId = createResult.data!.metadata.id;
      
      const exportResult = await storage.exportDebate(debateId, { format: 'markdown' });
      
      expect(exportResult.success).toBe(true);
      expect(exportResult.data!.mimeType).toBe('text/markdown');
      expect(exportResult.data!.filename).toBe(`debate-${debateId}.markdown`);
      expect(typeof exportResult.data!.data).toBe('string');
      expect(exportResult.data!.data as string).toContain(request.topic.title);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle invalid JSON files gracefully', async () => {
      // Create invalid JSON file
      const invalidDebateId = 'invalid-debate';
      const invalidFile = path.join(testDataDir, 'debates', `${invalidDebateId}.json`);
      
      await fs.mkdir(path.dirname(invalidFile), { recursive: true });
      await fs.writeFile(invalidFile, 'invalid json content');
      
      const result = await storage.getDebate(invalidDebateId);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READ_FAILED');
    });
    
    test('should validate debate documents', async () => {
      const invalidDebate = createMockDebateDocument();
      delete invalidDebate.rootNodeId; // Make it invalid
      
      const validationResult = await storage.validateDebate(invalidDebate);
      
      expect(validationResult.success).toBe(false);
      expect(validationResult.error?.code).toBe('INVALID');
    });
  });
});