#!/usr/bin/env node
// Script to seed test data for development and testing

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = './data/debates';
const TEST_DATA_DIR = './tests/data/debates';

const sampleDebateTopics = [
  {
    title: 'AI Safety and Alignment',
    description: 'Should AI development be regulated to ensure safety?',
    tags: ['ai', 'safety', 'regulation', 'technology'],
    category: 'technology'
  },
  {
    title: 'Universal Basic Income Implementation',
    description: 'Would UBI solve economic inequality?',
    tags: ['economics', 'policy', 'ubi', 'welfare'],
    category: 'economics'
  },
  {
    title: 'Climate Change Mitigation Strategies',
    description: 'Nuclear vs renewable energy for climate goals',
    tags: ['climate', 'energy', 'environment', 'policy'],
    category: 'environment'
  },
  {
    title: 'Remote Work vs Office Culture',
    description: 'Which work model is more productive?',
    tags: ['work', 'productivity', 'culture', 'business'],
    category: 'business'
  },
  {
    title: 'Cryptocurrency Regulation',
    description: 'Should cryptocurrencies be regulated like traditional finance?',
    tags: ['crypto', 'finance', 'regulation', 'technology'],
    category: 'finance'
  }
];

const sampleParticipants = {
  system: {
    id: 'system',
    role: 'system',
    type: 'system',
    name: 'System'
  },
  debaterA: {
    id: 'debaterA',
    role: 'debaterA',
    type: 'human',
    name: 'Alice Cooper'
  },
  debaterB: {
    id: 'debaterB',
    role: 'debaterB',
    type: 'ai',
    name: 'GPT-4',
    model: 'gpt-4'
  },
  'judge-ai': {
    id: 'judge-ai',
    role: 'judge',
    type: 'ai',
    name: 'AI Judge',
    model: 'gpt-4'
  }
};

function createNode(text, participantId, parentId = null, depth = 0, flags = []) {
  const nodeId = uuidv4();
  const now = new Date().toISOString();
  
  return {
    id: nodeId,
    content: { text },
    participantId,
    timestamps: { created: now },
    relationships: {
      parents: parentId ? [{ targetNodeId: parentId, type: 'responds-to' }] : [],
      children: []
    },
    position: {
      depth,
      threadId: uuidv4(),
      sequenceInThread: depth
    },
    flags,
    metrics: {
      selfScore: Math.floor(Math.random() * 4) + 6, // 6-10
      wordCount: text.split(' ').length,
      confidenceLevel: Math.random() * 0.4 + 0.6 // 0.6-1.0
    },
    version: 1
  };
}

function createDebateTree(topic, status = 'active') {
  const debateId = uuidv4();
  const now = new Date().toISOString();
  
  // Create root node
  const rootNode = createNode(topic.title, 'system');
  const nodes = { [rootNode.id]: rootNode };
  
  // Create argument tree
  const arg1 = createNode(
    `I believe ${topic.title.toLowerCase()} because of strong evidence supporting this position.`,
    'debaterA',
    rootNode.id,
    1
  );
  nodes[arg1.id] = arg1;
  
  const arg2 = createNode(
    `However, this perspective overlooks several critical counterarguments that need consideration.`,
    'debaterB',
    arg1.id,
    2,
    ['logical_flaw'] // Add some flags for testing
  );
  nodes[arg2.id] = arg2;
  
  const arg3 = createNode(
    `That's a fair point, but the evidence still strongly supports the original position when properly analyzed.`,
    'debaterA',
    arg2.id,
    3,
    ['high_quality']
  );
  nodes[arg3.id] = arg3;
  
  const judgeNode = createNode(
    `Both arguments have merit. Debater A provides stronger evidence, but Debater B raises valid concerns. Winner: Debater A.`,
    'judge-ai',
    arg3.id,
    4
  );
  nodes[judgeNode.id] = judgeNode;
  
  // Update relationships
  rootNode.relationships.children = [{ targetNodeId: arg1.id, type: 'responds-to' }];
  arg1.relationships.children = [{ targetNodeId: arg2.id, type: 'responds-to' }];
  arg2.relationships.children = [{ targetNodeId: arg3.id, type: 'responds-to' }];
  arg3.relationships.children = [{ targetNodeId: judgeNode.id, type: 'judges' }];
  
  return {
    metadata: {
      id: debateId,
      version: '1.0',
      topic,
      timestamps: {
        created: now,
        lastModified: now,
        started: now,
        completed: status === 'completed' ? now : undefined
      },
      status,
      format: 'tree',
      configuration: {
        allowObfuscation: true,
        scoringMethod: 'self-assessment',
        moderationLevel: 'light',
        allowPublicJudging: true
      },
      access: { level: 'public' },
      analytics: {
        totalNodes: Object.keys(nodes).length,
        totalParticipants: Object.keys(sampleParticipants).length,
        totalJudgments: 1,
        totalFlags: 2,
        averageDepth: 2,
        longestThread: 5
      }
    },
    participants: sampleParticipants,
    nodes,
    annotations: {},
    rootNodeId: rootNode.id
  };
}

