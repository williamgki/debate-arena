# 🧠 Debate Arena

A sophisticated platform for conducting, analyzing, and storing AI-powered debates with human participation. Features tree-structured arguments, real-time interaction, comprehensive search, and multi-format export capabilities.

## ✨ Features

### 🎯 Core Functionality
- **Multi-Modal Debates**: Human vs AI, AI vs AI, or mixed participant debates
- **Tree Structure**: Branch arguments into complex discussion trees
- **Real-Time Interaction**: Live streaming responses and dynamic updates
- **Advanced AI Integration**: Support for GPT-3.5, GPT-4, O3, and O4-mini models
- **Intelligent Judging**: AI-powered argument evaluation and scoring

### 🔍 Analysis & Quality Control
- **Argument Flagging**: Identify logical fallacies, obfuscation, and quality issues
- **Scoring System**: Multi-dimensional argument assessment
- **Obfuscation Detection**: Test argument clarity vs persuasion
- **Fact-Checking**: Verify claims and evidence
- **Cross-Referencing**: Link related arguments across debates

### 📊 Storage & Search
- **Scalable Storage**: Hierarchical JSON-based storage with indexing
- **Advanced Search**: Full-text, structural, and faceted search capabilities
- **Multiple Formats**: Tree, linear, timeline, and graph visualizations
- **Export Options**: JSON, Markdown, CSV, GraphML, AIF, HTML, PDF
- **Version Control**: Track argument evolution and editing history

### 🚀 Technical Features
- **Next.js 15**: Modern React framework with App Router
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS**: Responsive, modern UI design
- **Real-Time Streaming**: Server-sent events for live updates
- **API-First Design**: RESTful API with comprehensive endpoints
- **File-Based Storage**: Lightweight storage with database scalability path

## 🏗️ Architecture

### Data Model
```
DebateDocument
├── Metadata (searchable information)
├── Participants (registry with roles and capabilities)
├── Nodes (argument tree with relationships)
├── Annotations (judgments, flags, analysis)
└── Analytics (computed metrics and insights)
```

### Node Relationships
- **responds-to**: Direct argument responses
- **supports**: Supporting evidence
- **refutes**: Counter-arguments
- **clarifies**: Elaborations and explanations
- **questions**: Inquiry-based interactions
- **summarizes**: Multi-argument summaries
- **judges**: Evaluative assessments

### Storage Backends
- **File Storage**: JSON files with indexing (current)
- **Database Storage**: PostgreSQL/MongoDB (planned)
- **Graph Database**: Neo4j for complex queries (planned)
- **Search Engine**: Elasticsearch integration (planned)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/debate-arena.git
   cd debate-arena
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your OpenAI API key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

### Environment Variables
```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional
DEBATE_STORAGE_PATH=./data/debates  # Storage location
NODE_ENV=development                # Environment mode
```

## 📖 Usage

### Creating a Debate

1. **Navigate to Setup**
   - Visit `/setup` or click "Create Your Own Debate"
   - Configure participants (Human/AI combinations)
   - Set the debate topic and parameters

2. **Choose Participants**
   - **Debater A**: Human or AI with model selection
   - **Debater B**: Human or AI with model selection  
   - **Judge**: AI model for argument evaluation

3. **Configure Options**
   - Enable/disable obfuscation mode
   - Set scoring methods
   - Choose moderation levels

### During a Debate

1. **Manual Participation**
   - Add arguments using the text input
   - Respond to specific nodes in the tree
   - Flag arguments for quality issues

2. **AI Responses**
   - Click "Add AI Response" buttons
   - Watch real-time streaming responses
   - View self-assessed scores

3. **Judging**
   - Use "Judge" buttons for AI evaluation
   - Get structured argument assessments
   - Track quality metrics

4. **Navigation**
   - View arguments in tree structure
   - Collapse/expand branches
   - Track conversation threads

### Saving and Sharing

1. **Auto-Save**: Debates save automatically after changes
2. **Manual Save**: Use the save button for immediate persistence
3. **Export**: Download debates in multiple formats
4. **Browse**: Access saved debates via the archive
5. **Search**: Find debates by content, participants, or metadata

## 🔧 Configuration

### AI Models
Configure available models in `/src/app/debate/session/DebateSessionClient.tsx`:

```typescript
const modelOptions = [
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  { label: 'GPT-4.1', value: 'gpt-4.1-2025-04-14' },
  { label: 'O3', value: 'o3-2025-04-16' },
  { label: 'O4 Mini', value: 'o4-mini-2025-04-16' },
];
```

### Storage Backend
Switch storage implementations in `/src/lib/storage/storage-manager.ts`:

```typescript
// File storage (default)
this.backend = new FileStorage('./data/debates');

// Database storage (future)
// this.backend = new DatabaseStorage(connectionString);
```

### Debate Settings
Default configurations in `/src/types/debate.ts`:

