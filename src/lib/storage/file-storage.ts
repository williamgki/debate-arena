// File-based storage implementation for debate storage system
// Uses JSON files for persistence - suitable for development and small deployments

import { promises as fs } from 'fs';
import path from 'path';
import { BaseStorage } from './base';
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
  ExportResult,
  DebateNode,
  ParticipantInfo,
  NodeRelationship,
  Annotation
} from '@/types/debate';

export class FileStorage extends BaseStorage {
  private readonly dataDir: string;
  private readonly debatesDir: string;
  private readonly indexFile: string;
  
  constructor(dataDir: string = './data/debates') {
    super();
    this.dataDir = dataDir;
    this.debatesDir = path.join(dataDir, 'debates');
    this.indexFile = path.join(dataDir, 'index.json');
  }
  
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.debatesDir, { recursive: true });
      
      // Create index file if it doesn't exist
      try {
        await fs.access(this.indexFile);
      } catch {
        await fs.writeFile(this.indexFile, JSON.stringify({
          debates: {},
          lastUpdated: this.getCurrentTimestamp()
        }, null, 2));
      }
    } catch (error) {
      throw new Error(`Failed to initialize file storage: ${error}`);
    }
  }
  
  private async readIndex(): Promise<{ debates: Record<UUID, { title: string; created: string; status: string }>, lastUpdated: string }> {
    try {
      const data = await fs.readFile(this.indexFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { debates: {}, lastUpdated: this.getCurrentTimestamp() };
    }
  }
  
  private async writeIndex(index: { debates: Record<UUID, any>, lastUpdated: string }): Promise<void> {
    await fs.writeFile(this.indexFile, JSON.stringify(index, null, 2));
  }
  
  private getDebateFilePath(id: UUID): string {
    return path.join(this.debatesDir, `${id}.json`);
  }
  
  async createDebate(request: CreateDebateRequest): Promise<ApiResponse<DebateDocument>> {
    try {
      await this.initialize();
      
      const id = this.generateId();
      const now = this.getCurrentTimestamp();
      
      // Create root node
      const rootNodeId = this.generateId();
      const rootNode: DebateNode = {
        id: rootNodeId,
        content: {
          text: request.initialTopic
        },
        participantId: 'system',
        timestamps: {
          created: now,
          finalized: now
        },
        relationships: {
          parents: [],
          children: []
        },
        position: {
          depth: 0,
          threadId: this.generateId(),
          sequenceInThread: 0
        },
        flags: [],
        metrics: {},
        version: 1
      };
      
      // Create participants record
      const participants: Record<UUID, ParticipantInfo> = {};
      for (const participant of request.participants) {
        participants[participant.id] = participant;
      }
      
      // System participant
      participants['system'] = {
        id: 'system',
        role: 'system',
        type: 'system',
        name: 'System'
      };
      
      const debate: DebateDocument = {
        metadata: {
          id,
          version: '1.0',
          topic: request.topic,
          timestamps: {
            created: now,
            lastModified: now
          },
          status: 'draft',
          format: request.format,
          configuration: request.configuration,
          access: request.access,
          analytics: {
            totalNodes: 1,
            totalParticipants: request.participants.length,
            totalJudgments: 0,
            totalFlags: 0,
            averageDepth: 0,
            longestThread: 1
          }
        },
        participants,
        nodes: {
          [rootNodeId]: rootNode
        },
        annotations: {},
        rootNodeId
      };
      
      // Save debate file
      await fs.writeFile(this.getDebateFilePath(id), JSON.stringify(debate, null, 2));
      
      // Update index
      const index = await this.readIndex();
      index.debates[id] = {
        title: request.topic.title,
        created: now,
        status: 'draft'
      };
      index.lastUpdated = now;
      await this.writeIndex(index);
      
      return this.createSuccessResponse(debate);
    } catch (error) {
      return this.createErrorResponse('CREATE_FAILED', `Failed to create debate: ${error}`);
    }
  }
  
  async getDebate(id: UUID): Promise<ApiResponse<DebateDocument>> {
    try {
      const filePath = this.getDebateFilePath(id);
      const data = await fs.readFile(filePath, 'utf-8');
      const debate: DebateDocument = JSON.parse(data);
      return this.createSuccessResponse(debate);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return this.createErrorResponse('NOT_FOUND', `Debate ${id} not found`);
      }
      return this.createErrorResponse('READ_FAILED', `Failed to read debate: ${error}`);
    }
  }
  
  async updateDebate(id: UUID, updates: Partial<DebateDocument>): Promise<ApiResponse<DebateDocument>> {
    try {
      const currentResult = await this.getDebate(id);
      if (!currentResult.success || !currentResult.data) {
        return currentResult;
      }
      
      const updatedDebate: DebateDocument = {
        ...currentResult.data,
        ...updates,
        metadata: {
          ...currentResult.data.metadata,
          ...updates.metadata,
          timestamps: {
            ...currentResult.data.metadata.timestamps,
            lastModified: this.getCurrentTimestamp()
          }
        }
      };
      
      await fs.writeFile(this.getDebateFilePath(id), JSON.stringify(updatedDebate, null, 2));
      
      // Update index if title changed
      if (updates.metadata?.topic?.title) {
        const index = await this.readIndex();
        if (index.debates[id]) {
          index.debates[id].title = updates.metadata.topic.title;
          index.lastUpdated = this.getCurrentTimestamp();
          await this.writeIndex(index);
        }
      }
      
      return this.createSuccessResponse(updatedDebate);
    } catch (error) {
      return this.createErrorResponse('UPDATE_FAILED', `Failed to update debate: ${error}`);
    }
  }
  
  async deleteDebate(id: UUID): Promise<ApiResponse<void>> {
    try {
      await fs.unlink(this.getDebateFilePath(id));
      
      // Update index
      const index = await this.readIndex();
      delete index.debates[id];
      index.lastUpdated = this.getCurrentTimestamp();
      await this.writeIndex(index);
      
      return this.createSuccessResponse(undefined);
    } catch (error) {
      return this.createErrorResponse('DELETE_FAILED', `Failed to delete debate: ${error}`);
    }
  }
  
  async addNode(request: AddNodeRequest): Promise<ApiResponse<DebateDocument>> {
    try {
      const debateResult = await this.getDebate(request.debateId);
      if (!debateResult.success || !debateResult.data) {
        return debateResult;
      }
      
      const debate = debateResult.data;
      const nodeId = this.generateId();
      const now = this.getCurrentTimestamp();
      
      // Calculate position
      const parentNodes = request.parentNodeIds || [];
      const maxDepth = parentNodes.length > 0 
        ? Math.max(...parentNodes.map(pid => debate.nodes[pid]?.position.depth || 0))
        : 0;
      
      const newNode: DebateNode = {
        id: nodeId,
        content: request.content,
        participantId: request.participantId,
        timestamps: {
          created: now
        },
        relationships: {
          parents: parentNodes.map(pid => ({ targetNodeId: pid, type: 'responds-to' })),
          children: []
        },
        position: {
          depth: maxDepth + 1,
          threadId: parentNodes.length > 0 ? debate.nodes[parentNodes[0]]?.position.threadId || this.generateId() : this.generateId(),
          sequenceInThread: 0 // Will be calculated
        },
        flags: request.flags || [],
        metrics: request.metrics || {},
        version: 1
      };
      
      // Add node to debate
      debate.nodes[nodeId] = newNode;
      
      // Update parent relationships
      for (const parentId of parentNodes) {
        if (debate.nodes[parentId]) {
          debate.nodes[parentId].relationships.children.push({
            targetNodeId: nodeId,
            type: 'responds-to'
          });
        }
      }
      
      // Update analytics
      debate.metadata.analytics.totalNodes++;
      debate.metadata.analytics.averageDepth = this.calculateAverageDepth(debate);
      debate.metadata.analytics.longestThread = this.calculateLongestThread(debate);
      
      return await this.updateDebate(request.debateId, debate);
    } catch (error) {
      return this.createErrorResponse('ADD_NODE_FAILED', `Failed to add node: ${error}`);
    }
  }
  
  async updateNode(debateId: UUID, nodeId: UUID, updates: Partial<AddNodeRequest>): Promise<ApiResponse<DebateDocument>> {
    try {
      const debateResult = await this.getDebate(debateId);
      if (!debateResult.success || !debateResult.data) {
        return debateResult;
      }
      
      const debate = debateResult.data;
      if (!debate.nodes[nodeId]) {
        return this.createErrorResponse('NOT_FOUND', `Node ${nodeId} not found`);
      }
      
      const updatedNode = {
        ...debate.nodes[nodeId],
        ...updates,
        timestamps: {
          ...debate.nodes[nodeId].timestamps,
          lastModified: this.getCurrentTimestamp()
        },
        version: debate.nodes[nodeId].version + 1
      };
      
      debate.nodes[nodeId] = updatedNode;
      
      return await this.updateDebate(debateId, debate);
    } catch (error) {
      return this.createErrorResponse('UPDATE_NODE_FAILED', `Failed to update node: ${error}`);
    }
  }
  
  async deleteNode(debateId: UUID, nodeId: UUID): Promise<ApiResponse<DebateDocument>> {
    try {
      const debateResult = await this.getDebate(debateId);
      if (!debateResult.success || !debateResult.data) {
        return debateResult;
      }
      
      const debate = debateResult.data;
      if (!debate.nodes[nodeId]) {
        return this.createErrorResponse('NOT_FOUND', `Node ${nodeId} not found`);
      }
      
      // Remove node and update relationships
      delete debate.nodes[nodeId];
      
      // Update parent/child relationships
      for (const node of Object.values(debate.nodes)) {
        node.relationships.children = node.relationships.children.filter(
          rel => rel.targetNodeId !== nodeId
        );
        node.relationships.parents = node.relationships.parents.filter(
          rel => rel.targetNodeId !== nodeId
        );
      }
      
      // Update analytics
      debate.metadata.analytics.totalNodes--;
      
      return await this.updateDebate(debateId, debate);
    } catch (error) {
      return this.createErrorResponse('DELETE_NODE_FAILED', `Failed to delete node: ${error}`);
    }
  }
  
  async addAnnotation(request: AddAnnotationRequest): Promise<ApiResponse<DebateDocument>> {
    try {
      const debateResult = await this.getDebate(request.debateId);
      if (!debateResult.success || !debateResult.data) {
        return debateResult;
      }
      
      const debate = debateResult.data;
      const annotationId = this.generateId();
      
      const annotation: Annotation = {
        id: annotationId,
        type: request.type,
        targetNodeId: request.targetNodeId,
        targetSpan: request.targetSpan,
        content: request.content,
        annotatorId: request.annotatorId,
        timestamp: this.getCurrentTimestamp(),
        visibility: request.visibility
      };
      
      debate.annotations[annotationId] = annotation;
      debate.metadata.analytics.totalJudgments++;
      
      return await this.updateDebate(request.debateId, debate);
    } catch (error) {
      return this.createErrorResponse('ADD_ANNOTATION_FAILED', `Failed to add annotation: ${error}`);
    }
  }
  
  async updateAnnotation(debateId: UUID, annotationId: UUID, updates: Partial<AddAnnotationRequest>): Promise<ApiResponse<DebateDocument>> {
    try {
      const debateResult = await this.getDebate(debateId);
      if (!debateResult.success || !debateResult.data) {
        return debateResult;
      }
      
      const debate = debateResult.data;
      if (!debate.annotations[annotationId]) {
        return this.createErrorResponse('NOT_FOUND', `Annotation ${annotationId} not found`);
      }
      
      debate.annotations[annotationId] = {
        ...debate.annotations[annotationId],
        ...updates
      };
      
      return await this.updateDebate(debateId, debate);
    } catch (error) {
      return this.createErrorResponse('UPDATE_ANNOTATION_FAILED', `Failed to update annotation: ${error}`);
    }
  }
  
  async deleteAnnotation(debateId: UUID, annotationId: UUID): Promise<ApiResponse<DebateDocument>> {
    try {
      const debateResult = await this.getDebate(debateId);
      if (!debateResult.success || !debateResult.data) {
        return debateResult;
      }
      
      const debate = debateResult.data;
      if (!debate.annotations[annotationId]) {
        return this.createErrorResponse('NOT_FOUND', `Annotation ${annotationId} not found`);
      }
      
      delete debate.annotations[annotationId];
      debate.metadata.analytics.totalJudgments--;
      
      return await this.updateDebate(debateId, debate);
    } catch (error) {
      return this.createErrorResponse('DELETE_ANNOTATION_FAILED', `Failed to delete annotation: ${error}`);
    }
  }
  
  async searchDebates(query: SearchQuery): Promise<ApiResponse<SearchResult>> {
    try {
      const index = await this.readIndex();
      const debateIds = Object.keys(index.debates);
      const results: DebateDocument[] = [];
      
      for (const id of debateIds) {
        const debateResult = await this.getDebate(id);
        if (debateResult.success && debateResult.data) {
          const debate = debateResult.data;
          
          // Simple text search
          if (query.text) {
            const searchText = query.text.toLowerCase();
            const titleMatch = debate.metadata.topic.title.toLowerCase().includes(searchText);
            const contentMatch = Object.values(debate.nodes).some(node => 
              node.content.text.toLowerCase().includes(searchText)
            );
            
            if (!titleMatch && !contentMatch) continue;
          }
          
          // Status filter
          if (query.status && !query.status.includes(debate.metadata.status)) {
            continue;
          }
          
          // Date range filter
          if (query.dateRange) {
            const created = new Date(debate.metadata.timestamps.created);
            const [start, end] = query.dateRange.map(d => new Date(d));
            if (created < start || created > end) continue;
          }
          
          results.push(debate);
        }
      }
      
      // Apply sorting
      results.sort((a, b) => {
        const aDate = new Date(a.metadata.timestamps.created);
        const bDate = new Date(b.metadata.timestamps.created);
        return query.sortOrder === 'desc' ? bDate.getTime() - aDate.getTime() : aDate.getTime() - bDate.getTime();
      });
      
      // Apply pagination
      const limit = query.limit || 10;
      const offset = query.offset || 0;
      const paginatedResults = results.slice(offset, offset + limit);
      
      return this.createSuccessResponse({
        debates: paginatedResults,
        totalCount: results.length
      });
    } catch (error) {
      return this.createErrorResponse('SEARCH_FAILED', `Failed to search debates: ${error}`);
    }
  }
  
  async listDebates(limit: number = 10, offset: number = 0): Promise<ApiResponse<SearchResult>> {
    return this.searchDebates({ limit, offset, sortBy: 'created', sortOrder: 'desc' });
  }
  
  async exportDebate(id: UUID, options: ExportOptions): Promise<ApiResponse<ExportResult>> {
    try {
      const debateResult = await this.getDebate(id);
      if (!debateResult.success || !debateResult.data) {
        return debateResult;
      }
      
      const debate = debateResult.data;
      let data: string;
      let mimeType: string;
      
      switch (options.format) {
        case 'json':
          data = JSON.stringify(debate, null, 2);
          mimeType = 'application/json';
          break;
        case 'markdown':
          data = this.formatAsMarkdown(debate, options);
          mimeType = 'text/markdown';
          break;
        default:
          return this.createErrorResponse('UNSUPPORTED_FORMAT', `Export format ${options.format} not supported`);
      }
      
      const result: ExportResult = {
        data,
        mimeType,
        filename: `debate-${id}.${options.format}`,
        metadata: {
          debateId: id,
          exportedAt: this.getCurrentTimestamp(),
          format: options.format,
          options
        }
      };
      
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse('EXPORT_FAILED', `Failed to export debate: ${error}`);
    }
  }
  
  private formatAsMarkdown(debate: DebateDocument, options: ExportOptions): string {
    let md = `# ${debate.metadata.topic.title}\n\n`;
    md += `**Created:** ${debate.metadata.timestamps.created}\n`;
    md += `**Status:** ${debate.metadata.status}\n\n`;
    
    if (debate.metadata.topic.description) {
      md += `${debate.metadata.topic.description}\n\n`;
    }
    
    // Format as tree
    const renderNode = (nodeId: string, depth: number = 0): string => {
      const node = debate.nodes[nodeId];
      if (!node) return '';
      
      const indent = '  '.repeat(depth);
      const participant = debate.participants[node.participantId]?.name || node.participantId;
      
      let nodeText = `${indent}- **${participant}:** ${node.content.text}\n`;
      
      if (options.includeMetrics && node.metrics.selfScore) {
        nodeText += `${indent}  *Score: ${node.metrics.selfScore}*\n`;
      }
      
      // Add children
      for (const child of node.relationships.children) {
        nodeText += renderNode(child.targetNodeId, depth + 1);
      }
      
      return nodeText;
    };
    
    md += renderNode(debate.rootNodeId);
    
    return md;
  }
  
  private calculateAverageDepth(debate: DebateDocument): number {
    const depths = Object.values(debate.nodes).map(node => node.position.depth);
    return depths.reduce((sum, depth) => sum + depth, 0) / depths.length;
  }
  
  private calculateLongestThread(debate: DebateDocument): number {
    const threadLengths = new Map<string, number>();
    
    for (const node of Object.values(debate.nodes)) {
      const threadId = node.position.threadId;
      threadLengths.set(threadId, (threadLengths.get(threadId) || 0) + 1);
    }
    
    return Math.max(...Array.from(threadLengths.values()));
  }
}