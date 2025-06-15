// API endpoints for debate management
// Handles CRUD operations for debates

import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage/storage-manager';
import { CreateDebateRequest, SearchQuery } from '@/types/debate';

export const runtime = 'nodejs';

// GET /api/debates - List or search debates
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Parse query parameters
    const query: SearchQuery = {};
    
    // Text search
    if (searchParams.get('q')) {
      query.text = searchParams.get('q')!;
    }
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');
    query.limit = limit;
    query.offset = offset;
    
    // Status filter
    const status = searchParams.get('status');
    if (status) {
      query.status = [status as any];
    }
    
    // Date range
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      query.dateRange = [startDate, endDate];
    }
    
    // Sorting
    query.sortBy = (searchParams.get('sortBy') as any) || 'created';
    query.sortOrder = (searchParams.get('sortOrder') as any) || 'desc';
    
    // Use unified storage system (includes meteor debates after migration)
    const result = await storage.searchDebates(query);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error searching debates:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// POST /api/debates - Create new debate
export async function POST(request: NextRequest) {
  try {
    const body: CreateDebateRequest = await request.json();
    
    // Validate required fields
    if (!body.topic?.title) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Topic title is required' } },
        { status: 400 }
      );
    }
    
    if (!body.initialTopic) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Initial topic is required' } },
        { status: 400 }
      );
    }
    
    if (!body.participants || body.participants.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one participant is required' } },
        { status: 400 }
      );
    }
    
    const result = await storage.createDebate(body);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating debate:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}