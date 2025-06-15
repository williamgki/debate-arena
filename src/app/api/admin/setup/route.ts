import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    console.log('🚀 Starting database setup...');
    
    // Test database connection first
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Test connection
    console.log('Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', testResult.rows[0]);
    
    // Try to set up schema
    console.log('Setting up database schema...');
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(process.cwd(), 'scripts', 'create-schema.sql');
    
    console.log('Reading schema file from:', schemaPath);
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('Schema file read successfully, length:', schema.length);
    
    await pool.query(schema);
    console.log('✅ Database schema created');
    
    // Load and insert meteor debates
    console.log('Loading meteor debates...');
    const meteorDebatesPath = path.join(process.cwd(), 'meteor-debates-json');
    console.log('Looking for meteor debates in:', meteorDebatesPath);
    
    if (!fs.existsSync(meteorDebatesPath)) {
      throw new Error(`Meteor debates directory not found: ${meteorDebatesPath}`);
    }
    
    const folders = fs.readdirSync(meteorDebatesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`Found ${folders.length} debate folders`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const folder of folders) {
      try {
        const debateJsonPath = path.join(meteorDebatesPath, folder, 'debate.json');
        if (fs.existsSync(debateJsonPath)) {
          const fileContent = fs.readFileSync(debateJsonPath, 'utf-8');
          const debate = JSON.parse(fileContent);
          
          // Add meteor-platform tag if not present
          if (!debate.metadata.topic.tags.includes('meteor-platform')) {
            debate.metadata.topic.tags.push('meteor-platform');
          }
          
          // Insert into database
          await pool.query(`
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
          
          console.log(`✓ Inserted debate: ${debate.metadata.topic.title}`);
          successCount++;
        }
      } catch (error) {
        console.warn(`⚠ Failed to insert debate in ${folder}:`, error.message);
        errorCount++;
      }
    }
    
    await pool.end();
    
    return NextResponse.json({ 
      success: true, 
      message: `Database setup completed successfully. Inserted ${successCount} debates.`,
      debugInfo: {
        foundFolders: folders.length,
        successfulInserts: successCount,
        errors: errorCount
      }
    });
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}