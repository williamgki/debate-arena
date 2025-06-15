# Debate Arena Storage Format Specification

## Overview

The Debate Arena uses a sophisticated, scalable storage format designed for multi-threaded tree-type debates, linear formats, and comprehensive debate analysis. This document describes the complete storage architecture and data structures.

## Architecture Principles

### 1. Multi-Layer Design
- **Metadata Layer**: Searchable debate information
- **Participants Registry**: Centralized participant management
- **Node Graph**: Flexible debate tree structure
- **Annotations System**: Separate judgments, flags, and analysis
- **Analytics Layer**: Computed metrics and insights

### 2. Scalability Features
- **Flexible Relationships**: Multi-parent nodes, convergent arguments
- **Lazy Loading**: Load debate sections on demand
- **Version Control**: Track changes to nodes and structure
- **Export Formats**: Multiple export options for interoperability

### 3. Search & Query Capabilities
- **Full-text Search**: Content, topics, and annotations
- **Structural Search**: Relationship queries, depth filters
- **Faceted Search**: Status, participants, metrics
- **Graph Traversal**: Path analysis and relationship mapping

## Core Data Structures

### DebateDocument
The root container for a complete debate:

```typescript
interface DebateDocument {
  metadata: DebateMetadata;           // Core debate information
  participants: Record<UUID, ParticipantInfo>;  // Participant registry
  nodes: Record<UUID, DebateNode>;    // All debate nodes
  annotations: Record<UUID, Annotation>;        // Judgments and flags
  rootNodeId: UUID;                   // Entry point to debate tree
  threads?: Record<UUID, UUID[]>;     // Computed thread sequences
}
```

### DebateMetadata
Comprehensive debate information for indexing and search:

```typescript
interface DebateMetadata {
  id: UUID;
  version: string;                    // Schema version for migrations
  
  topic: {
    title: string;
    description?: string;
    tags: string[];
    category?: string;
  };
  
  timestamps: {
    created: ISO8601;
    lastModified: ISO8601;
    started?: ISO8601;
    completed?: ISO8601;
  };
  
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  format: 'tree' | 'linear' | 'structured' | 'freestyle';
  
  configuration: {
    maxDepth?: number;
    maxNodesPerParent?: number;
    allowObfuscation?: boolean;
    scoringMethod?: string;
    moderationLevel?: 'none' | 'light' | 'strict';
    allowPublicJudging?: boolean;
  };
  
  access: {
    level: 'public' | 'unlisted' | 'private' | 'restricted';
    permissions?: Record<UUID, string[]>;
    moderators?: UUID[];
  };
  
  analytics: {
    totalNodes: number;
    totalParticipants: number;
    totalJudgments: number;
    totalFlags: number;
    averageDepth: number;
    longestThread: number;
    participationDistribution?: Record<UUID, number>;
  };
}
```

### DebateNode
Individual arguments/statements in the debate:

```typescript
interface DebateNode {
  id: UUID;
  
  content: {
    text: string;
    attachments?: Array<{
      type: 'image' | 'document' | 'link' | 'code';
      url: string;
      metadata?: Record<string, any>;
    }>;
    formatting?: {
      markdown?: boolean;
      html?: boolean;
    };
  };
  
  participantId: UUID;
  
  timestamps: {
    created: ISO8601;
    lastModified?: ISO8601;
    finalized?: ISO8601;
  };
  
  relationships: {
    parents: NodeRelationship[];
    children: NodeRelationship[];
    siblings?: NodeRelationship[];
  };
  
  position: {
    depth: number;
    threadId: UUID;
    sequenceInThread: number;
    branchPoint?: UUID;
  };
  
  flags: NodeFlag[];
  metrics: NodeMetrics;
  version: number;
  
  editHistory?: Array<{
    timestamp: ISO8601;
    participantId: UUID;
    changes: Record<string, any>;
  }>;
}
```

### Relationship Types
Debates support rich relationship semantics:

```typescript
type RelationshipType = 
  | 'responds-to'    // Direct response to an argument
  | 'supports'       // Supporting evidence/argument  
  | 'refutes'        // Counter-argument
  | 'clarifies'      // Clarification or elaboration
  | 'questions'      // Poses a question about
  | 'summarizes'     // Summary of multiple arguments
  | 'judges'         // Judgment/evaluation of argument

interface NodeRelationship {
  targetNodeId: UUID;
  type: RelationshipType;
  strength?: number;  // 0-1, relationship strength
  metadata?: Record<string, any>;
}
```

### Flags and Quality Indicators
Comprehensive flagging system for argument analysis:

```typescript
type NodeFlag = 
  | 'obfuscated'        // Intentionally unclear
  | 'logical_flaw'      // Contains logical fallacy
  | 'ad_hominem'        // Personal attack
  | 'strawman'          // Misrepresents opponent
  | 'red_herring'       // Off-topic distraction
  | 'appeal_to_emotion' // Emotional manipulation
  | 'circular_reasoning' // Circular logic
  | 'false_dichotomy'   // False either/or choice
  | 'slippery_slope'    // Unwarranted chain of consequences
  | 'highlighted'       // Marked as important
  | 'archived'          // No longer active
  | 'disputed'          // Under dispute
  | 'verified'          // Fact-checked
  | 'ai_generated'      // Generated by AI
  | 'human_authored'    // Written by human
  | 'low_quality'       // Poor argument quality
  | 'high_quality'      // Exceptional argument
```

### Metrics and Scoring
Multi-dimensional argument assessment:

```typescript
interface NodeMetrics {
  selfScore?: number;        // 1-10 from author
  confidenceLevel?: number;  // 0-1 author's confidence
  complexityScore?: number;  // Computed text complexity
  readabilityScore?: number; // Flesch-Kincaid or similar
  wordCount?: number;
  averageJudgmentScore?: number; // Average of all judgments
  flagCount?: Record<NodeFlag, number>;
}
```

