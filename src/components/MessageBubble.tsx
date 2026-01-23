/**
 * Message Bubble Component
 * Displays individual chat messages with user/assistant styling
 * @module components/MessageBubble
 */

import { useState } from 'react';
import { User, Bot, Copy, ChevronDown, ChevronUp, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { KPICard } from './KPICard';
import { ReasoningSteps } from './ReasoningSteps';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
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
          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-0 prose-p:my-2">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
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
