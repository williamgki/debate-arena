'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DebateAPI, DebateConverter } from '@/lib/utils/debate-conversion';
import { DebateDocument, DebateNode as NewDebateNode } from '@/types/debate';

// Legacy type for rendering
type ArgumentNode = {
  nodeId: string;
  parentId: string | null;
  text: string;
  participantId: string;
  obfuscationFlag: boolean;
  score?: number;
  children: ArgumentNode[];
};

export default function ClientPreview() {
  const params = useSearchParams();
  const router = useRouter();
  const debateId = params.get('debateId');
  const topic = params.get('topic');
  
  const [debate, setDebate] = useState<DebateDocument | null>(null);
  const [tree, setTree] = useState<ArgumentNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'tree' | 'linear' | 'timeline'>('tree');

  useEffect(() => {
    if (debateId) {
      loadDebate();
    } else if (topic) {
      // Legacy preview mode with just topic
      setLoading(false);
    } else {
      setError('No debate ID or topic provided');
      setLoading(false);
    }
  }, [debateId, topic]);

  const loadDebate = async () => {
    if (!debateId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const debateDoc = await DebateAPI.getDebate(debateId);
      if (debateDoc) {
        setDebate(debateDoc);
        const legacyTree = DebateConverter.convertFromDebateDocument(debateDoc);
        setTree(legacyTree);
      } else {
        setError('Debate not found');
      }
    } catch (err) {
      setError('Error loading debate: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getParticipantInfo = (participantId: string) => {
    if (!debate) return { name: participantId, color: 'text-gray-600' };
    
    const participant = debate.participants[participantId];
    if (!participant) return { name: participantId, color: 'text-gray-600' };
    
    const colors = {
      'debaterA': 'text-blue-700',
      'debaterB': 'text-purple-700',
      'judge': 'text-slate-700',
      'judge-ai': 'text-slate-700',
      'system': 'text-gray-600',
      'manual-branch': 'text-green-700',
      'system-error': 'text-red-700'
    };
    
    return {
      name: participant.name,
      color: colors[participant.role as keyof typeof colors] || 'text-gray-600'
    };
  };

  const renderTreeView = (node: ArgumentNode, depth: number = 0): React.ReactNode => {
    const participantInfo = getParticipantInfo(node.participantId);
    const indent = depth * 20;
    
    return (
      <div key={node.nodeId} style={{ marginLeft: indent }} className="mb-4">
        <div className="border-l-2 border-gray-200 pl-4">
          <div className={`font-semibold ${participantInfo.color} mb-1`}>
            {participantInfo.name}
            {node.score && (
              <span className="ml-2 text-sm text-gray-500 font-normal">
                (Score: {node.score})
              </span>
            )}
            {node.obfuscationFlag && (
              <span className="ml-2 text-xs text-yellow-700 font-semibold">
                ⚠️ Obfuscated
              </span>
            )}
          </div>
          <div className="text-gray-800 mb-2 whitespace-pre-wrap">
            {node.text}
          </div>
        </div>
        
        <div className="ml-4">
          {node.children.map(child => renderTreeView(child, depth + 1))}
        </div>
      </div>
    );
  };

  const renderLinearView = () => {
    if (!tree) return null;
    
    const flattenNodes = (node: ArgumentNode): ArgumentNode[] => {
      return [node, ...node.children.flatMap(child => flattenNodes(child))];
    };
    
    const allNodes = flattenNodes(tree);
    
    return (
      <div className="space-y-4">
        {allNodes.map((node, index) => {
          const participantInfo = getParticipantInfo(node.participantId);
          return (
            <div key={node.nodeId} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-500">#{index + 1}</span>
                <span className={`font-semibold ${participantInfo.color}`}>
                  {participantInfo.name}
                </span>
                {node.score && (
                  <span className="text-sm text-gray-500">
                    (Score: {node.score})
                  </span>
                )}
                {node.obfuscationFlag && (
                  <span className="text-xs text-yellow-700 font-semibold">
                    ⚠️ Obfuscated
                  </span>
                )}
              </div>
              <div className="text-gray-800 whitespace-pre-wrap">
                {node.text}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimelineView = () => {
    if (!debate) return null;
    
    const nodes = Object.values(debate.nodes).sort((a, b) => 
      new Date(a.timestamps.created).getTime() - new Date(b.timestamps.created).getTime()
    );
    
    return (
      <div className="space-y-6">
        {nodes.map((node, index) => {
          const participantInfo = getParticipantInfo(node.participantId);
          return (
            <div key={node.id} className="flex gap-4">
              <div className="flex-shrink-0 w-24 text-right">
                <div className="text-sm text-gray-500">
                  {formatDate(node.timestamps.created)}
                </div>
              </div>
              <div className="flex-shrink-0 w-2 bg-gray-200 rounded-full relative">
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
              <div className="flex-1 bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`font-semibold ${participantInfo.color}`}>
                    {participantInfo.name}
                  </span>
                  {node.metrics.selfScore && (
                    <span className="text-sm text-gray-500">
                      (Score: {node.metrics.selfScore})
                    </span>
                  )}
                  {node.flags.includes('obfuscated') && (
                    <span className="text-xs text-yellow-700 font-semibold">
                      ⚠️ Obfuscated
                    </span>
                  )}
                </div>
                <div className="text-gray-800 whitespace-pre-wrap">
                  {node.content.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading debate...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Debate</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={loadDebate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
              <Link
                href="/debates"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Back to Debates
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Legacy mode with just topic
  if (!debateId && topic) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🧠 Debate Preview</h1>
          <p className="text-gray-600 mb-4">Topic: <strong>{topic}</strong></p>
          <p className="text-gray-500">This is a preview mode. The full debate viewer requires a saved debate.</p>
          <Link
            href="/setup"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create This Debate
          </Link>
        </div>
      </div>
    );
  }

  if (!debate || !tree) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600">No debate data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              🧠 {debate.metadata.topic.title}
            </h1>
            <div className="flex gap-2">
              <Link
                href={`/debate/session?debateId=${debateId}`}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                🔗 Open Debate
              </Link>
              <Link
                href="/debates"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                ← Back to List
              </Link>
            </div>
          </div>
          
          {debate.metadata.topic.description && (
            <p className="text-gray-700 mb-4">{debate.metadata.topic.description}</p>
          )}
          
          <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
            <span>📅 Created: {formatDate(debate.metadata.timestamps.created)}</span>
            <span>💬 {debate.metadata.analytics.totalNodes} arguments</span>
            <span>👥 {debate.metadata.analytics.totalParticipants} participants</span>
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              debate.metadata.status === 'active' ? 'bg-green-100 text-green-800' :
              debate.metadata.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              debate.metadata.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {debate.metadata.status}
            </span>
          </div>
          
          {debate.metadata.topic.tags.length > 0 && (
            <div className="flex gap-2 mb-4">
              {debate.metadata.topic.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* View Format Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedFormat('tree')}
              className={`px-4 py-2 rounded text-sm font-medium ${
                selectedFormat === 'tree'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌳 Tree View
            </button>
            <button
              onClick={() => setSelectedFormat('linear')}
              className={`px-4 py-2 rounded text-sm font-medium ${
                selectedFormat === 'linear'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📋 Linear View
            </button>
            <button
              onClick={() => setSelectedFormat('timeline')}
              className={`px-4 py-2 rounded text-sm font-medium ${
                selectedFormat === 'timeline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⏰ Timeline View
            </button>
          </div>
        </div>

        {/* Debate Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {selectedFormat === 'tree' && renderTreeView(tree)}
          {selectedFormat === 'linear' && renderLinearView()}
          {selectedFormat === 'timeline' && renderTimelineView()}
        </div>
      </div>
    </div>
  );
}
