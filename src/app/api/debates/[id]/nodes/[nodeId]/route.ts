// API endpoints for individual node operations
// Handles get, update, delete for specific nodes

import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage/storage-manager';
import { AddNodeRequest } from '@/types/debate';

export const runtime = 'nodejs';

interface RouteParams {
  params: {
    id: string;
    nodeId: string;
  };
}

// PUT /api/debates/[id]/nodes/[nodeId] - Update specific node
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: debateId, nodeId } = params;
    const updates: Partial<AddNodeRequest> = await request.json();
    
    if (!debateId || !nodeId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Debate ID and Node ID are required' } },
        { status: 400 }
      );
    }
    
    const result = await storage.updateNode(debateId, nodeId, updates);
    
    if (!result.success) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(result, { status });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating node:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/debates/[id]/nodes/[nodeId] - Delete specific node
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: debateId, nodeId } = params;
    
    if (!debateId || !nodeId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Debate ID and Node ID are required' } },
        { status: 400 }
      );
    }
    
    const result = await storage.deleteNode(debateId, nodeId);
    
    if (!result.success) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(result, { status });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}