```typescript
configuration: {
  maxDepth?: number;              // Maximum argument depth
  maxNodesPerParent?: number;     // Branching limits
  allowObfuscation?: boolean;     // Enable obfuscation mode
  scoringMethod?: string;         // Scoring algorithm
  moderationLevel?: string;       // Content moderation
  allowPublicJudging?: boolean;   // Public judgment access
}
```

## 📁 Project Structure

```
debate-arena/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API endpoints
│   │   ├── debate/            # Debate interfaces
│   │   ├── debates/           # Debate archive
│   │   └── setup/             # Debate configuration
│   ├── lib/                   # Utilities and services
│   │   ├── storage/           # Storage backends
│   │   └── utils/             # Helper functions
│   └── types/                 # TypeScript definitions
├── docs/                      # Documentation
├── data/                      # File storage (auto-created)
└── public/                    # Static assets
```

### Key Files
- `/src/types/debate.ts` - Core data structures
- `/src/lib/storage/` - Storage implementation
- `/src/app/api/` - API endpoints
- `/src/app/debate/session/` - Main debate interface
- `/docs/DEBATE_FORMAT.md` - Storage format specification

## 🔌 API Reference

### Core Endpoints
```http
GET    /api/debates              # List/search debates
POST   /api/debates              # Create new debate
GET    /api/debates/{id}         # Get specific debate
PUT    /api/debates/{id}         # Update debate
DELETE /api/debates/{id}         # Delete debate

POST   /api/debates/{id}/nodes   # Add argument node
PUT    /api/debates/{id}/nodes/{nodeId}  # Update node
DELETE /api/debates/{id}/nodes/{nodeId}  # Delete node

GET    /api/debates/{id}/export  # Export debate
POST   /api/debates/{id}/export  # Advanced export
```

### Search Parameters
```http
GET /api/debates?q=AI%20safety&status=active&tags=technology&limit=20
```

See [API Reference](./docs/API_REFERENCE.md) for complete documentation.

## 🎨 UI Components

### Debate Session
- **Tree Visualization**: Hierarchical argument display
- **Real-Time Updates**: Streaming response rendering
- **Interactive Controls**: Add, edit, judge, flag arguments
- **Model Configuration**: Dynamic AI model selection
- **Export Tools**: Multiple format downloads

### Archive Browser
- **Search Interface**: Text and faceted search
- **Filter Controls**: Status, date, participant filters
- **Preview Cards**: Debate metadata and statistics
- **Pagination**: Efficient large dataset navigation

### Debate Viewer
- **Multi-Format Display**: Tree, linear, timeline views
- **Participant Tracking**: Color-coded argument attribution
- **Quality Indicators**: Flags, scores, and assessments
- **Navigation Tools**: Branch expansion and thread following

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# API tests only
npm run test:api

# UI tests only  
npm run test:ui

# Generate test data
npm run test:seed
```

### Test Data
The system includes mock debates for development:
- AI safety discussions
- Climate change debates
- Philosophy arguments
- Technical specification debates

## 📈 Performance

### Current Limitations
- **File Storage**: ~100 concurrent users
- **Node Limit**: <10,000 nodes per debate recommended
- **Search**: Linear scan for complex queries
- **Export**: Synchronous generation

### Optimization Strategies
- **Lazy Loading**: Load debate sections on demand
- **Caching**: Pre-computed analytics and views
- **Database Migration**: For scale >1,000 users
- **CDN Integration**: For static exports and assets

## 🔐 Security

### Current Security
- **Input Validation**: API parameter validation
- **Content Filtering**: Basic moderation capabilities
- **Access Control**: Public/private debate levels
- **Export Safety**: Sanitized output formats

### Production Security
- **API Keys**: Authentication for API access
- **Rate Limiting**: Prevent abuse and spam
- **Content Moderation**: AI-powered content filtering
- **Privacy Controls**: GDPR compliance features

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Make your changes
5. Add tests for new functionality
6. Run tests: `npm test`
7. Commit changes: `git commit -m 'Add amazing feature'`
8. Push to branch: `git push origin feature/amazing-feature`
9. Open a Pull Request

### Contribution Guidelines
- Follow existing code style and patterns
- Add TypeScript types for new features
- Include tests for new functionality
- Update documentation for API changes
- Use conventional commit messages

### Areas for Contribution
- **Storage Backends**: Database implementations
- **Export Formats**: Additional export options
- **AI Models**: New model integrations
- **UI Components**: Enhanced visualizations
- **Analytics**: Advanced debate metrics
- **Moderation**: Content filtering improvements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI**: For GPT model APIs
- **Vercel**: For Next.js framework and AI SDK
- **Tailwind CSS**: For styling framework
- **React**: For UI component library
- **TypeScript**: For type safety

## 📞 Support

- **Documentation**: [Full docs](./docs/)
- **API Reference**: [API docs](./docs/API_REFERENCE.md)
- **Format Specification**: [Storage format](./docs/DEBATE_FORMAT.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/debate-arena/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/debate-arena/discussions)

---

**Built with ❤️ for advancing discourse and understanding through AI-assisted debate.**
