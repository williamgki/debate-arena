import { NextResponse } from 'next/server';
import { setupDatabase } from '../../../../../scripts/setup-database';
import { runMigration } from '../../../../../scripts/migrate-meteor-debates';

export const runtime = 'nodejs';

export async function POST() {
  try {
    console.log('🚀 Starting database setup...');
    
    // Set up database schema
    await setupDatabase();
    console.log('✅ Database schema created');
    
    // Run meteor debates migration
    await runMigration();
    console.log('✅ Meteor debates migration completed');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database setup and migration completed successfully' 
    });
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}