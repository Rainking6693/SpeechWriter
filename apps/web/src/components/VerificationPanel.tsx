'use client'

import React, { useState } from 'react'
import { 
  AlertCircle, 
  CheckCircle, 
  ExternalLink, 
  AlertTriangle, 
  Info,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface VerificationItem {
  id: string
  text: string
  issue: string
  suggestion: string
  severity?: 'critical' | 'high' | 'medium' | 'low'
  acknowledged: boolean
  position?: { start: number; end: number }
  links?: string[]
  instances?: Array<{ text: string; start: number; end: number }>
}

interface VerificationSection {
  name: string
  type: 'RISK_ASSESSMENT' | 'FACT_CHECK' | 'CONTENT_QUALITY'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  items: VerificationItem[]
}

interface VerificationPanelProps {
  title: string
  requiresAction: boolean
  sections: VerificationSection[]
  onItemAcknowledge: (itemId: string, acknowledged: boolean) => void
  onClose?: () => void
  exportBlocked?: boolean
}

export function VerificationPanel({
  title,
  requiresAction,
  sections,
  onItemAcknowledge,
  onClose,
  exportBlocked = false
}: VerificationPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.filter(s => s.priority === 'HIGH').map(s => s.name))
  )
  
  const [acknowledgedItems, setAcknowledgedItems] = useState<Set<string>>(new Set())
  
  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName)
    } else {
      newExpanded.add(sectionName)
    }
    setExpandedSections(newExpanded)
  }
  
  const handleItemAcknowledge = (itemId: string, acknowledged: boolean) => {
    const newAcknowledged = new Set(acknowledgedItems)
    if (acknowledged) {
      newAcknowledged.add(itemId)
    } else {
      newAcknowledged.delete(itemId)
    }
    setAcknowledgedItems(newAcknowledged)
    onItemAcknowledge(itemId, acknowledged)
  }
  
  const getSeverityIcon = (severity: string = 'medium') => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case 'medium':
        return <Info className="h-5 w-5 text-yellow-500" />
      case 'low':
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }
  
  const getSeverityBorder = (severity: string = 'medium') => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500'
      case 'high':
        return 'border-l-orange-500'
      case 'medium':
        return 'border-l-yellow-500'
      case 'low':
        return 'border-l-blue-500'
      default:
        return 'border-l-gray-300'
    }
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-50 border-red-200'
      case 'MEDIUM':
        return 'bg-yellow-50 border-yellow-200'
      case 'LOW':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }
  
  const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0)
  const acknowledgedCount = acknowledgedItems.size
  const allAcknowledged = totalItems > 0 && acknowledgedCount === totalItems
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {totalItems} items require review • {acknowledgedCount} acknowledged
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {exportBlocked && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-800 font-medium">Export Blocked</span>
              </div>
              <p className="text-red-700 text-sm mt-1">
                Address critical issues before exporting your speech.
              </p>
            </div>
          )}
          
          {requiresAction && !exportBlocked && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-yellow-800 font-medium">Review Required</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                Please review and acknowledge flagged content before proceeding.
              </p>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        {totalItems > 0 && (
          <div className="px-6 py-2 bg-gray-50 border-b">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{acknowledgedCount} / {totalItems}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(acknowledgedCount / totalItems) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-6">
          {sections.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Issues Found
              </h3>
              <p className="text-gray-600">
                Your speech looks great! No fact-checking or content issues detected.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.name} className={`border rounded-lg ${getPriorityColor(section.priority)}`}>
                  <button
                    onClick={() => toggleSection(section.name)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-opacity-50"
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{section.name}</span>
                      <span className="ml-2 px-2 py-1 text-xs font-medium bg-white rounded-full">
                        {section.items.length}
                      </span>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                        section.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                        section.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {section.priority}
                      </span>
                    </div>
                    {expandedSections.has(section.name) ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                  
                  {expandedSections.has(section.name) && (
                    <div className="border-t bg-white">
                      {section.items.map((item) => (
                        <VerificationItem
                          key={item.id}
                          item={item}
                          acknowledged={acknowledgedItems.has(item.id)}
                          onAcknowledge={(acknowledged) => handleItemAcknowledge(item.id, acknowledged)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {allAcknowledged ? (
                <span className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  All items acknowledged
                </span>
              ) : (
                <span>
                  {totalItems - acknowledgedCount} items remaining
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!allAcknowledged && requiresAction}
                className={`px-4 py-2 rounded-md font-medium ${
                  allAcknowledged || !requiresAction
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function VerificationItem({
  item,
  acknowledged,
  onAcknowledge
}: {
  item: VerificationItem
  acknowledged: boolean
  onAcknowledge: (acknowledged: boolean) => void
}) {
  const getSeverityIcon = (severity: string = 'medium') => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'medium':
        return <Info className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }
  
  const getSeverityBorder = (severity: string = 'medium') => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500'
      case 'high':
        return 'border-l-orange-500'
      case 'medium':
        return 'border-l-yellow-500'
      case 'low':
        return 'border-l-blue-500'
      default:
        return 'border-l-gray-300'
    }
  }
  
  return (
    <div className={`p-4 border-l-4 ${getSeverityBorder(item.severity)} ${acknowledged ? 'bg-green-50' : 'bg-white'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            {getSeverityIcon(item.severity)}
            <span className="ml-2 font-medium text-gray-900 truncate">
              {item.text}
            </span>
          </div>
          
          <p className="text-sm text-red-600 mb-2">{item.issue}</p>
          <p className="text-sm text-gray-600 mb-3">{item.suggestion}</p>
          
          {item.links && item.links.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Verification links:</p>
              <div className="flex flex-wrap gap-2">
                {item.links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Source {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {item.instances && item.instances.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">
                {item.instances.length} instance{item.instances.length !== 1 ? 's' : ''} found:
              </p>
              <div className="text-xs text-gray-600 space-y-1">
                {item.instances.slice(0, 3).map((instance, index) => (
                  <div key={index} className="truncate">
                    "{instance.text}"
                  </div>
                ))}
                {item.instances.length > 3 && (
                  <div className="text-gray-500">
                    +{item.instances.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => onAcknowledge(!acknowledged)}
            className={`px-3 py-1 text-sm rounded-full font-medium ${
              acknowledged
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {acknowledged ? 'Acknowledged' : 'Acknowledge'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VerificationPanel