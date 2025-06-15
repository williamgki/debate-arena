// API endpoints for individual debate operations
// Handles get, update, delete for specific debates

import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage/storage-manager';
import { DebateDocument } from '@/types/debate';

export const runtime = 'nodejs';

// Add CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders() });
}

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/debates/[id] - Get specific debate
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Debate ID is required' } },
        { status: 400, headers: corsHeaders() }
      );
    }
    
    // Get from database (debates should already be migrated)
    const result = await storage.getDebate(id);
    
    if (result.success && result.debate) {
      return NextResponse.json({
        success: true,
        data: result.debate  // Make sure to use 'data' key as expected by DebateAPI
      }, { headers: corsHeaders() });
    }
    
    // Not found
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Debate not found' } },
      { status: 404, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error getting debate:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// PUT /api/debates/[id] - Update specific debate
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const updates: Partial<DebateDocument> = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Debate ID is required' } },
        { status: 400 }
      );
    }
    
    const result = await storage.updateDebate(id, updates);
    
    if (!result.success) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(result, { status });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating debate:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/debates/[id] - Delete specific debate
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Debate ID is required' } },
        { status: 400 }
      );
    }
    
    const result = await storage.deleteDebate(id);
    
    if (!result.success) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(result, { status });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting debate:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}