/**
 * Message Bubble Component
 * Displays individual chat messages with user/assistant styling
 * @module components/MessageBubble
 */

import { useState } from 'react';
import { User, Bot, Copy, ChevronDown, ChevronUp, Check, AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { KPICard } from './KPICard';
import { ReasoningSteps } from './ReasoningSteps';
import type { StructuredChatResponse } from '../types/chatResponse';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  structuredData?: StructuredChatResponse;
  dataSources?: Array<{ kpi: string; value: any; table: string }>;
  reasoningSteps?: string[];
  timestamp: string;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [showKPICodes, setShowKPICodes] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const toggleFinding = (index: number) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFindings(newExpanded);
  };

  const getSeverityBadge = (severity: 'positive' | 'neutral' | 'concern' | 'critical') => {
    const badges = {
      positive: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: CheckCircle, label: 'Positive' },
      neutral: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: Info, label: 'Neutral' },
      concern: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', icon: AlertTriangle, label: 'Concern' },
      critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: AlertCircle, label: 'Critical' },
    };
    const badge = badges[severity];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getRiskSeverityBadge = (severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    const badges = {
      LOW: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
      MEDIUM: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
      HIGH: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
      CRITICAL: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
    };
    const badge = badges[severity];
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {severity}
      </span>
    );
  };

  const renderStructuredView = (structuredData: StructuredChatResponse) => {
    return (
      <div className="space-y-4">
        {/* Summary Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Summary</h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">{structuredData.summary}</p>
        </div>

        {/* Key Findings */}
        {structuredData.keyFindings && structuredData.keyFindings.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Key Findings</h3>
            <div className="space-y-3">
              {structuredData.keyFindings.map((finding, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-base font-medium text-gray-900 dark:text-white mb-2">
                        {finding.finding}
                      </p>
                      {expandedFindings.has(index) && finding.supportingKPIs.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Supporting KPIs:</p>
                          <div className="flex flex-wrap gap-2">
                            {finding.supportingKPIs.map((kpiCode) => (
                              <span
                                key={kpiCode}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-mono"
                              >
                                {kpiCode}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      {getSeverityBadge(finding.severity)}
                      {finding.supportingKPIs.length > 0 && (
                        <button
                          onClick={() => toggleFinding(index)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        >
                          {expandedFindings.has(index) ? 'Collapse' : 'Expand'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Indicators */}
        {structuredData.riskIndicators && structuredData.riskIndicators.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Risk Indicators</h3>
            <div className="space-y-3">
              {structuredData.riskIndicators.map((risk, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{risk.riskType}</h4>
                    {getRiskSeverityBadge(risk.severity)}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{risk.description}</p>
                  {risk.affectedKPIs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {risk.affectedKPIs.map((kpiCode) => (
                        <span
                          key={kpiCode}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-mono"
                        >
                          {kpiCode}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {structuredData.recommendedActions && structuredData.recommendedActions.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recommended Actions</h3>
            <ol className="list-decimal list-inside space-y-2">
              {structuredData.recommendedActions.map((action, index) => (
                <li key={index} className="text-sm text-gray-700 dark:text-gray-300 pl-2">
                  {action}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Technical Details (KPI Traceability) */}
        {structuredData.kpiTraceability && structuredData.kpiTraceability.length > 0 && (
          <div>
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mb-3"
            >
              {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              View Technical Details
            </button>
            {showTechnicalDetails && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm overflow-x-auto transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">KPI Traceability</h4>
                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={showKPICodes}
                      onChange={(e) => setShowKPICodes(e.target.checked)}
                      className="rounded"
                    />
                    Show Codes
                  </label>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">KPI Name</th>
                        {showKPICodes && (
                          <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Code</th>
                        )}
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Category</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Score</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {structuredData.kpiTraceability.map((kpi, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 px-3 text-gray-900 dark:text-white">{kpi.humanReadableName}</td>
                          {showKPICodes && (
                            <td className="py-2 px-3 font-mono text-gray-600 dark:text-gray-400">{kpi.kpiCode}</td>
                          )}
                          <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{kpi.category}</td>
                          <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                            {kpi.score !== null && kpi.score !== undefined ? kpi.score : 'N/A'}
                          </td>
                          <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{kpi.interpretation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full Analysis */}
        {structuredData.detailedAnalysis && (
          <div>
            {!showFullAnalysis && (
              <button
                onClick={() => setShowFullAnalysis(true)}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                View Full Analysis
              </button>
            )}
            {showFullAnalysis && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm mt-3 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Detailed Analysis</h4>
                  <button
                    onClick={() => setShowFullAnalysis(false)}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Collapse
                  </button>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-0 prose-p:my-2">
                  <ReactMarkdown>{structuredData.detailedAnalysis}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} group`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-lg px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white rounded-bl-none'
          }`}
        >
          {!isUser && message.structuredData ? (
            renderStructuredView(message.structuredData)
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-0 prose-p:my-2">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && (
          <div className="mt-1 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
            {message.reasoningSteps && message.reasoningSteps.length > 0 && (
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {showReasoning ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>Hide Reasoning</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>Show Reasoning</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {!isUser && showReasoning && message.reasoningSteps && (
          <div className="mt-2 w-full">
            <ReasoningSteps steps={message.reasoningSteps} />
          </div>
        )}

        {!isUser && message.dataSources && message.dataSources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 w-full">
            {message.dataSources.map((source, idx) => (
              <KPICard key={idx} data={source} />
            ))}
          </div>
        )}

        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center shadow-sm">
          <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  );
}
