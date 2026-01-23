/**
 * Crew Card Component
 * Compact crew member display with key information
 * @module components/CrewCard
 */

import { useState } from 'react';
import { User, Ship, Award } from 'lucide-react';

interface CrewInfo {
  seafarer_id: number;
  seafarer_name: string;
  crew_code: string;
  current_rank_name: string;
  sailing_status?: 'atsea' | 'onleave';
  department_name?: string;
  email_id?: string;
}

interface CrewCardProps {
  crew: CrewInfo;
  onClick?: () => void;
  showDetails?: boolean;
}

export function CrewCard({ crew, onClick, showDetails = false }: CrewCardProps) {
  const [expanded] = useState(showDetails);

  const statusColor =
    crew.sailing_status === 'atsea'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  const statusText = crew.sailing_status === 'atsea' ? 'At Sea' : 'On Leave';

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {crew.seafarer_name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {crew.crew_code}
              </p>
            </div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
            >
              {statusText}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Award className="w-3 h-3" />
              <span>{crew.current_rank_name}</span>
            </div>
            {crew.department_name && (
              <div className="flex items-center gap-1">
                <Ship className="w-3 h-3" />
                <span>{crew.department_name}</span>
              </div>
            )}
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2 text-xs">
              {crew.email_id && (
                <div className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Email:</span> {crew.email_id}
                </div>
              )}
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">ID:</span> {crew.seafarer_id}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Crew Card Compact Variant
 * Smaller version for inline display in chat
 */
export function CrewCardCompact({ crew }: { crew: CrewInfo }) {
  const statusColor =
    crew.sailing_status === 'atsea'
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';

  return (
    <div
      className={`${statusColor} border rounded-lg px-3 py-2 text-xs inline-block`}
    >
      <div className="font-semibold text-gray-700 dark:text-gray-300">
        {crew.seafarer_name}
      </div>
      <div className="text-gray-600 dark:text-gray-400">
        {crew.crew_code} • {crew.current_rank_name}
      </div>
    </div>
  );
}
