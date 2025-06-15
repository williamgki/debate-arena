import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    hasDatabase: !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL,
    nodeEnv: process.env.NODE_ENV,
    databaseUrlSet: !!process.env.DATABASE_URL,
    postgresUrlSet: !!process.env.POSTGRES_URL,
    // Don't expose the actual URLs for security
    environmentVariables: Object.keys(process.env).filter(key => 
      key.includes('DATABASE') || key.includes('POSTGRES')
    )
  });
}