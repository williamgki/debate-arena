// Base storage interface for debate storage system
// Supports multiple storage backends (JSON files, databases, etc.)

import { 
  DebateDocument, 
  UUID, 
  SearchQuery, 
  SearchResult, 
  ApiResponse,
  CreateDebateRequest,
  AddNodeRequest,
  AddAnnotationRequest,
  ExportOptions,
  ExportResult
} from '@/types/debate';

export interface StorageBackend {
  // Core CRUD operations
  createDebate(request: CreateDebateRequest): Promise<ApiResponse<DebateDocument>>;
  getDebate(id: UUID): Promise<ApiResponse<DebateDocument>>;
  updateDebate(id: UUID, updates: Partial<DebateDocument>): Promise<ApiResponse<DebateDocument>>;
  deleteDebate(id: UUID): Promise<ApiResponse<void>>;
  
  // Node operations
  addNode(request: AddNodeRequest): Promise<ApiResponse<DebateDocument>>;
  updateNode(debateId: UUID, nodeId: UUID, updates: Partial<AddNodeRequest>): Promise<ApiResponse<DebateDocument>>;
  deleteNode(debateId: UUID, nodeId: UUID): Promise<ApiResponse<DebateDocument>>;
  
  // Annotation operations
  addAnnotation(request: AddAnnotationRequest): Promise<ApiResponse<DebateDocument>>;
  updateAnnotation(debateId: UUID, annotationId: UUID, updates: Partial<AddAnnotationRequest>): Promise<ApiResponse<DebateDocument>>;
  deleteAnnotation(debateId: UUID, annotationId: UUID): Promise<ApiResponse<DebateDocument>>;
  
  // Search and query
  searchDebates(query: SearchQuery): Promise<ApiResponse<SearchResult>>;
  listDebates(limit?: number, offset?: number): Promise<ApiResponse<SearchResult>>;
  
  // Export
  exportDebate(id: UUID, options: ExportOptions): Promise<ApiResponse<ExportResult>>;
  
  // Utility
  getDebateStats(id: UUID): Promise<ApiResponse<any>>;
  validateDebate(debate: DebateDocument): Promise<ApiResponse<boolean>>;
}

export abstract class BaseStorage implements StorageBackend {
  abstract createDebate(request: CreateDebateRequest): Promise<ApiResponse<DebateDocument>>;
  abstract getDebate(id: UUID): Promise<ApiResponse<DebateDocument>>;
  abstract updateDebate(id: UUID, updates: Partial<DebateDocument>): Promise<ApiResponse<DebateDocument>>;
  abstract deleteDebate(id: UUID): Promise<ApiResponse<void>>;
  abstract addNode(request: AddNodeRequest): Promise<ApiResponse<DebateDocument>>;
  abstract updateNode(debateId: UUID, nodeId: UUID, updates: Partial<AddNodeRequest>): Promise<ApiResponse<DebateDocument>>;
  abstract deleteNode(debateId: UUID, nodeId: UUID): Promise<ApiResponse<DebateDocument>>;
  abstract addAnnotation(request: AddAnnotationRequest): Promise<ApiResponse<DebateDocument>>;
  abstract updateAnnotation(debateId: UUID, annotationId: UUID, updates: Partial<AddAnnotationRequest>): Promise<ApiResponse<DebateDocument>>;
  abstract deleteAnnotation(debateId: UUID, annotationId: UUID): Promise<ApiResponse<DebateDocument>>;
  abstract searchDebates(query: SearchQuery): Promise<ApiResponse<SearchResult>>;
  abstract listDebates(limit?: number, offset?: number): Promise<ApiResponse<SearchResult>>;
  abstract exportDebate(id: UUID, options: ExportOptions): Promise<ApiResponse<ExportResult>>;
  
  // Default implementations
  async getDebateStats(id: UUID): Promise<ApiResponse<any>> {
    const debate = await this.getDebate(id);
    if (!debate.success || !debate.data) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Debate not found' } };
    }
    
    return {
      success: true,
      data: debate.data.metadata.analytics
    };
  }
  
  async validateDebate(debate: DebateDocument): Promise<ApiResponse<boolean>> {
    try {
      // Basic validation
      if (!debate.metadata?.id) {
        return { success: false, error: { code: 'INVALID', message: 'Missing debate ID' } };
      }
      
      if (!debate.rootNodeId || !debate.nodes[debate.rootNodeId]) {
        return { success: false, error: { code: 'INVALID', message: 'Invalid root node' } };
      }
      
      // Validate node relationships
      for (const node of Object.values(debate.nodes)) {
        for (const rel of node.relationships.parents) {
          if (!debate.nodes[rel.targetNodeId]) {
            return { success: false, error: { code: 'INVALID', message: `Invalid parent reference: ${rel.targetNodeId}` } };
          }
        }
      }
      
      return { success: true, data: true };
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: error instanceof Error ? error.message : 'Unknown validation error' 
        } 
      };
    }
  }
  
  // Utility methods for subclasses
  protected generateId(): UUID {
    return crypto.randomUUID();
  }
  
  protected getCurrentTimestamp(): string {
    return new Date().toISOString();
  }
  
  protected createSuccessResponse<T>(data: T): ApiResponse<T> {
    return { success: true, data };
  }
  
  protected createErrorResponse(code: string, message: string, details?: any): ApiResponse<any> {
    return { success: false, error: { code, message, details } };
  }
}