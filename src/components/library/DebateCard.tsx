'use client'

import React, { useState } from 'react'
import { Calendar, Users, MessageCircle, Eye, Play, Tag, Clock } from 'lucide-react'
import { DebateDocument } from '@/types/debate'

interface DebateCardProps {
  debate: DebateDocument
  viewMode: 'grid' | 'list'
}

export default function DebateCard({ debate, viewMode }: DebateCardProps) {
  const [showPreview, setShowPreview] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getParticipantBadges = () => {
    return Object.values(debate.participants)
      .filter(p => p.type === 'human')
      .map(participant => ({
        name: participant.name,
        role: participant.role,
        color: participant.role === 'honest' ? 'bg-green-100 text-green-800' : 
               participant.role === 'dishonest' ? 'bg-red-100 text-red-800' :
               'bg-gray-100 text-gray-800'
      }))
  }

  const getComplexityLevel = () => {
    const nodeCount = debate.analytics?.totalNodes || 0
    if (nodeCount < 5) return { level: 'Simple', color: 'bg-blue-100 text-blue-800' }
    if (nodeCount < 10) return { level: 'Moderate', color: 'bg-yellow-100 text-yellow-800' }
    return { level: 'Complex', color: 'bg-purple-100 text-purple-800' }
  }

  const handleLoadDebate = () => {
    window.location.href = `/debate/session?load=${debate.metadata.id}`
  }

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowPreview(!showPreview)
  }

  const participants = getParticipantBadges()
  const complexity = getComplexityLevel()
  const previewText = debate.metadata.topic.description.length > 150 
    ? debate.metadata.topic.description.substring(0, 150) + '...'
    : debate.metadata.topic.description

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
                    onClick={handleLoadDebate}>
                  {debate.metadata.topic.title}
                </h3>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${complexity.color}`}>
                  {complexity.level}
                </span>
              </div>
              
              <p className="text-gray-600 mb-3">{previewText}</p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(debate.metadata.timestamps.created)}
                </div>
                <div className="flex items-center">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {debate.analytics?.totalNodes || 0} nodes
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {debate.analytics?.totalParticipants || 0} participants
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end space-y-3 ml-6">
              <div className="flex flex-wrap gap-1 justify-end">
                {participants.map((participant, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${participant.color}`}
                  >
                    {participant.name}:{participant.role.charAt(0).toUpperCase()}
                  </span>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                {debate.metadata.topic.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {tag}
                  </span>
                ))}
                {debate.metadata.topic.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{debate.metadata.topic.tags.length - 3} more
                  </span>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handlePreview}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </button>
                <button
                  onClick={handleLoadDebate}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Load
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer line-clamp-2"
              onClick={handleLoadDebate}>
            {debate.metadata.topic.title}
          </h3>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${complexity.color} ml-2 flex-shrink-0`}>
            {complexity.level}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {participants.map((participant, index) => (
            <span
              key={index}
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${participant.color}`}
            >
              {participant.name}:{participant.role.charAt(0).toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {previewText}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {debate.metadata.topic.tags.slice(0, 4).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </span>
          ))}
          {debate.metadata.topic.tags.length > 4 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500">
              +{debate.metadata.topic.tags.length - 4}
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(debate.metadata.timestamps.created)}
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <MessageCircle className="h-3 w-3 mr-1" />
              {debate.analytics?.totalNodes || 0}
            </div>
            <div className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {debate.analytics?.totalParticipants || 0}
            </div>
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {debate.metadata.status}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={handlePreview}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </button>
          <button
            onClick={handleLoadDebate}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Play className="h-4 w-4 mr-1" />
            Load
          </button>
        </div>
      </div>

      {/* Preview Modal/Expansion */}
      {showPreview && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="mb-3">
            <h4 className="font-medium text-gray-900 mb-2">Full Description</h4>
            <p className="text-sm text-gray-700">{debate.metadata.topic.description}</p>
          </div>
          
          {debate.metadata.topic.category && (
            <div className="mb-3">
              <h4 className="font-medium text-gray-900 mb-1">Category</h4>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {debate.metadata.topic.category}
              </span>
            </div>
          )}

          <div className="mb-3">
            <h4 className="font-medium text-gray-900 mb-2">All Tags</h4>
            <div className="flex flex-wrap gap-1">
              {debate.metadata.topic.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {debate.originalPlatform && (
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Source</h4>
              <p className="text-xs text-gray-600">{debate.originalPlatform.name}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}