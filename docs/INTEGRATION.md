# Integration Guide

## Overview

This guide covers how to integrate the Debate Arena storage system into existing applications, extend functionality, and build upon the debate format for custom use cases.

## Integration Patterns

### 1. Embedded Debate Viewer

Embed read-only debate viewers in websites or applications:

```html
<!-- Simple iframe embed -->
<iframe 
  src="https://debate-arena.com/embed/debate-id-here"
  width="800" 
  height="600"
  frameborder="0">
</iframe>

<!-- With customization parameters -->
<iframe 
  src="https://debate-arena.com/embed/debate-id-here?view=tree&theme=dark&controls=false"
  width="100%" 
  height="500"
  frameborder="0">
</iframe>
```

**Embed Parameters:**
- `view`: `tree`, `linear`, `timeline`
- `theme`: `light`, `dark`, `auto`
- `controls`: `true`, `false` (show/hide interaction buttons)
- `startNode`: Node ID to focus on initially
- `maxDepth`: Limit visible depth

### 2. API Integration

Use the REST API to integrate debate functionality:

```javascript
// React integration example
import { useState, useEffect } from 'react';

function DebateList({ category }) {
  const [debates, setDebates] = useState([]);
  
  useEffect(() => {
    fetch(`/api/debates?category=${category}&status=active`)
      .then(res => res.json())
      .then(data => setDebates(data.data.debates));
  }, [category]);
  
  return (
    <div>
      {debates.map(debate => (
        <DebateCard key={debate.metadata.id} debate={debate} />
      ))}
    </div>
  );
}
```

### 3. Storage Backend Integration

Replace or extend storage backends:

```typescript
// Custom database storage implementation
import { BaseStorage } from '@debate-arena/storage';
import { DebateDocument, CreateDebateRequest } from '@debate-arena/types';

export class PostgreSQLStorage extends BaseStorage {
  private db: Database;
  
  constructor(connectionString: string) {
    super();
    this.db = new Database(connectionString);
  }
  
  async createDebate(request: CreateDebateRequest): Promise<ApiResponse<DebateDocument>> {
    const debate = this.buildDebateDocument(request);
    
    await this.db.query(
      'INSERT INTO debates (id, data) VALUES ($1, $2)',
      [debate.metadata.id, JSON.stringify(debate)]
    );
    
    return this.createSuccessResponse(debate);
  }
  
  // Implement other required methods...
}
```

### 4. Custom Export Formats

Add new export formats:

```typescript
// Custom export format implementation
export class PDFExporter {
  async export(debate: DebateDocument, options: ExportOptions): Promise<ExportResult> {
    const pdf = new PDFDocument();
    
    // Add title
    pdf.fontSize(20)
       .text(debate.metadata.topic.title, 100, 100);
    
    // Render debate tree
    this.renderNode(pdf, debate.rootNodeId, debate, 100, 150);
    
    const buffer = pdf.pipe();
    
    return {
      data: buffer,
      mimeType: 'application/pdf',
      filename: `debate-${debate.metadata.id}.pdf`,
      metadata: {
        debateId: debate.metadata.id,
        exportedAt: new Date().toISOString(),
        format: 'pdf',
        options
      }
    };
  }
  
  private renderNode(pdf: PDFDocument, nodeId: string, debate: DebateDocument, x: number, y: number) {
    const node = debate.nodes[nodeId];
    const participant = debate.participants[node.participantId];
    
    pdf.fontSize(12)
       .text(`${participant.name}: ${node.content.text}`, x, y, { width: 400 });
    
    // Render children recursively
    let childY = y + 50;
    for (const child of node.relationships.children) {
      this.renderNode(pdf, child.targetNodeId, debate, x + 20, childY);
      childY += 100;
    }
  }
}
```

## Common Integration Scenarios

### 1. Educational Platforms

Integrate debates into learning management systems:

