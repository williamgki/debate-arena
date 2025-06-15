// API endpoints for debate export functionality
// Handles exporting debates in various formats

import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage/storage-manager';
import { ExportOptions, ExportFormat } from '@/types/debate';

export const runtime = 'nodejs';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/debates/[id]/export - Export debate in specified format
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Debate ID is required' } },
        { status: 400 }
      );
    }
    
    // Parse export options
    const format = (searchParams.get('format') || 'json') as ExportFormat;
    const includeAnnotations = searchParams.get('includeAnnotations') === 'true';
    const includeMetrics = searchParams.get('includeMetrics') === 'true';
    const includeEditHistory = searchParams.get('includeEditHistory') === 'true';
    const flattenStructure = searchParams.get('flattenStructure') === 'true';
    const anonymizeParticipants = searchParams.get('anonymizeParticipants') === 'true';
    
    const options: ExportOptions = {
      format,
      includeAnnotations,
      includeMetrics,
      includeEditHistory,
      flattenStructure,
      anonymizeParticipants
    };
    
    const result = await storage.exportDebate(id, options);
    
    if (!result.success) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(result, { status });
    }
    
    if (!result.data) {
      return NextResponse.json(
        { success: false, error: { code: 'EXPORT_ERROR', message: 'Export data is empty' } },
        { status: 500 }
      );
    }
    
    const exportResult = result.data;
    
    // Return the exported data with appropriate headers
    const headers = new Headers({
      'Content-Type': exportResult.mimeType,
      'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
      'X-Export-Metadata': JSON.stringify(exportResult.metadata)
    });
    
    return new NextResponse(exportResult.data, { headers });
  } catch (error) {
    console.error('Error exporting debate:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// POST /api/debates/[id]/export - Export debate with advanced options via POST body
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const options: ExportOptions = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Debate ID is required' } },
        { status: 400 }
      );
    }
    
    if (!options.format) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Export format is required' } },
        { status: 400 }
      );
    }
    
    const result = await storage.exportDebate(id, options);
    
    if (!result.success) {
      const status = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(result, { status });
    }
    
    if (!result.data) {
      return NextResponse.json(
        { success: false, error: { code: 'EXPORT_ERROR', message: 'Export data is empty' } },
        { status: 500 }
      );
    }
    
    const exportResult = result.data;
    
    // Return the exported data with appropriate headers
    const headers = new Headers({
      'Content-Type': exportResult.mimeType,
      'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
      'X-Export-Metadata': JSON.stringify(exportResult.metadata)
    });
    
    return new NextResponse(exportResult.data, { headers });
  } catch (error) {
    console.error('Error exporting debate:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}