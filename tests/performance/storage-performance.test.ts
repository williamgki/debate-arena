// Performance tests for storage operations
import { FileStorage } from '@/lib/storage/file-storage';
import { createMockDebateRequest } from '../fixtures/mock-debates';

describe('Storage Performance Tests', () => {
  let storage: FileStorage;
  const testDataDir = './tests/data/debates-perf';
  
  beforeAll(async () => {
    storage = new FileStorage(testDataDir);
    await storage.initialize();
  });
  
  afterAll(async () => {
    // Clean up test files
    const fs = require('fs').promises;
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  });
  
  describe('Debate Creation Performance', () => {
    test('should create debates efficiently', async () => {
      const startTime = performance.now();
      const numDebates = 10;
      const promises = [];
      
      for (let i = 0; i < numDebates; i++) {
        const request = {
          ...createMockDebateRequest(),
          topic: { ...createMockDebateRequest().topic, title: `Performance Test Debate ${i}` }
        };
        promises.push(storage.createDebate(request));
      }
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`Created ${numDebates} debates in ${duration.toFixed(2)}ms`);
      console.log(`Average: ${(duration / numDebates).toFixed(2)}ms per debate`);
      
      // Performance assertions
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(results.every(r => r.success)).toBe(true);
      expect(duration / numDebates).toBeLessThan(500); // Less than 500ms per debate
    }, 10000);
  });
  
  describe('Search Performance', () => {
    let debateIds: string[] = [];
    
    beforeAll(async () => {
      // Create test debates for searching
      const promises = [];
      for (let i = 0; i < 20; i++) {
        const request = {
          ...createMockDebateRequest(),
          topic: {
            title: `Search Test ${i}`,
            description: `Test debate ${i} for search performance`,
            tags: ['test', 'performance', i % 2 === 0 ? 'even' : 'odd'],
            category: i % 3 === 0 ? 'technology' : 'general'
          }
        };
        promises.push(storage.createDebate(request));
      }
      
      const results = await Promise.all(promises);
      debateIds = results.map(r => r.data!.metadata.id);
    });
    
    test('should search debates efficiently', async () => {
      const queries = [
        { text: 'Search Test' },
        { text: 'performance' },
        { tags: ['test'] },
        { status: ['draft'] },
        { text: 'test', status: ['draft'] }
      ];
      
      for (const query of queries) {
        const startTime = performance.now();
        const result = await storage.searchDebates(query);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`Search query ${JSON.stringify(query)} took ${duration.toFixed(2)}ms`);
        
        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(1000); // Should complete within 1 second
      }
    });
    
    test('should handle pagination efficiently', async () => {
      const pageSize = 5;
      const startTime = performance.now();
      
      // Test multiple pages
      for (let page = 0; page < 4; page++) {
        const result = await storage.searchDebates({
          limit: pageSize,
          offset: page * pageSize
        });
        
        expect(result.success).toBe(true);
        expect(result.data!.debates.length).toBeLessThanOrEqual(pageSize);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`Paginated search (4 pages) took ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
  
  describe('Node Addition Performance', () => {
    let debateId: string;
    
    beforeAll(async () => {
      const request = createMockDebateRequest();
      const result = await storage.createDebate(request);
      debateId = result.data!.metadata.id;
    });
    
    test('should add multiple nodes efficiently', async () => {
      const numNodes = 50;
      const startTime = performance.now();
      
      // Get the debate to find root node
      const debate = await storage.getDebate(debateId);
      const rootNodeId = debate.data!.rootNodeId;
      let lastNodeId = rootNodeId;
      
      // Add nodes sequentially to create a thread
      for (let i = 0; i < numNodes; i++) {
        const nodeRequest = {
          debateId,
          content: { text: `Performance test argument ${i}` },
          participantId: i % 2 === 0 ? 'debaterA' : 'debaterB',
          parentNodeIds: [lastNodeId],
          flags: [],
          metrics: { selfScore: 7 }
        };
        
        const result = await storage.addNode(nodeRequest);
        expect(result.success).toBe(true);
        
        // Find the new node ID for next iteration
        const newNodeId = Object.keys(result.data!.nodes).find(id => 
          result.data!.nodes[id].content.text === `Performance test argument ${i}`
        );
        lastNodeId = newNodeId!;
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`Added ${numNodes} nodes in ${duration.toFixed(2)}ms`);
      console.log(`Average: ${(duration / numNodes).toFixed(2)}ms per node`);
      
      // Performance assertions
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(duration / numNodes).toBeLessThan(200); // Less than 200ms per node
    }, 15000);
  });
  
  describe('Export Performance', () => {
    let largeDebateId: string;
    
    beforeAll(async () => {
      // Create a debate with many nodes
      const request = createMockDebateRequest();
      const debateResult = await storage.createDebate(request);
      largeDebateId = debateResult.data!.metadata.id;
      
      // Add many nodes
      const rootNodeId = debateResult.data!.rootNodeId;
      let parentIds = [rootNodeId];
      
      for (let depth = 1; depth < 4; depth++) {
        const newParentIds = [];
        for (const parentId of parentIds) {
          for (let i = 0; i < 3; i++) { // 3 children per parent
            const nodeRequest = {
              debateId: largeDebateId,
              content: { text: `Depth ${depth} argument ${i}` },
              participantId: i % 2 === 0 ? 'debaterA' : 'debaterB',
              parentNodeIds: [parentId],
              flags: [],
              metrics: {}
            };
            
            const result = await storage.addNode(nodeRequest);
            const newNodeId = Object.keys(result.data!.nodes).find(id =>
              result.data!.nodes[id].content.text === `Depth ${depth} argument ${i}`
            );
            newParentIds.push(newNodeId!);
          }
        }
        parentIds = newParentIds;
      }
    });
    
    test('should export large debates efficiently', async () => {
      const formats = ['json', 'markdown'];
      
      for (const format of formats) {
        const startTime = performance.now();
        const result = await storage.exportDebate(largeDebateId, { format: format as any });
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`Export to ${format} took ${duration.toFixed(2)}ms`);
        
        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      }
    });
  });
  
  describe('Concurrent Operations', () => {
    test('should handle concurrent debate creation', async () => {
      const concurrency = 5;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrency }, (_, i) => {
        const request = {
          ...createMockDebateRequest(),
          topic: { ...createMockDebateRequest().topic, title: `Concurrent Test ${i}` }
        };
        return storage.createDebate(request);
      });
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`${concurrency} concurrent debates created in ${duration.toFixed(2)}ms`);
      
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });
    
    test('should handle concurrent searches', async () => {
      const concurrency = 10;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrency }, (_, i) => 
        storage.searchDebates({ text: `Concurrent Test ${i % 3}` })
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`${concurrency} concurrent searches completed in ${duration.toFixed(2)}ms`);
      
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
  
  describe('Memory Usage', () => {
    test('should not leak memory during operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 20; i++) {
        const request = createMockDebateRequest();
        const result = await storage.createDebate(request);
        await storage.getDebate(result.data!.metadata.id);
        await storage.searchDebates({ text: 'test' });
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      
      // Should not increase memory by more than 50MB
      expect(memoryIncreaseMB).toBeLessThan(50);
    });
  });
});