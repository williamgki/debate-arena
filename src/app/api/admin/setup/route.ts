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
    
    // Try to load meteor debates
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
    for (const folder of folders.slice(0, 3)) { // Test with first 3 only
      try {
        const debateJsonPath = path.join(meteorDebatesPath, folder, 'debate.json');
        if (fs.existsSync(debateJsonPath)) {
          const fileContent = fs.readFileSync(debateJsonPath, 'utf-8');
          const debate = JSON.parse(fileContent);
          console.log(`✓ Loaded debate: ${debate.metadata.topic.title}`);
          successCount++;
        }
      } catch (error) {
        console.warn(`⚠ Failed to load debate in ${folder}:`, error.message);
      }
    }
    
    await pool.end();
    
    return NextResponse.json({ 
      success: true, 
      message: `Database setup completed successfully. Tested loading ${successCount} debates.`,
      debugInfo: {
        foundFolders: folders.length,
        testedDebates: Math.min(3, folders.length),
        successfulLoads: successCount
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