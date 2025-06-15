// Integration tests for debate API endpoints
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/debates/route';
import { GET as getDebate, PUT as putDebate, DELETE as deleteDebate } from '@/app/api/debates/[id]/route';
import { createMockDebateRequest, mockApiResponses } from '../fixtures/mock-debates';

// Mock the storage manager
jest.mock('@/lib/storage/storage-manager', () => ({
  storage: {
    searchDebates: jest.fn(),
    createDebate: jest.fn(),
    getDebate: jest.fn(),
    updateDebate: jest.fn(),
    deleteDebate: jest.fn(),
  }
}));

import { storage } from '@/lib/storage/storage-manager';

describe('/api/debates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('GET /api/debates', () => {
    test('should return list of debates', async () => {
      (storage.searchDebates as jest.Mock).mockResolvedValue(mockApiResponses.success.searchDebates);
      
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/debates',
      });
      
      await GET(req);
      
      expect(storage.searchDebates).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        sortBy: 'created',
        sortOrder: 'desc'
      });
    });
    
    test('should handle search parameters', async () => {
      (storage.searchDebates as jest.Mock).mockResolvedValue(mockApiResponses.success.searchDebates);
      
      const { req } = createMocks({
        method: 'GET',
        url: '/api/debates?q=AI+safety&status=active&limit=20&offset=10',
      });
      
      await GET(req);
      
      expect(storage.searchDebates).toHaveBeenCalledWith({
        text: 'AI safety',
        status: ['active'],
        limit: 20,
        offset: 10,
        sortBy: 'created',
        sortOrder: 'desc'
      });
    });
    
    test('should handle date range parameters', async () => {
      (storage.searchDebates as jest.Mock).mockResolvedValue(mockApiResponses.success.searchDebates);
      
      const { req } = createMocks({
        method: 'GET',
        url: '/api/debates?startDate=2024-01-01&endDate=2024-12-31',
      });
      
      await GET(req);
      
      expect(storage.searchDebates).toHaveBeenCalledWith({
        dateRange: ['2024-01-01', '2024-12-31'],
        limit: 10,
        offset: 0,
        sortBy: 'created',
        sortOrder: 'desc'
      });
    });
    
    test('should handle storage errors', async () => {
      (storage.searchDebates as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'SEARCH_FAILED', message: 'Search failed' }
      });
      
      const { req } = createMocks({
        method: 'GET',
        url: '/api/debates',
      });
      
      const response = await GET(req);
      const body = await response.json();
      
      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
    });
  });
  
  describe('POST /api/debates', () => {
    test('should create new debate', async () => {
      (storage.createDebate as jest.Mock).mockResolvedValue(mockApiResponses.success.createDebate);
      
      const debateRequest = createMockDebateRequest();
      const { req } = createMocks({
        method: 'POST',
        url: '/api/debates',
        body: debateRequest,
      });
      
      const response = await POST(req);
      const body = await response.json();
      
      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(storage.createDebate).toHaveBeenCalledWith(debateRequest);
    });
    
    test('should validate required fields', async () => {
      const invalidRequest = {
        // Missing required fields
        topic: {},
        participants: []
      };
      
      const { req } = createMocks({
        method: 'POST',
        url: '/api/debates',
        body: invalidRequest,
      });
      
      const response = await POST(req);
      const body = await response.json();
      
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
    
    test('should validate topic title', async () => {
      const invalidRequest = {
        topic: { title: '' }, // Empty title
        initialTopic: 'Test',
        participants: [{}]
      };
      
      const { req } = createMocks({
        method: 'POST',
        url: '/api/debates',
        body: invalidRequest,
      });
      
      const response = await POST(req);
      const body = await response.json();
      
      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
    
    test('should validate participants', async () => {
      const invalidRequest = {
        topic: { title: 'Test' },
        initialTopic: 'Test',
        participants: [] // Empty participants
      };
      
      const { req } = createMocks({
        method: 'POST',
        url: '/api/debates',
        body: invalidRequest,
      });
      
      const response = await POST(req);
      const body = await response.json();
      
      expect(response.status).toBe(400);
      expect(body.error.message).toContain('participant');
    });
    
    test('should handle invalid JSON', async () => {
      const { req } = createMocks({
        method: 'POST',
        url: '/api/debates',
        body: 'invalid json',
      });
      
      const response = await POST(req);
      const body = await response.json();
      
      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('/api/debates/[id]', () => {
  describe('GET /api/debates/[id]', () => {
    test('should return specific debate', async () => {
      (storage.getDebate as jest.Mock).mockResolvedValue(mockApiResponses.success.getDebate);
      
      const { req } = createMocks({
        method: 'GET',
        url: '/api/debates/test-id',
      });
      
      const response = await getDebate(req, { params: { id: 'test-id' } });
      const body = await response.json();
      
      expect(body.success).toBe(true);
      expect(storage.getDebate).toHaveBeenCalledWith('test-id');
    });
    
    test('should handle non-existent debate', async () => {
      (storage.getDebate as jest.Mock).mockResolvedValue(mockApiResponses.error.notFound);
      
      const { req } = createMocks({
        method: 'GET',
        url: '/api/debates/non-existent',
      });
      
      const response = await getDebate(req, { params: { id: 'non-existent' } });
      const body = await response.json();
      
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });
    
    test('should validate debate ID parameter', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/debates/',
      });
      
      const response = await getDebate(req, { params: { id: '' } });
      const body = await response.json();
      
      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
  
  describe('PUT /api/debates/[id]', () => {
    test('should update existing debate', async () => {
      (storage.updateDebate as jest.Mock).mockResolvedValue(mockApiResponses.success.getDebate);
      
      const updates = {
        metadata: {
          topic: { title: 'Updated Title' }
        }
      };
      
      const { req } = createMocks({
        method: 'PUT',
        url: '/api/debates/test-id',
        body: updates,
      });
      
      const response = await putDebate(req, { params: { id: 'test-id' } });
      const body = await response.json();
      
      expect(body.success).toBe(true);
      expect(storage.updateDebate).toHaveBeenCalledWith('test-id', updates);
    });
    
    test('should handle update of non-existent debate', async () => {
      (storage.updateDebate as jest.Mock).mockResolvedValue(mockApiResponses.error.notFound);
      
      const { req } = createMocks({
        method: 'PUT',
        url: '/api/debates/non-existent',
        body: {},
      });
      
      const response = await putDebate(req, { params: { id: 'non-existent' } });
      const body = await response.json();
      
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });
  });
  
  describe('DELETE /api/debates/[id]', () => {
    test('should delete existing debate', async () => {
      (storage.deleteDebate as jest.Mock).mockResolvedValue({ success: true });
      
      const { req } = createMocks({
        method: 'DELETE',
        url: '/api/debates/test-id',
      });
      
      const response = await deleteDebate(req, { params: { id: 'test-id' } });
      const body = await response.json();
      
      expect(body.success).toBe(true);
      expect(storage.deleteDebate).toHaveBeenCalledWith('test-id');
    });
    
    test('should handle deletion of non-existent debate', async () => {
      (storage.deleteDebate as jest.Mock).mockResolvedValue(mockApiResponses.error.notFound);
      
      const { req } = createMocks({
        method: 'DELETE',
        url: '/api/debates/non-existent',
      });
      
      const response = await deleteDebate(req, { params: { id: 'non-existent' } });
      const body = await response.json();
      
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
    });
  });
});