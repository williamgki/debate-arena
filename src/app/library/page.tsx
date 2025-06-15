'use client'

import React, { useState, useEffect } from 'react'
import { Search, Filter, Grid, List, Shuffle, Download, BookOpen, Users, Tag, Calendar, TrendingUp } from 'lucide-react'
import DebateCard from '@/components/library/DebateCard'
import FilterSidebar from '@/components/library/FilterSidebar'
import { DebateDocument } from '@/types/debate'
import { apiCall } from '@/lib/api-config'

export default function DebateLibrary() {
  const [debates, setDebates] = useState<DebateDocument[]>([])
  const [filteredDebates, setFilteredDebates] = useState<DebateDocument[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})
  const [sortBy, setSortBy] = useState('recent')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(true)

  // Load debates on component mount
  useEffect(() => {
    loadDebates()
  }, [])

  // Apply filters and search when they change
  useEffect(() => {
    applyFiltersAndSearch()
  }, [debates, searchQuery, activeFilters, sortBy])

  const loadDebates = async () => {
    try {
      setIsLoading(true)
      const response = await apiCall('/api/debates')
      if (response.ok) {
        const data = await response.json()
        setDebates(data.debates || [])
      }
    } catch (error) {
      console.error('Failed to load debates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFiltersAndSearch = () => {
    let filtered = [...debates]

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(debate => 
        debate.metadata.topic.title.toLowerCase().includes(query) ||
        debate.metadata.topic.description.toLowerCase().includes(query) ||
        debate.metadata.topic.tags.some(tag => tag.toLowerCase().includes(query)) ||
        Object.values(debate.participants).some(p => p.name.toLowerCase().includes(query))
      )
    }

    // Apply category filters
    Object.entries(activeFilters).forEach(([category, values]) => {
      if (values.length > 0) {
        filtered = filtered.filter(debate => {
          switch (category) {
            case 'topic':
              return values.some(value => 
                debate.metadata.topic.category === value ||
                debate.metadata.topic.tags.includes(value)
              )
            case 'participants':
              return values.some(value => 
                Object.values(debate.participants).some(p => 
                  p.name.toLowerCase() === value.toLowerCase()
                )
              )
            case 'source':
              return values.includes('meteor-platform') // All current debates are from meteor platform
            case 'format':
              return values.some(value => {
                if (value === 'honest-dishonest') {
                  return Object.values(debate.participants).some(p => p.role === 'honest') &&
                         Object.values(debate.participants).some(p => p.role === 'dishonest')
                }
                if (value === 'self-debate') {
                  const names = Object.values(debate.participants).map(p => p.name)
                  return names.length !== new Set(names).size
                }
                return false
              })
            default:
              return true
          }
        })
      }
    })

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.metadata.timestamps.created).getTime() - new Date(a.metadata.timestamps.created).getTime())
        break
      case 'title':
        filtered.sort((a, b) => a.metadata.topic.title.localeCompare(b.metadata.topic.title))
        break
      case 'participants':
        filtered.sort((a, b) => {
          const aParticipants = Object.values(a.participants).map(p => p.name).join(', ')
          const bParticipants = Object.values(b.participants).map(p => p.name).join(', ')
          return aParticipants.localeCompare(bParticipants)
        })
        break
      case 'complexity':
        filtered.sort((a, b) => (b.analytics?.totalNodes || 0) - (a.analytics?.totalNodes || 0))
        break
    }

    setFilteredDebates(filtered)
  }

  const handleFilterChange = (category: string, values: string[]) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: values
    }))
  }

  const clearAllFilters = () => {
    setActiveFilters({})
    setSearchQuery('')
  }

  const getRandomDebate = () => {
    if (filteredDebates.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredDebates.length)
      const randomDebate = filteredDebates[randomIndex]
      // Navigate to debate session with this debate loaded
      window.location.href = `/debate/session?load=${randomDebate.metadata.id}`
    }
  }

  const exportDebates = () => {
    const dataStr = JSON.stringify(filteredDebates, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `debates-export-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading debate library...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Debate Library</h1>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {filteredDebates.length} debates
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={getRandomDebate}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Random
              </button>
              <button
                onClick={exportDebates}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <a
                href="/debate/session"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                New Debate
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-lg"
              placeholder="Search debates by topic, participants, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Active Filters */}
          {Object.entries(activeFilters).some(([_, values]) => values.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Active filters:</span>
              {Object.entries(activeFilters).map(([category, values]) =>
                values.map(value => (
                  <span
                    key={`${category}-${value}`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {category}: {value}
                    <button
                      onClick={() => handleFilterChange(category, values.filter(v => v !== value))}
                      className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          {showFilters && (
            <div className="w-64 flex-shrink-0">
              <FilterSidebar
                debates={debates}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1">
            {/* Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </button>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="recent">Most Recent</option>
                  <option value="title">Title A-Z</option>
                  <option value="participants">By Participants</option>
                  <option value="complexity">By Complexity</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex border border-gray-300 rounded-md">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            {filteredDebates.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No debates found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your search terms or filters</p>
                <button
                  onClick={clearAllFilters}
                  className="text-blue-600 hover:text-blue-500 underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {filteredDebates.map((debate) => (
                  <DebateCard
                    key={debate.metadata.id}
                    debate={debate}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}