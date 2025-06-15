#!/usr/bin/env node

/**
 * Database setup script - creates schema using Node.js instead of psql command
 * Usage: node scripts/setup-database.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function setupDatabase() {
  console.log('🚀 Setting up database schema...');
  
  // Database configuration
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'create-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('📋 Creating database schema...');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('✅ Database schema created successfully');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };