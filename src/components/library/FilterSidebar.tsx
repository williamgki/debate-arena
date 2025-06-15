'use client'

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { DebateDocument } from '@/types/debate'

interface FilterSidebarProps {
  debates: DebateDocument[]
  activeFilters: Record<string, string[]>
  onFilterChange: (category: string, values: string[]) => void
}

interface FilterCategory {
  id: string
  label: string
  icon: string
  items: { value: string; label: string; count: number }[]
}

export default function FilterSidebar({ debates, activeFilters, onFilterChange }: FilterSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['topic', 'participants']))
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({})

  // Generate filter categories from debate data
  const filterCategories: FilterCategory[] = useMemo(() => {
    // Helper function to count occurrences
    const countOccurrences = (items: string[]) => {
      const counts: Record<string, number> = {}
      items.forEach(item => {
        counts[item] = (counts[item] || 0) + 1
      })
      return counts
    }

    // Source
    const sources = ['meteor-platform'] // All current debates are from meteor platform
    const sourceCounts = { 'meteor-platform': debates.length }

    // Topics/Categories
    const categories = debates.map(d => d.metadata.topic.category).filter(Boolean)
    const categoryCounts = countOccurrences(categories)

    // Tags
    const allTags = debates.flatMap(d => d.metadata.topic.tags)
    const tagCounts = countOccurrences(allTags)

    // Participants
    const allParticipants = debates.flatMap(d => 
      Object.values(d.participants)
        .filter(p => p.type === 'human')
        .map(p => p.name.toLowerCase())
    )
    const participantCounts = countOccurrences(allParticipants)

    // Format analysis
    const formats: string[] = []
    debates.forEach(debate => {
      const participants = Object.values(debate.participants).filter(p => p.type === 'human')
      const hasHonest = participants.some(p => p.role === 'honest')
      const hasDishonest = participants.some(p => p.role === 'dishonest')
      
      if (hasHonest && hasDishonest) {
        formats.push('honest-dishonest')
      }
      
      // Check for self-debate (same name different roles)
      const names = participants.map(p => p.name)
      if (names.length !== new Set(names).size) {
        formats.push('self-debate')
      }
      
      // Check for role reversal (same participants in different debates with swapped roles)
      const roleKey = participants.map(p => `${p.name}:${p.role}`).sort().join(',')
      if (debates.some(otherDebate => {
        if (otherDebate.metadata.id === debate.metadata.id) return false
        const otherParticipants = Object.values(otherDebate.participants).filter(p => p.type === 'human')
        const otherRoleKey = otherParticipants.map(p => `${p.name}:${p.role}`).sort().join(',')
        
        // Check if same participants with different roles
        const thisNames = participants.map(p => p.name).sort()
        const otherNames = otherParticipants.map(p => p.name).sort()
        return JSON.stringify(thisNames) === JSON.stringify(otherNames) && roleKey !== otherRoleKey
      })) {
        formats.push('role-reversal')
      }
    })
    const formatCounts = countOccurrences(formats)

    // Complexity based on node count
    const complexities: string[] = []
    debates.forEach(debate => {
      const nodeCount = debate.analytics?.totalNodes || 0
      if (nodeCount < 5) complexities.push('simple')
      else if (nodeCount < 10) complexities.push('moderate')
      else complexities.push('complex')
    })
    const complexityCounts = countOccurrences(complexities)

    return [
      {
        id: 'source',
        label: 'Source',
        icon: '🗂️',
        items: Object.entries(sourceCounts).map(([value, count]) => ({
          value,
          label: value === 'meteor-platform' ? 'Meteor Platform' : value,
          count
        }))
      },
      {
        id: 'topic',
        label: 'Topics',
        icon: '📝',
        items: [
          ...Object.entries(categoryCounts).map(([value, count]) => ({
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
            count
          })),
          ...Object.entries(tagCounts)
            .filter(([tag]) => !categories.includes(tag)) // Don't duplicate categories
            .sort(([, a], [, b]) => b - a) // Sort by count
            .slice(0, 15) // Limit to top 15 tags
            .map(([value, count]) => ({
              value,
              label: value.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
              count
            }))
        ].sort((a, b) => b.count - a.count)
      },
      {
        id: 'participants',
        label: 'Participants',
        icon: '👥',
        items: Object.entries(participantCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([value, count]) => ({
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
            count
          }))
      },
      {
        id: 'format',
        label: 'Format',
        icon: '⚖️',
        items: Object.entries(formatCounts).map(([value, count]) => ({
          value,
          label: value.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          count
        }))
      },
      {
        id: 'complexity',
        label: 'Complexity',
        icon: '📊',
        items: Object.entries(complexityCounts).map(([value, count]) => ({
          value,
          label: value.charAt(0).toUpperCase() + value.slice(1),
          count
        }))
      }
    ]
  }, [debates])

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const handleFilterToggle = (category: string, value: string) => {
    const currentValues = activeFilters[category] || []
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]
    
    onFilterChange(category, newValues)
  }

  const getFilteredItems = (category: FilterCategory) => {
    const searchTerm = searchTerms[category.id]?.toLowerCase() || ''
    if (!searchTerm) return category.items
    
    return category.items.filter(item => 
      item.label.toLowerCase().includes(searchTerm) ||
      item.value.toLowerCase().includes(searchTerm)
    )
  }

  const updateSearchTerm = (categoryId: string, term: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [categoryId]: term
    }))
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {Object.values(activeFilters).some(values => values.length > 0) && (
          <button
            onClick={() => onFilterChange('', [])}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filterCategories.map((category) => {
          const isExpanded = expandedCategories.has(category.id)
          const activeValues = activeFilters[category.id] || []
          const filteredItems = getFilteredItems(category)

          return (
            <div key={category.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex items-center justify-between w-full text-left py-2 hover:bg-gray-50 rounded-md px-2"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{category.icon}</span>
                  <span className="font-medium text-gray-900">{category.label}</span>
                  {activeValues.length > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                      {activeValues.length}
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-2 pl-2">
                  {/* Search within category */}
                  {category.items.length > 8 && (
                    <div className="relative mb-3">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <Search className="h-3 w-3 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        className="block w-full pl-7 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Search ${category.label.toLowerCase()}...`}
                        value={searchTerms[category.id] || ''}
                        onChange={(e) => updateSearchTerm(category.id, e.target.value)}
                      />
                      {searchTerms[category.id] && (
                        <button
                          onClick={() => updateSearchTerm(category.id, '')}
                          className="absolute inset-y-0 right-0 pr-2 flex items-center"
                        >
                          <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Filter items */}
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {filteredItems.map((item) => (
                      <label
                        key={item.value}
                        className="flex items-center space-x-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={activeValues.includes(item.value)}
                          onChange={() => handleFilterToggle(category.id, item.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {item.count}
                        </span>
                      </label>
                    ))}
                    
                    {filteredItems.length === 0 && searchTerms[category.id] && (
                      <p className="text-sm text-gray-500 py-2 px-2">
                        No matches found for "{searchTerms[category.id]}"
                      </p>
                    )}
                  </div>

                  {/* Show more button for large categories */}
                  {!searchTerms[category.id] && category.items.length > filteredItems.length && (
                    <button
                      onClick={() => updateSearchTerm(category.id, '')}
                      className="text-sm text-blue-600 hover:text-blue-500 mt-2 px-2"
                    >
                      Show all {category.items.length} items
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick stats */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Library Stats</h3>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Total Debates:</span>
            <span className="font-medium">{debates.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Unique Participants:</span>
            <span className="font-medium">
              {new Set(debates.flatMap(d => 
                Object.values(d.participants)
                  .filter(p => p.type === 'human')
                  .map(p => p.name.toLowerCase())
              )).size}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Topics Covered:</span>
            <span className="font-medium">
              {new Set(debates.flatMap(d => d.metadata.topic.tags)).size}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}