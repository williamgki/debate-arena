'use client';

import { API_BASE_URL } from '@/lib/api-config';

export default function DebugAPI() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Debug</h1>
      
      <div className="space-y-4">
        <div>
          <strong>NEXT_PUBLIC_API_URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'Not set'}
        </div>
        
        <div>
          <strong>API_BASE_URL (computed):</strong> {API_BASE_URL || 'Empty (will use relative paths)'}
        </div>
        
        <div>
          <strong>Current domain:</strong> {typeof window !== 'undefined' ? window.location.origin : 'Server-side'}
        </div>
        
        <div>
          <strong>Expected API call to:</strong> {API_BASE_URL ? `${API_BASE_URL}/api/debates` : '/api/debates (relative)'}
        </div>
      </div>
    </div>
  );
}