/**
 * Typing Indicator Component
 * Animated dots showing AI is thinking
 * @module components/TypingIndicator
 */

import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg rounded-bl-none px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span
            className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
          />
          <span
            className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
          />
          <span
            className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
          />
        </div>
      </div>
    </div>
  );
}
