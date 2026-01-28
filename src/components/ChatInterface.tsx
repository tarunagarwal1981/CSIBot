/**
 * Chat Interface Component
 * Main chatbot UI for crew performance queries
 * @module components/ChatInterface
 */

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, Loader, RotateCw, Trash2, Download } from 'lucide-react';
import { MessageBubble, type Message } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import type { StructuredChatResponse } from '../types/chatResponse';

/**
 * Format structured response for display
 */
function formatStructuredForDisplay(structured: any): string {
  if (!structured) return '';
  
  const parts: string[] = [];
  
  // Summary
  parts.push(structured.summary);
  parts.push('');
  
  // Key findings
  if (structured.keyFindings?.length > 0) {
    parts.push('**Key Findings:**');
    structured.keyFindings.forEach((f: any) => {
      const icon = f.severity === 'positive' ? '✅' : 
                   f.severity === 'concern' ? '⚠️' :
                   f.severity === 'critical' ? '🚨' : '•';
      parts.push(`${icon} ${f.finding}`);
    });
    parts.push('');
  }
  
  // Risk indicators
  if (structured.riskIndicators?.length > 0) {
    parts.push('**Risk Assessment:**');
    structured.riskIndicators.forEach((r: any) => {
      parts.push(`${r.severity} - ${r.riskType}: ${r.description}`);
    });
    parts.push('');
  }
  
  // Actions
  if (structured.recommendedActions?.length > 0) {
    parts.push('**Recommended Actions:**');
    structured.recommendedActions.forEach((a: any, i: number) => {
      parts.push(`${i + 1}. ${a}`);
    });
  }
  
  return parts.join('\n');
}

/**
 * Main Chat Interface Component
 */
export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('chatSessionId');
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Send message to chat API
   */
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Get API URL from environment or use default
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const userId = localStorage.getItem('userId') || 'anonymous';

      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: sessionId,
          userId: userId,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        // Log full error details
        console.error('Full server error response:', JSON.stringify(errorData, null, 2));
        
        // Include more details from the error response - check all possible fields
        const errorMessage = errorData.message || errorData.error || errorData.details || errorData.stack || `Server error: ${response.status}`;
        const fullError = errorData.stack ? `${errorMessage}\n\nStack trace:\n${errorData.stack}` : errorMessage;
        
        console.error('Server error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData: JSON.stringify(errorData, null, 2),
        });
        
        // Show full error details in the UI
        throw new Error(fullError);
      }

      const data = await response.json();

      // Update session ID if returned
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('chatSessionId', data.sessionId);
      }

      // Extract the text response (not the structured JSON)
      let displayContent: string | object = data.response;
      let structuredData = data.structuredResponse;

      // Check if response is an object (already parsed JSON) or a JSON string
      if (typeof displayContent === 'object' && displayContent !== null) {
        // If response is already an object with structured data
        if ('summary' in displayContent || 'keyFindings' in displayContent) {
          // Use it as structured data if we don't have one already
          if (!structuredData) {
            structuredData = displayContent as StructuredChatResponse;
          }
          // Format for display
          displayContent = formatStructuredForDisplay(structuredData || displayContent as StructuredChatResponse);
        } else {
          // Convert object to string for display
          displayContent = JSON.stringify(displayContent, null, 2);
        }
      } else if (typeof displayContent === 'string' && displayContent.trim().startsWith('{')) {
        // If response is a JSON string, parse it
        try {
          const parsed = JSON.parse(displayContent);
          // If we have structuredResponse from API, use it
          if (data.structuredResponse) {
            structuredData = data.structuredResponse;
            displayContent = formatStructuredForDisplay(data.structuredResponse);
          } 
          // If parsed JSON has the structure we expect, create structuredData
          else if (parsed.summary || parsed.keyFindings) {
            structuredData = parsed;
            displayContent = formatStructuredForDisplay(parsed);
          } 
          // Fallback: just extract summary
          else {
            displayContent = parsed.summary || displayContent;
          }
        } catch (e) {
          console.error('Failed to parse JSON response:', e);
          // Use as-is if parsing fails
        }
      }
      // If we have structuredResponse but response is already formatted text
      else if (data.structuredResponse && typeof displayContent === 'string' && !displayContent.includes('**Key Findings:**')) {
        displayContent = formatStructuredForDisplay(data.structuredResponse);
        structuredData = data.structuredResponse;
      }

      // Ensure displayContent is a string for the Message interface
      const finalContent = typeof displayContent === 'string' ? displayContent : JSON.stringify(displayContent, null, 2);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: finalContent,
        timestamp: data.timestamp || new Date().toISOString(),
        structuredData: structuredData, // Store for enhanced display
        dataSources: data.dataSources,
        reasoningSteps: data.reasoningSteps,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message. Please try again.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please try again.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear conversation
   */
  const clearConversation = () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      setMessages([]);
      setSessionId(null);
      localStorage.removeItem('chatSessionId');
      setError(null);
    }
  };

  /**
   * Export chat history
   */
  const exportChatHistory = () => {
    const chatData = {
      sessionId,
      exportedAt: new Date().toISOString(),
      messages,
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${sessionId || 'export'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Regenerate last response
   */
  const regenerateResponse = async () => {
    if (messages.length === 0) return;

    // Find last user message
    const lastUserMessageIndex = messages
      .map((m, idx) => (m.role === 'user' ? idx : -1))
      .filter((idx) => idx !== -1)
      .pop();

    if (lastUserMessageIndex === undefined) return;

    // Remove last assistant message if exists
    const newMessages = messages.slice(0, lastUserMessageIndex + 1);
    setMessages(newMessages);

    // Resend last user message
    setInput(messages[lastUserMessageIndex].content);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  /**
   * Quick action handlers
   */
  const quickActions = [
    {
      label: 'High Risk Crew',
      query: 'Show me high-risk crew members',
    },
    {
      label: 'Expiring Certifications',
      query: 'Who needs training certification renewal?',
    },
    {
      label: 'Performance Summary',
      query: 'Generate a performance summary for crew member',
    },
    {
      label: 'KPI Trends',
      query: 'Show me KPI trends for the last 6 months',
    },
  ];

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Crew Performance Assistant
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ask questions about crew performance, KPIs, and insights
          </p>
        </div>
        <div className="flex gap-2">
          {messages.length > 0 && (
            <>
              <button
                onClick={regenerateResponse}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                title="Regenerate last response"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button
                onClick={exportChatHistory}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                title="Export chat history"
              >
                <Download className="w-5 h-5" />
              </button>
            </>
          )}
          <button
            onClick={clearConversation}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="Clear conversation"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot className="w-16 h-16 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Welcome to Crew Performance Assistant
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
              Ask me anything about crew performance, KPIs, risk analysis, or get insights
              about specific crew members.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg w-full">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(action.query)}
                  className="text-left px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <MessageBubble key={idx} message={message} />
        ))}

        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
        {/* Quick Actions */}
        {messages.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => setInput(action.query)}
                className="text-xs px-3 py-1 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Input Box */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about crew performance, KPIs, or get insights..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          {sessionId ? (
            <span>Session: {sessionId.substring(0, 8)}...</span>
          ) : (
            <span>Starting new session...</span>
          )}
        </div>
      </div>
    </div>
  );
}