```typescript
// LMS integration example
class LMSDebateIntegration {
  constructor(private lmsAPI: LMSApi, private debateAPI: DebateAPI) {}
  
  async createCourseDebate(courseId: string, topic: string, students: Student[]) {
    // Create debate with course participants
    const participants = students.map(student => ({
      id: student.id,
      role: 'debater',
      type: 'human',
      name: student.name
    }));
    
    const debate = await this.debateAPI.createDebate({
      topic: { title: topic, tags: ['education', courseId] },
      format: 'tree',
      configuration: { moderationLevel: 'strict' },
      access: { level: 'restricted' },
      initialTopic: topic,
      participants
    });
    
    // Link to course
    await this.lmsAPI.addActivity(courseId, {
      type: 'debate',
      id: debate.metadata.id,
      title: topic,
      url: `/debate/session?debateId=${debate.metadata.id}`
    });
    
    return debate;
  }
  
  async getStudentProgress(studentId: string, debateId: string) {
    const debate = await this.debateAPI.getDebate(debateId);
    const studentNodes = Object.values(debate.nodes)
      .filter(node => node.participantId === studentId);
    
    return {
      argumentsPosted: studentNodes.length,
      averageScore: this.calculateAverageScore(studentNodes),
      participation: this.calculateParticipation(studentNodes, debate),
      qualityFlags: this.getQualityFlags(studentNodes)
    };
  }
}
```

### 2. Research Platforms

Integrate for academic research:

```typescript
class ResearchPlatformIntegration {
  async analyzeArgumentPatterns(debateIds: string[]) {
    const debates = await Promise.all(
      debateIds.map(id => this.debateAPI.getDebate(id))
    );
    
    return {
      logicalFallacies: this.countFallacies(debates),
      argumentDepths: this.analyzeDepths(debates),
      participationPatterns: this.analyzeParticipation(debates),
      persuasionTechniques: this.identifyTechniques(debates),
      consensusEmergence: this.trackConsensus(debates)
    };
  }
  
  async exportForAnalysis(debateIds: string[], format: 'csv' | 'json' | 'spss') {
    const debates = await Promise.all(
      debateIds.map(id => this.debateAPI.getDebate(id))
    );
    
    switch (format) {
      case 'csv':
        return this.generateCSVDataset(debates);
      case 'spss':
        return this.generateSPSSDataset(debates);
      default:
        return this.generateJSONDataset(debates);
    }
  }
}
```

### 3. Content Management Systems

Add debate functionality to CMS:

```typescript
// WordPress plugin example
class WordPressDebatePlugin {
  async addDebateShortcode() {
    // Register WordPress shortcode
    wp.hooks.addFilter('register_shortcodes', 'debate-arena', (shortcodes) => {
      shortcodes.debate = this.renderDebateShortcode.bind(this);
      return shortcodes;
    });
  }
  
  renderDebateShortcode(attributes: any) {
    const { id, view = 'tree', height = '600px' } = attributes;
    
    return `
      <div class="debate-embed" style="height: ${height}">
        <iframe 
          src="/api/debates/${id}/embed?view=${view}"
          width="100%" 
          height="100%"
          frameborder="0">
        </iframe>
      </div>
    `;
  }
  
  async createDebateFromPost(postId: number, title: string, content: string) {
    const debate = await this.debateAPI.createDebate({
      topic: { title, description: content, tags: ['wordpress', `post-${postId}`] },
      format: 'tree',
      configuration: { allowPublicJudging: true },
      access: { level: 'public' },
      initialTopic: title,
      participants: []
    });
    
    // Save debate ID as post meta
    await wp.db.postMeta.set(postId, 'debate_id', debate.metadata.id);
    
    return debate;
  }
}
```

## Custom Visualization Components

### React Components

```tsx
// Custom debate tree component
import React from 'react';
import { DebateDocument, DebateNode } from '@debate-arena/types';

interface CustomDebateTreeProps {
  debate: DebateDocument;
  onNodeClick?: (node: DebateNode) => void;
  highlightFlags?: string[];
}

export const CustomDebateTree: React.FC<CustomDebateTreeProps> = ({
  debate,
  onNodeClick,
  highlightFlags = []
}) => {
  const renderNode = (nodeId: string, depth: number = 0) => {
    const node = debate.nodes[nodeId];
    const participant = debate.participants[node.participantId];
    
    const hasHighlightedFlags = node.flags.some(flag => 
      highlightFlags.includes(flag)
    );
    
    return (
      <div 
        key={nodeId}
        className={`node depth-${depth} ${hasHighlightedFlags ? 'highlighted' : ''}`}
        onClick={() => onNodeClick?.(node)}
      >
        <div className="node-header">
          <span className="participant">{participant.name}</span>
          <span className="timestamp">
            {new Date(node.timestamps.created).toLocaleString()}
          </span>
        </div>
        <div className="node-content">{node.content.text}</div>
        <div className="node-children">
          {node.relationships.children.map(child => 
            renderNode(child.targetNodeId, depth + 1)
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="custom-debate-tree">
      {renderNode(debate.rootNodeId)}
    </div>
  );
};
```

