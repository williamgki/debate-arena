#!/usr/bin/env node

/**
 * Migration script to load Meteor debates from JSON files into PostgreSQL
 * Usage: node scripts/migrate-meteor-debates.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function loadMeteorDebates() {
  const debates = [];
  const meteorDebatesPath = path.join(process.cwd(), 'meteor-debates-json');
  
  if (!fs.existsSync(meteorDebatesPath)) {
    console.error('Meteor debates directory not found:', meteorDebatesPath);
    return [];
  }

  const folders = fs.readdirSync(meteorDebatesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`Found ${folders.length} debate folders`);

  for (const folder of folders) {
    const debateJsonPath = path.join(meteorDebatesPath, folder, 'debate.json');
    
    if (fs.existsSync(debateJsonPath)) {
      try {
        const fileContent = fs.readFileSync(debateJsonPath, 'utf-8');
        const debate = JSON.parse(fileContent);
        
        // Add meteor-platform tag if not present
        if (!debate.metadata.topic.tags.includes('meteor-platform')) {
          debate.metadata.topic.tags.push('meteor-platform');
        }
        
        debates.push(debate);
        console.log(`✓ Loaded debate: ${debate.metadata.topic.title}`);
      } catch (error) {
        console.warn(`⚠ Failed to parse debate JSON in ${folder}:`, error.message);
      }
    } else {
      console.warn(`⚠ No debate.json found in ${folder}`);
    }
  }
  
  console.log(`Successfully loaded ${debates.length} debates`);
  return debates;
}

async function insertDebateIntoDatabase(client, debate) {
  try {
    // Insert main debate record
    await client.query(`
      INSERT INTO debates (
        id, version, title, description, category, tags, status, format,
        created_at, updated_at, started_at, completed_at,
        configuration, access_level, analytics, original_platform,
        root_node_id, full_document
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        updated_at = EXCLUDED.updated_at,
        full_document = EXCLUDED.full_document
    `, [
      debate.metadata.id,
      debate.metadata.version,
      debate.metadata.topic.title,
      debate.metadata.topic.description,
      debate.metadata.topic.category,
      JSON.stringify(debate.metadata.topic.tags),
      debate.metadata.status,
      debate.metadata.format,
      debate.metadata.timestamps.created,
      debate.metadata.timestamps.lastModified,
      debate.metadata.timestamps.started,
      debate.metadata.timestamps.completed,
      JSON.stringify(debate.metadata.configuration),
      debate.metadata.access.level,
      JSON.stringify(debate.metadata.analytics),
      JSON.stringify(debate.originalPlatform),
      debate.rootNodeId,
      JSON.stringify(debate)
    ]);

    // Insert participants
    for (const [participantKey, participant] of Object.entries(debate.participants)) {
      if (participant.type === 'human') { // Skip system participants for this table
        await client.query(`
          INSERT INTO debate_participants (
            debate_id, participant_id, name, role, type, side
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [
          debate.metadata.id,
          participant.id,
          participant.name,
          participant.role,
          participant.type,
          participant.side
        ]);
      }
    }

    // Insert nodes
    for (const [nodeKey, node] of Object.entries(debate.nodes)) {
      const content = node.content?.text || '';
      const parentNodeId = node.relationships?.parents?.[0]?.targetNodeId || null;
      
      await client.query(`
        INSERT INTO debate_nodes (
          debate_id, node_id, participant_id, content, parent_node_id,
          depth, thread_id, sequence_in_thread, word_count, confidence_level, node_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, [
        debate.metadata.id,
        node.id,
        node.participantId,
        content,
        parentNodeId,
        node.position?.depth || 0,
        node.position?.threadId,
        node.position?.sequenceInThread || 0,
        node.metrics?.wordCount || content.split(' ').length,
        node.metrics?.confidenceLevel,
        JSON.stringify(node)
      ]);
    }

    console.log(`✓ Inserted debate: ${debate.metadata.topic.title}`);
  } catch (error) {
    console.error(`✗ Failed to insert debate ${debate.metadata.id}:`, error.message);
    throw error;
  }
}

async function runMigration() {
  console.log('🚀 Starting Meteor debates migration...');
  
  // Test database connection
  try {
    await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful');
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    console.error('Make sure DATABASE_URL or POSTGRES_URL environment variable is set');
    process.exit(1);
  }

  const client = await pool.connect();
  
  try {
    // Load debates from JSON files
    const debates = await loadMeteorDebates();
    
    if (debates.length === 0) {
      console.log('No debates found to migrate');
      return;
    }

    // Start transaction
    await client.query('BEGIN');
    
    console.log(`\n📦 Migrating ${debates.length} debates to database...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const debate of debates) {
      try {
        await insertDebateIntoDatabase(client, debate);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Failed to migrate debate ${debate.metadata.id}:`, error.message);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`✓ Successfully migrated: ${successCount} debates`);
    if (errorCount > 0) {
      console.log(`✗ Failed to migrate: ${errorCount} debates`);
    }
    
    // Show summary
    const result = await client.query('SELECT COUNT(*) as total FROM debates');
    console.log(`📊 Total debates in database: ${result.rows[0].total}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration, loadMeteorDebates };