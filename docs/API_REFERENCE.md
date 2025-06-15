# Debate Arena API Reference

## Overview

The Debate Arena API provides comprehensive access to debate storage, search, and export functionality. All endpoints return JSON responses with a consistent structure.

## Base URL

```
https://your-domain.com/api
```

## Response Format

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## Authentication

Currently, the API uses simple access controls. Future versions will support:
- API key authentication
- OAuth 2.0 integration
- Role-based access control

## Endpoints

### Debates

#### List/Search Debates
```http
GET /api/debates
```

**Query Parameters:**
- `q` (string): Text search query
- `status` (string): Filter by status (`draft`, `active`, `completed`, `archived`)
- `tags` (string[]): Filter by tags
- `startDate` (ISO8601): Created after date
- `endDate` (ISO8601): Created before date
- `limit` (number): Results per page (default: 10, max: 100)
- `offset` (number): Results offset (default: 0)
- `sortBy` (string): Sort field (`created`, `modified`, `relevance`)
- `sortOrder` (string): Sort direction (`asc`, `desc`)

**Example Request:**
```http
GET /api/debates?q=AI%20safety&status=active&limit=20&sortBy=created&sortOrder=desc
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "debates": [
      {
        "metadata": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "topic": {
            "title": "AI Safety and Alignment",
            "description": "Debate on AI safety measures",
            "tags": ["ai", "safety", "alignment"],
            "category": "technology"
          },
          "timestamps": {
            "created": "2024-01-15T10:30:00Z",
            "lastModified": "2024-01-15T15:45:00Z"
          },
          "status": "active",
          "analytics": {
            "totalNodes": 25,
            "totalParticipants": 3,
            "totalJudgments": 8
          }
        }
      }
    ],
    "totalCount": 1
  }
}
```

#### Create Debate
```http
POST /api/debates
```

**Request Body:**
```typescript
interface CreateDebateRequest {
  topic: {
    title: string;
    description?: string;
    tags: string[];
    category?: string;
  };
  format: 'tree' | 'linear' | 'structured' | 'freestyle';
  configuration: {
    allowObfuscation?: boolean;
    scoringMethod?: string;
    moderationLevel?: 'none' | 'light' | 'strict';
    allowPublicJudging?: boolean;
  };
  access: {
    level: 'public' | 'unlisted' | 'private' | 'restricted';
  };
  initialTopic: string;
  participants: ParticipantInfo[];
}
```

**Example Request:**
```json
{
  "topic": {
    "title": "Climate Change Mitigation Strategies",
    "description": "Comparing renewable energy vs nuclear power",
    "tags": ["climate", "energy", "policy"],
    "category": "environment"
  },
  "format": "tree",
  "configuration": {
    "allowObfuscation": false,
    "scoringMethod": "self-assessment",
    "moderationLevel": "light",
    "allowPublicJudging": true
  },
  "access": {
    "level": "public"
  },
  "initialTopic": "Renewable energy is superior to nuclear power for climate change mitigation.",
  "participants": [
    {
      "id": "debaterA",
      "role": "debaterA",
      "type": "human",
      "name": "Alice Smith"
    },
    {
      "id": "debaterB", 
      "role": "debaterB",
      "type": "ai",
      "name": "GPT-4",
      "model": "gpt-4"
    }
  ]
}
```

**Response:** Returns the created `DebateDocument` with HTTP 201.

#### Get Debate
```http
GET /api/debates/{id}
```

**Path Parameters:**
- `id` (UUID): Debate identifier

**Response:** Returns complete `DebateDocument` or 404 if not found.

#### Update Debate
```http
PUT /api/debates/{id}
```

**Request Body:** Partial `DebateDocument` with fields to update.

**Response:** Returns updated `DebateDocument`.

#### Delete Debate
```http
DELETE /api/debates/{id}
```

**Response:** Returns success confirmation or 404 if not found.

### Nodes

#### Add Node
```http
POST /api/debates/{id}/nodes
```

**Request Body:**
```typescript
interface AddNodeRequest {
  content: {
    text: string;
    attachments?: Array<{
      type: 'image' | 'document' | 'link' | 'code';
      url: string;
      metadata?: Record<string, any>;
    }>;
  };
  participantId: string;
  parentNodeIds?: string[];  // For multi-parent nodes
  flags?: NodeFlag[];
  metrics?: NodeMetrics;
}
```

**Example Request:**
```json
{
  "content": {
    "text": "Nuclear power provides consistent baseload energy that renewables cannot match, especially during periods of low wind and solar generation."
  },
  "participantId": "debaterB",
  "parentNodeIds": ["550e8400-e29b-41d4-a716-446655440001"],
  "flags": [],
  "metrics": {
    "selfScore": 8,
    "confidenceLevel": 0.9
  }
}
```

**Response:** Returns updated `DebateDocument` with new node.

#### Update Node
```http
PUT /api/debates/{id}/nodes/{nodeId}
```

**Request Body:** Partial node data to update.

**Response:** Returns updated `DebateDocument`.

#### Delete Node
```http
DELETE /api/debates/{id}/nodes/{nodeId}
```

**Response:** Returns updated `DebateDocument` with node removed.

### Annotations

#### Add Annotation
```http
POST /api/debates/{id}/annotations
```