### Vue.js Components

```vue
<!-- CustomDebateList.vue -->
<template>
  <div class="debate-list">
    <div class="filters">
      <input 
        v-model="searchQuery" 
        placeholder="Search debates..."
        @input="handleSearch"
      />
      <select v-model="statusFilter" @change="handleFilter">
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>
    </div>
    
    <div class="results">
      <div 
        v-for="debate in filteredDebates" 
        :key="debate.metadata.id"
        class="debate-card"
        @click="openDebate(debate)"
      >
        <h3>{{ debate.metadata.topic.title }}</h3>
        <p>{{ debate.metadata.topic.description }}</p>
        <div class="meta">
          <span>{{ debate.metadata.analytics.totalNodes }} arguments</span>
          <span>{{ debate.metadata.analytics.totalParticipants }} participants</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { DebateDocument } from '@debate-arena/types';

export default defineComponent({
  name: 'CustomDebateList',
  setup() {
    const debates = ref<DebateDocument[]>([]);
    const searchQuery = ref('');
    const statusFilter = ref('');
    
    const filteredDebates = computed(() => {
      return debates.value.filter(debate => {
        const matchesSearch = !searchQuery.value || 
          debate.metadata.topic.title.toLowerCase().includes(searchQuery.value.toLowerCase());
        const matchesStatus = !statusFilter.value || 
          debate.metadata.status === statusFilter.value;
        return matchesSearch && matchesStatus;
      });
    });
    
    const loadDebates = async () => {
      const response = await fetch('/api/debates');
      const data = await response.json();
      debates.value = data.data.debates;
    };
    
    const handleSearch = () => {
      // Debounce search logic here
    };
    
    const handleFilter = () => {
      // Additional filter logic here
    };
    
    const openDebate = (debate: DebateDocument) => {
      window.location.href = `/debate/session?debateId=${debate.metadata.id}`;
    };
    
    onMounted(loadDebates);
    
    return {
      debates,
      searchQuery,
      statusFilter,
      filteredDebates,
      handleSearch,
      handleFilter,
      openDebate
    };
  }
});
</script>
```

## Analytics and Reporting

### Custom Analytics Implementation

```typescript
class DebateAnalytics {
  constructor(private debateAPI: DebateAPI) {}
  
  async generateReport(debateIds: string[], reportType: 'summary' | 'detailed' | 'comparative') {
    const debates = await Promise.all(
      debateIds.map(id => this.debateAPI.getDebate(id))
    );
    
    switch (reportType) {
      case 'summary':
        return this.generateSummaryReport(debates);
      case 'detailed':
        return this.generateDetailedReport(debates);
      case 'comparative':
        return this.generateComparativeReport(debates);
    }
  }
  
  private generateSummaryReport(debates: DebateDocument[]) {
    return {
      totalDebates: debates.length,
      totalArguments: debates.reduce((sum, d) => sum + d.metadata.analytics.totalNodes, 0),
      averageDepth: this.calculateAverageDepth(debates),
      participationDistribution: this.analyzeParticipation(debates),
      topFlags: this.getTopFlags(debates),
      qualityMetrics: this.calculateQualityMetrics(debates)
    };
  }
  
  private calculateQualityMetrics(debates: DebateDocument[]) {
    const allNodes = debates.flatMap(d => Object.values(d.nodes));
    
    return {
      averageScore: this.calculateAverageScore(allNodes),
      flaggedPercentage: this.calculateFlaggedPercentage(allNodes),
      logicalFallacyRate: this.calculateFallacyRate(allNodes),
      obfuscationRate: this.calculateObfuscationRate(allNodes)
    };
  }
}
```

### Real-Time Analytics Dashboard

```typescript
// WebSocket-based real-time analytics
class RealTimeDebateAnalytics {
  private ws: WebSocket;
  private callbacks: Map<string, Function[]> = new Map();
  
  constructor(debateId: string) {
    this.ws = new WebSocket(`wss://api.debate-arena.com/debates/${debateId}/analytics`);
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const callbacks = this.callbacks.get(data.type) || [];
      callbacks.forEach(callback => callback(data));
    };
  }
  
  onNodeAdded(callback: (data: any) => void) {
    this.addCallback('node_added', callback);
  }
  
  onScoreUpdated(callback: (data: any) => void) {
    this.addCallback('score_updated', callback);
  }
  
  onFlagAdded(callback: (data: any) => void) {
    this.addCallback('flag_added', callback);
  }
  
  private addCallback(event: string, callback: Function) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }
}