### Annotations System
Separate layer for judgments, analysis, and cross-references:

```typescript
interface Annotation {
  id: UUID;
  type: 'judgment' | 'flag' | 'score' | 'analysis' | 'cross_ref' | 'fact_check' | 'summary' | 'insight';
  
  targetNodeId: UUID;
  targetSpan?: {
    start: number;
    end: number;
  };
  
  content: {
    text?: string;
    score?: number;
    confidence?: number;
    evidence?: string[];
    metadata?: Record<string, any>;
  };
  
  annotatorId: UUID;
  timestamp: ISO8601;
  visibility: 'public' | 'private' | 'moderator_only';
}
```

## Storage Implementation

### File-Based Storage
Current implementation uses JSON files with indexing:

```
data/debates/
├── index.json          # Debate registry and metadata
├── debates/
│   ├── {uuid}.json    # Individual debate documents
│   └── ...
└── exports/           # Generated export files
    ├── json/
    ├── markdown/
    └── csv/
```

### Index Structure
Fast access to debate metadata:

```json
{
  "debates": {
    "debate-uuid-1": {
      "title": "AI Safety Debate",
      "created": "2024-01-01T00:00:00Z",
      "status": "active",
      "participants": 3,
      "nodes": 42
    }
  },
  "lastUpdated": "2024-01-01T12:00:00Z"
}
```

## Search and Query System

### Query Structure
Flexible search with multiple criteria:

```typescript
interface SearchQuery {
  // Text search
  text?: string;
  textFields?: ('content' | 'topic' | 'annotations')[];
  
  // Structural filters
  participantIds?: UUID[];
  nodeFlags?: NodeFlag[];
  relationshipTypes?: RelationshipType[];
  depthRange?: [number, number];
  
  // Temporal filters
  dateRange?: [ISO8601, ISO8601];
  
  // Metric filters
  scoreRange?: [number, number];
  
  // Metadata filters
  tags?: string[];
  categories?: string[];
  status?: DebateStatus[];
  format?: DebateFormat[];
  
  // Pagination and sorting
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'modified' | 'relevance' | 'score';
  sortOrder?: 'asc' | 'desc';
}
```

### Query Examples

**Find debates about AI safety:**
```
GET /api/debates?q=AI%20safety&tags=ai&status=active
```

**Find obfuscated arguments with low scores:**
```
GET /api/debates?nodeFlags=obfuscated&scoreRange=1,4
```

**Find deep argument chains:**
```
GET /api/debates?depthRange=5,10&sortBy=created
```

## Export Formats

### Supported Formats
- **JSON**: Complete format preservation
- **JSON-LD**: Semantic web compatibility  
- **Markdown**: Human-readable documents
- **CSV**: Tabular analysis (flattened)
- **GraphML**: Network analysis tools
- **AIF**: Argument Interchange Format (academic standard)
- **HTML**: Web-ready documents
- **PDF**: Print-ready documents

### Export Options
```typescript
interface ExportOptions {
  format: ExportFormat;
  includeAnnotations?: boolean;
  includeMetrics?: boolean;
  includeEditHistory?: boolean;
  flattenStructure?: boolean;    // For linear formats
  anonymizeParticipants?: boolean;
  customTemplate?: string;
}
```

### Markdown Export Example
```markdown
# AI Safety Debate

**Created:** January 1, 2024
**Status:** active

AI systems will be aligned by default.

- **Debater A:** I argue that AI alignment will naturally emerge from...
  - **Debater B:** This assumption is flawed because...
    - **Judge:** The counterargument raises valid concerns about...
- **Debater A:** Additionally, market incentives will drive...
  - **Debater B:** Market forces alone are insufficient...
```

## API Endpoints

### Core Operations
- `GET /api/debates` - Search and list debates
- `POST /api/debates` - Create new debate
- `GET /api/debates/{id}` - Get specific debate
- `PUT /api/debates/{id}` - Update debate
- `DELETE /api/debates/{id}` - Delete debate

### Node Operations  
- `POST /api/debates/{id}/nodes` - Add node
- `PUT /api/debates/{id}/nodes/{nodeId}` - Update node
- `DELETE /api/debates/{id}/nodes/{nodeId}` - Delete node

### Export Operations
- `GET /api/debates/{id}/export?format=json` - Export debate
- `POST /api/debates/{id}/export` - Export with advanced options

## Version History and Migration

### Schema Versioning
Each debate document includes a version field for schema migrations:

```typescript
interface DebateDocument {
  metadata: {
    version: "1.0";  // Current schema version
    // ...
  };
  // ...
}
```

### Migration Support
- Automatic schema detection
- Backward compatibility preservation  
- Progressive enhancement of existing debates
- Migration validation and rollback

## Performance Considerations

### Optimization Strategies
- **Lazy Loading**: Load node subtrees on demand
- **Caching**: Pre-computed views and analytics
- **Indexing**: Fast text and metadata search
- **Compression**: Efficient storage of large debates
- **Sharding**: Distribute across multiple storage backends

### Scalability Limits
- **Nodes per debate**: Recommended < 10,000
- **Depth per thread**: Recommended < 50
- **Concurrent users**: File storage supports ~100 concurrent
- **Database backend**: Required for >1,000 concurrent users

## Security and Privacy

### Access Control
- Public, unlisted, private, and restricted debates
- Participant-level permissions
- Moderator roles and capabilities
- Anonymous participation options

### Data Protection
- Optional participant anonymization
- Debate archival and deletion
- GDPR compliance support
- Audit trail maintenance

---

This format provides a robust foundation for storing, analyzing, and sharing complex debate structures while maintaining flexibility for future enhancements and integrations.