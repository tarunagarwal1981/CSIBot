/**
 * Reasoning Steps Component
 * Collapsible section showing AI reasoning process
 * @module components/ReasoningSteps
 */

import { ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { useState } from 'react';

interface ReasoningStepsProps {
  steps: string[];
  defaultExpanded?: boolean;
}

export function ReasoningSteps({ steps, defaultExpanded = false }: ReasoningStepsProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Reasoning Steps ({steps.length})
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
          <ol className="list-decimal list-inside space-y-2 text-xs text-gray-600 dark:text-gray-400">
            {steps.map((step, idx) => (
              <li key={idx} className="leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