// Usage in React dashboard
const DebateDashboard: React.FC<{ debateId: string }> = ({ debateId }) => {
  const [metrics, setMetrics] = useState({
    nodeCount: 0,
    averageScore: 0,
    flagCount: 0
  });
  
  useEffect(() => {
    const analytics = new RealTimeDebateAnalytics(debateId);
    
    analytics.onNodeAdded((data) => {
      setMetrics(prev => ({
        ...prev,
        nodeCount: prev.nodeCount + 1
      }));
    });
    
    analytics.onScoreUpdated((data) => {
      setMetrics(prev => ({
        ...prev,
        averageScore: data.newAverage
      }));
    });
    
    analytics.onFlagAdded((data) => {
      setMetrics(prev => ({
        ...prev,
        flagCount: prev.flagCount + 1
      }));
    });
    
    return () => analytics.disconnect();
  }, [debateId]);
  
  return (
    <div className="debate-dashboard">
      <div className="metric">
        <span className="label">Arguments:</span>
        <span className="value">{metrics.nodeCount}</span>
      </div>
      <div className="metric">
        <span className="label">Avg Score:</span>
        <span className="value">{metrics.averageScore.toFixed(1)}</span>
      </div>
      <div className="metric">
        <span className="label">Flags:</span>
        <span className="value">{metrics.flagCount}</span>
      </div>
    </div>
  );
};
```

## Testing Integration

### Integration Test Examples

```typescript
// Jest integration tests
describe('Debate API Integration', () => {
  let debateAPI: DebateAPI;
  let testDebateId: string;
  
  beforeEach(async () => {
    debateAPI = new DebateAPI({ baseUrl: 'http://localhost:3000/api' });
    
    // Create test debate
    const debate = await debateAPI.createDebate({
      topic: { title: 'Test Debate', tags: ['test'] },
      format: 'tree',
      configuration: {},
      access: { level: 'public' },
      initialTopic: 'Test topic',
      participants: []
    });
    
    testDebateId = debate.metadata.id;
  });
  
  afterEach(async () => {
    // Clean up
    await debateAPI.deleteDebate(testDebateId);
  });
  
  test('should add node to debate', async () => {
    const result = await debateAPI.addNode({
      debateId: testDebateId,
      content: { text: 'Test argument' },
      participantId: 'test-user',
      parentNodeIds: [/* root node ID */]
    });
    
    expect(result.success).toBe(true);
    expect(result.data.nodes).toHaveProperty('test-argument-id');
  });
  
  test('should export debate in multiple formats', async () => {
    const formats = ['json', 'markdown', 'csv'];
    
    for (const format of formats) {
      const exported = await debateAPI.exportDebate(testDebateId, format);
      expect(exported).toBeTruthy();
      expect(exported.type).toContain(format);
    }
  });
});
```

## Deployment Considerations

### Production Configuration

```yaml
# docker-compose.yml for production
version: '3.8'
services:
  debate-arena:
    image: debate-arena:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ./data:/app/data
    
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: debate_arena
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  redis:
    image: redis:7
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Performance Optimization

```typescript
// Caching implementation
class CachedDebateAPI {
  constructor(
    private baseAPI: DebateAPI,
    private cache: Cache = new Redis()
  ) {}
  
  async getDebate(id: string): Promise<DebateDocument | null> {
    // Check cache first
    const cached = await this.cache.get(`debate:${id}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fetch from API
    const debate = await this.baseAPI.getDebate(id);
    if (debate) {
      // Cache for 1 hour
      await this.cache.setex(`debate:${id}`, 3600, JSON.stringify(debate));
    }
    
    return debate;
  }
  
  async searchDebates(query: any): Promise<DebateDocument[]> {
    const cacheKey = `search:${JSON.stringify(query)}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const results = await this.baseAPI.searchDebates(query);
    
    // Cache search results for 10 minutes
    await this.cache.setex(cacheKey, 600, JSON.stringify(results));
    
    return results;
  }
}
```

---

This integration guide provides comprehensive examples for extending and integrating the Debate Arena system into various platforms and use cases.