async function createIndex(debates) {
  const index = {
    debates: {},
    lastUpdated: new Date().toISOString()
  };
  
  for (const debate of debates) {
    index.debates[debate.metadata.id] = {
      title: debate.metadata.topic.title,
      created: debate.metadata.timestamps.created,
      status: debate.metadata.status,
      participants: debate.metadata.analytics.totalParticipants,
      nodes: debate.metadata.analytics.totalNodes
    };
  }
  
  return index;
}

async function seedData(targetDir) {
  console.log(`🌱 Seeding test data to ${targetDir}...`);
  
  // Ensure directories exist
  await fs.mkdir(targetDir, { recursive: true });
  await fs.mkdir(path.join(targetDir, 'debates'), { recursive: true });
  
  // Create sample debates
  const debates = [];
  
  for (let i = 0; i < sampleDebateTopics.length; i++) {
    const topic = sampleDebateTopics[i];
    const status = i === 0 ? 'completed' : i === 4 ? 'draft' : 'active';
    const debate = createDebateTree(topic, status);
    debates.push(debate);
    
    // Write debate file
    const filename = path.join(targetDir, 'debates', `${debate.metadata.id}.json`);
    await fs.writeFile(filename, JSON.stringify(debate, null, 2));
    console.log(`  📄 Created ${topic.title}`);
  }
  
  // Create index
  const index = await createIndex(debates);
  await fs.writeFile(path.join(targetDir, 'index.json'), JSON.stringify(index, null, 2));
  
  console.log(`✅ Seeded ${debates.length} debates with index`);
  return debates;
}

// Performance test data (larger debates)
function createLargeDebate(nodeCount = 100) {
  const topic = {
    title: 'Large Scale AI Governance Framework',
    description: 'A comprehensive debate on AI governance with many participants',
    tags: ['ai', 'governance', 'policy', 'large-scale'],
    category: 'technology'
  };
  
  const debate = createDebateTree(topic);
  const nodes = { ...debate.nodes };
  const rootId = debate.rootNodeId;
  
  // Add many more nodes for performance testing
  let currentParents = [rootId];
  let currentDepth = 1;
  let nodeCounter = Object.keys(nodes).length;
  
  while (nodeCounter < nodeCount) {
    const nextParents = [];
    
    for (const parentId of currentParents) {
      if (nodeCounter >= nodeCount) break;
      
      // Add 2-3 children per parent
      const childrenCount = Math.min(Math.floor(Math.random() * 2) + 2, nodeCount - nodeCounter);
      
      for (let i = 0; i < childrenCount; i++) {
        const participant = Math.random() > 0.5 ? 'debaterA' : 'debaterB';
        const text = `Argument ${nodeCounter}: This is a generated argument for performance testing with depth ${currentDepth}.`;
        
        const childNode = createNode(text, participant, parentId, currentDepth);
        nodes[childNode.id] = childNode;
        
        // Update parent's children
        nodes[parentId].relationships.children.push({
          targetNodeId: childNode.id,
          type: 'responds-to'
        });
        
        nextParents.push(childNode.id);
        nodeCounter++;
        
        if (nodeCounter >= nodeCount) break;
      }
    }
    
    currentParents = nextParents;
    currentDepth++;
    
    // Prevent infinite loops
    if (currentDepth > 10 || currentParents.length === 0) break;
  }
  
  // Update analytics
  debate.metadata.analytics.totalNodes = Object.keys(nodes).length;
  debate.metadata.analytics.averageDepth = currentDepth / 2;
  debate.metadata.analytics.longestThread = currentDepth;
  
  debate.nodes = nodes;
  
  return debate;
}

async function seedPerformanceData(targetDir) {
  console.log(`🚀 Creating performance test data...`);
  
  const sizes = [10, 50, 100, 500];
  const debates = [];
  
  for (const size of sizes) {
    const debate = createLargeDebate(size);
    debates.push(debate);
    
    const filename = path.join(targetDir, 'debates', `perf-${size}-${debate.metadata.id}.json`);
    await fs.writeFile(filename, JSON.stringify(debate, null, 2));
    console.log(`  📈 Created ${size}-node debate`);
  }
  
  return debates;
}

async function main() {
  const args = process.argv.slice(2);
  const env = args[0] || 'test';
  
  try {
    if (env === 'test') {
      await seedData(TEST_DATA_DIR);
    } else if (env === 'dev') {
      await seedData(DATA_DIR);
    } else if (env === 'perf') {
      await seedData(TEST_DATA_DIR);
      await seedPerformanceData(TEST_DATA_DIR);
    } else {
      console.log('Usage: npm run test:seed [test|dev|perf]');
      console.log('  test - Seed test data directory');
      console.log('  dev  - Seed development data directory');
      console.log('  perf - Seed performance test data');
      process.exit(1);
    }
    
    console.log('🎉 Data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}