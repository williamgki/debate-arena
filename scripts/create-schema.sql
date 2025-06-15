-- Database schema for debate storage
-- This will be used on Railway PostgreSQL

-- Main debates table
CREATE TABLE IF NOT EXISTS debates (
    id VARCHAR(255) PRIMARY KEY,
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    tags JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    format VARCHAR(50) NOT NULL DEFAULT 'tree',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    configuration JSONB DEFAULT '{}'::jsonb,
    access_level VARCHAR(50) DEFAULT 'public',
    analytics JSONB DEFAULT '{}'::jsonb,
    original_platform JSONB,
    root_node_id VARCHAR(255),
    full_document JSONB NOT NULL -- Store the complete DebateDocument as JSON
);

-- Participants table (for easier querying)
CREATE TABLE IF NOT EXISTS debate_participants (
    id SERIAL PRIMARY KEY,
    debate_id VARCHAR(255) REFERENCES debates(id) ON DELETE CASCADE,
    participant_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    type VARCHAR(50) NOT NULL,
    side VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debate nodes table (for easier querying and search)
CREATE TABLE IF NOT EXISTS debate_nodes (
    id SERIAL PRIMARY KEY,
    debate_id VARCHAR(255) REFERENCES debates(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    participant_id VARCHAR(255),
    content TEXT NOT NULL,
    parent_node_id VARCHAR(255),
    depth INTEGER DEFAULT 0,
    thread_id VARCHAR(255),
    sequence_in_thread INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    confidence_level DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    node_data JSONB -- Store complete node data
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_debates_category ON debates(category);
CREATE INDEX IF NOT EXISTS idx_debates_status ON debates(status);
CREATE INDEX IF NOT EXISTS idx_debates_created_at ON debates(created_at);
CREATE INDEX IF NOT EXISTS idx_debates_tags ON debates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_debate_participants_debate_id ON debate_participants(debate_id);
CREATE INDEX IF NOT EXISTS idx_debate_participants_name ON debate_participants(name);
CREATE INDEX IF NOT EXISTS idx_debate_participants_role ON debate_participants(role);
CREATE INDEX IF NOT EXISTS idx_debate_nodes_debate_id ON debate_nodes(debate_id);
CREATE INDEX IF NOT EXISTS idx_debate_nodes_content ON debate_nodes USING GIN(to_tsvector('english', content));

-- Full text search
CREATE INDEX IF NOT EXISTS idx_debates_search ON debates USING GIN(
    to_tsvector('english', title || ' ' || COALESCE(description, ''))
);