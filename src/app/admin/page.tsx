'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runSetup = async () => {
    setLoading(true);
    setStatus('Setting up database and loading debates...');
    
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStatus('✅ Success! Database setup completed. All 51 Meteor debates (including Beth\'s) have been loaded!');
      } else {
        setStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Database Setup
          </h1>
          
          <p className="text-gray-600 mb-6">
            Click the button below to set up the PostgreSQL database and load all 51 Meteor debates 
            (including Beth's debates) into the system.
          </p>
          
          <button
            onClick={runSetup}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Setting up...' : 'Setup Database & Load Debates'}
          </button>
          
          {status && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <p className="whitespace-pre-wrap">{status}</p>
            </div>
          )}
          
          <div className="mt-8 text-sm text-gray-500">
            <p><strong>What this does:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Creates PostgreSQL database schema (tables, indexes)</li>
              <li>Loads all 51 processed Meteor debates from JSON files</li>
              <li>Tags all debates with "meteor-platform"</li>
              <li>Enables search and filtering in the library</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}