/**
 * Message Bubble Component
 * Displays individual chat messages with user/assistant styling
 * @module components/MessageBubble
 */

import React from 'react';
import { Bot, User } from 'lucide-react';
import type { StructuredChatResponse } from '../types/chatResponse';

export interface Message {
  role: 'user' | 'assistant';
  content: string | object; // Allow object for parsed JSON
  timestamp: string;
  structuredData?: StructuredChatResponse;
  dataSources?: Array<{ kpi: string; value: any; table: string }>;
  reasoningSteps?: string[];
}

interface MessageBubbleProps {
  message: Message;
}

/**
 * Render assistant message with proper formatting
 */
function renderAssistantMessage(content: string | object, structuredData?: StructuredChatResponse) {
  // If content is an object, convert it to structured data
  if (typeof content === 'object' && content !== null) {
    const obj = content as any;
    if (obj.summary || obj.keyFindings) {
      // Use it as structured data if we don't have one already
      if (!structuredData) {
        structuredData = obj as StructuredChatResponse;
      }
      return <StructuredMessageView data={structuredData || obj} />;
    }
    // Otherwise convert to string
    content = JSON.stringify(content, null, 2);
  }
  
  // If content is a string and looks like JSON, try to parse it
  if (typeof content === 'string' && content.startsWith('{') && content.includes('"summary"')) {
    try {
      const parsed = JSON.parse(content);
      if (!structuredData && (parsed.summary || parsed.keyFindings)) {
        structuredData = parsed;
        return <StructuredMessageView data={parsed} />;
      }
      content = formatStructuredContent(parsed);
    } catch (e) {
      // If parsing fails, try to extract just the summary
      const summaryMatch = content.match(/"summary":"([^"]+)"/);
      if (summaryMatch) {
        content = summaryMatch[1];
      }
    }
  }

  // If we have structured data, use it for enhanced display
  if (structuredData) {
    return <StructuredMessageView data={structuredData} />;
  }

  // Otherwise, render the text content with markdown-style formatting
  return <div className="prose prose-sm max-w-none dark:prose-invert">
    {formatTextContent(content as string)}
  </div>;
}

/**
 * Format structured JSON content to readable text
 */
function formatStructuredContent(data: any): string {
  const parts: string[] = [];
  
  if (data.summary) {
    parts.push(data.summary);
    parts.push('');
  }
  
  if (data.keyFindings && Array.isArray(data.keyFindings)) {
    parts.push('Key Findings:');
    data.keyFindings.forEach((f: any, i: number) => {
      const icon = f.severity === 'positive' ? '✅' : 
                   f.severity === 'concern' ? '⚠️' : 
                   f.severity === 'critical' ? '🚨' : '•';
      parts.push(`${icon} ${f.finding}`);
    });
    parts.push('');
  }
  
  if (data.riskIndicators && data.riskIndicators.length > 0) {
    parts.push('Risk Assessment:');
    data.riskIndicators.forEach((r: any) => {
      parts.push(`${r.severity} - ${r.riskType}: ${r.description}`);
    });
    parts.push('');
  }
  
  if (data.recommendedActions && data.recommendedActions.length > 0) {
    parts.push('Recommended Actions:');
    data.recommendedActions.forEach((a: any, i: number) => {
      parts.push(`${i + 1}. ${a}`);
    });
  }
  
  return parts.join('\n');
}

/**
 * Format plain text content with basic markdown-like rendering
 */
function formatTextContent(content: string) {
  const lines = content.split('\n');
  
  return lines.map((line, i) => {
    // Bold headers (lines with **)
    if (line.includes('**')) {
      const parts = line.split('**');
      return (
        <p key={i} className="font-semibold mb-1">
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
        </p>
      );
    }
    
    // Empty lines
    if (line.trim() === '') {
      return <div key={i} className="h-2" />;
    }
    
    // List items
    if (line.match(/^[•✅⚠️🚨]\s/)) {
      return <li key={i} className="ml-4 mb-1">{line.substring(2)}</li>;
    }
    
    if (line.match(/^\d+\.\s/)) {
      return <li key={i} className="ml-4 mb-1 list-decimal">{line.substring(line.indexOf('.') + 2)}</li>;
    }
    
    // Regular paragraphs
    return <p key={i} className="mb-2">{line}</p>;
  });
}

/**
 * Structured message view with expandable sections
 */
function StructuredMessageView({ data }: { data: StructuredChatResponse }) {
  const [expandedSection, setExpandedSection] = React.useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 rounded">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          {data.summary}
        </p>
      </div>

      {/* Key Findings */}
      {data.keyFindings && data.keyFindings.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2">Key Findings</h4>
          <div className="space-y-2">
            {data.keyFindings.map((finding, i) => (
              <div
                key={i}
                className={`border-l-4 p-2 rounded text-sm ${
                  finding.severity === 'positive'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : finding.severity === 'concern'
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : finding.severity === 'critical'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <p className="text-gray-800 dark:text-gray-200">{finding.finding}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Indicators */}
      {data.riskIndicators && data.riskIndicators.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2">Risk Assessment</h4>
          <div className="space-y-2">
            {data.riskIndicators.map((risk, i) => (
              <div
                key={i}
                className={`border-l-4 p-2 rounded text-sm ${
                  risk.severity === 'CRITICAL'
                    ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                    : risk.severity === 'HIGH'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : risk.severity === 'MEDIUM'
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                }`}
              >
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {risk.severity} - {risk.riskType}
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{risk.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {data.recommendedActions && data.recommendedActions.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2">Recommended Actions</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {data.recommendedActions.map((action, i) => (
              <li key={i} className="ml-2">{action}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Detailed Analysis (Expandable) */}
      {data.detailedAnalysis && (
        <div>
          <button
            onClick={() => setExpandedSection(expandedSection === 'details' ? null : 'details')}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {expandedSection === 'details' ? '▼ Hide' : '▶ View'} Detailed Analysis
          </button>
          {expandedSection === 'details' && (
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded">
              <p className="whitespace-pre-wrap">{data.detailedAnalysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}
      >
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Message Content */}
      <div
        className={`flex-1 max-w-3xl ${
          isUser ? 'text-right' : 'text-left'
        }`}
      >
        <div
          className={`inline-block px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
          }`}
        >
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            renderAssistantMessage(message.content, message.structuredData)
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