**Request Body:**
```typescript
interface AddAnnotationRequest {
  type: 'judgment' | 'flag' | 'score' | 'analysis' | 'cross_ref' | 'fact_check';
  targetNodeId: string;
  targetSpan?: {
    start: number;
    end: number;
  };
  content: {
    text?: string;
    score?: number;
    confidence?: number;
    evidence?: string[];
  };
  annotatorId: string;
  visibility: 'public' | 'private' | 'moderator_only';
}
```

**Example Request:**
```json
{
  "type": "judgment",
  "targetNodeId": "550e8400-e29b-41d4-a716-446655440002",
  "content": {
    "text": "Strong argument with solid evidence, but lacks consideration of grid storage solutions.",
    "score": 7,
    "confidence": 0.8
  },
  "annotatorId": "judge-ai",
  "visibility": "public"
}
```

### Export

#### Export Debate
```http
GET /api/debates/{id}/export
```

**Query Parameters:**
- `format` (string): Export format (`json`, `markdown`, `csv`, `graphml`, `aif`, `html`, `pdf`)
- `includeAnnotations` (boolean): Include judgments and flags
- `includeMetrics` (boolean): Include scoring and analytics
- `includeEditHistory` (boolean): Include version history
- `flattenStructure` (boolean): Convert tree to linear format
- `anonymizeParticipants` (boolean): Remove participant identities

**Example Request:**
```http
GET /api/debates/550e8400-e29b-41d4-a716-446655440000/export?format=markdown&includeAnnotations=true
```

**Response:** Returns file download with appropriate MIME type and filename.

#### Advanced Export
```http
POST /api/debates/{id}/export
```

**Request Body:** `ExportOptions` object for complex export configurations.

**Response:** Returns exported file with custom formatting.

### Analytics

#### Get Debate Statistics
```http
GET /api/debates/{id}/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalNodes": 42,
    "totalParticipants": 5,
    "totalJudgments": 15,
    "totalFlags": 3,
    "averageDepth": 3.2,
    "longestThread": 8,
    "participationDistribution": {
      "debaterA": 18,
      "debaterB": 16,
      "judge-ai": 8
    },
    "flagDistribution": {
      "obfuscated": 2,
      "logical_flaw": 1
    },
    "scoreDistribution": {
      "1-3": 2,
      "4-6": 8,
      "7-8": 15,
      "9-10": 6
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data |
| `NOT_FOUND` | Resource not found |
| `INTERNAL_ERROR` | Server error |
| `CREATE_FAILED` | Failed to create resource |
| `UPDATE_FAILED` | Failed to update resource |
| `DELETE_FAILED` | Failed to delete resource |
| `EXPORT_FAILED` | Failed to export debate |
| `SEARCH_FAILED` | Search operation failed |
| `UNSUPPORTED_FORMAT` | Export format not supported |

## Rate Limiting

Current implementation has no rate limiting. Production deployments should implement:

- **Search/List**: 100 requests per minute
- **Create/Update**: 20 requests per minute  
- **Export**: 5 requests per minute
- **Bulk operations**: 1 request per minute

## Webhooks

Future webhook support for:
- Debate created/updated/completed
- New nodes added
- Judgments submitted
- Export completed

## SDKs and Libraries

### JavaScript/TypeScript
```typescript
import { DebateAPI } from '@debate-arena/client';

const api = new DebateAPI({ baseUrl: 'https://api.debate-arena.com' });

// Search debates
const debates = await api.searchDebates({ 
  text: 'climate change',
  status: ['active']
});

// Create debate
const newDebate = await api.createDebate({
  topic: { title: 'AI Ethics', tags: ['ai', 'ethics'] },
  format: 'tree',
  // ...
});
```

### Python
```python
from debate_arena import DebateAPI

api = DebateAPI(base_url='https://api.debate-arena.com')

# Search debates  
debates = api.search_debates(
    text='climate change',
    status=['active']
)

# Export debate
export_data = api.export_debate(
    debate_id='550e8400-e29b-41d4-a716-446655440000',
    format='markdown'
)
```

## Integration Examples

### Real-time Updates
```javascript
// WebSocket connection for live debate updates
const ws = new WebSocket('wss://api.debate-arena.com/debates/550e8400/live');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  if (update.type === 'node_added') {
    // Handle new argument
    renderNewNode(update.node);
  }
};
```

### Embedding
```html
<!-- Embed debate viewer -->
<iframe 
  src="https://debate-arena.com/embed/550e8400-e29b-41d4-a716-446655440000"
  width="800" 
  height="600"
  frameborder="0">
</iframe>
```

### Analytics Integration
```javascript
// Google Analytics tracking
gtag('event', 'debate_created', {
  'debate_id': newDebate.metadata.id,
  'topic': newDebate.metadata.topic.title,
  'format': newDebate.metadata.format
});
```

## Migration and Versioning

### API Versioning
All endpoints support version headers:
```http
Accept: application/vnd.debate-arena.v1+json
```

### Data Migration
```http
POST /api/migrate
Content-Type: application/json

{
  "source_format": "legacy_v1",
  "target_format": "standard_v2",
  "debate_ids": ["uuid1", "uuid2"]
}
```

## Development and Testing

### Local Development
```bash
# Start development server
npm run dev

# API available at http://localhost:3000/api
```

### Testing
```bash
# Run API tests
npm run test:api

# Generate test data
npm run test:seed
```

### Mock Data
Development server includes mock debates for testing:
- Sample AI vs Human debates
- Multi-participant discussions  
- Various argument structures
- Different export formats

---

For more information, see the [Format Specification](./DEBATE_FORMAT.md) and [Integration Guide](./INTEGRATION.md).