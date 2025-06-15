// API endpoints for debate node operations
// Handles adding, updating, deleting nodes within debates

import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage/storage-manager';
import { AddNodeRequest } from '@/types/debate';

export const runtime = 'nodejs';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/debates/[id]/nodes - Add new node to debate
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: debateId } = params;
    const body = await request.json();
    
    if (!debateId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Debate ID is required' } },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!body.content?.text) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Node content text is required' } },
        { status: 400 }
      );
    }
    
    if (!body.participantId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Participant ID is required' } },
        { status: 400 }
      );
    }
    
    const nodeRequest: AddNodeRequest = {
      debateId,
      ...body
    };
    
    const result = await storage.addNode(nodeRequest);
    
    if (!result.success) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(result, { status });
    }
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error adding node:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}