// API endpoints for individual debate operations
// Handles get, update, delete for specific debates

import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage/storage-manager';
import { DebateDocument } from '@/types/debate';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

interface RouteParams {
  params: {
    id: string;
  };
}

// Helper function to load a specific meteor debate
async function loadMeteorDebate(id: string): Promise<DebateDocument | null> {
  try {
    const meteorDebatesPath = path.join(process.cwd(), 'meteor-debates-json');
    
    if (!fs.existsSync(meteorDebatesPath)) {
      return null;
    }

    const folders = fs.readdirSync(meteorDebatesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const folder of folders) {
      const debateJsonPath = path.join(meteorDebatesPath, folder, 'debate.json');
      
      if (fs.existsSync(debateJsonPath)) {
        try {
          const fileContent = fs.readFileSync(debateJsonPath, 'utf-8');
          const debate: DebateDocument = JSON.parse(fileContent);
          
          if (debate.metadata.id === id) {
            // Add meteor-platform tag if not present
            if (!debate.metadata.topic.tags.includes('meteor-platform')) {
              debate.metadata.topic.tags.push('meteor-platform');
            }
            return debate;
          }
        } catch (error) {
          console.warn(`Failed to parse debate JSON in ${folder}:`, error);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error loading meteor debate:', error);
    return null;
  }
}

// GET /api/debates/[id] - Get specific debate
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Debate ID is required' } },
        { status: 400 }
      );
    }
    
    // First try to get from storage
    const result = await storage.getDebate(id);
    
    if (result.success) {
      return NextResponse.json(result);
    }
    
    // If not found in storage, try meteor debates
    const meteorDebate = await loadMeteorDebate(id);
    
    if (meteorDebate) {
      return NextResponse.json({
        success: true,
        debate: meteorDebate
      });
    }
    
    // Not found anywhere
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Debate not found' } },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error getting debate:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
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