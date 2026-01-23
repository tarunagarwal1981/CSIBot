/**
 * KPI Card Component
 * Displays KPI data with benchmark comparison and trend visualization
 * @module components/KPICard
 */

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface KPIData {
  kpi: string;
  value: any;
  table: string;
}

interface KPICardProps {
  data: KPIData;
  benchmark?: {
    average: number;
    median: number;
    p75: number;
    p90: number;
  };
  trend?: {
    current: number;
    previous: number;
    change: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  history?: Array<{ date: string; value: number }>;
}

export function KPICard({ data, benchmark, trend, history }: KPICardProps) {
  const [expanded, setExpanded] = useState(false);
  const value = typeof data.value === 'number' ? data.value : parseFloat(data.value) || 0;

  // Determine color based on value vs benchmark
  const getColorClass = () => {
    if (!benchmark) return 'blue';
    if (value >= benchmark.p75) return 'green';
    if (value >= benchmark.median) return 'yellow';
    return 'red';
  };

  const colorClass = getColorClass();
  const colorMap = {
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      value: 'text-green-600 dark:text-green-400',
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-700 dark:text-yellow-300',
      value: 'text-yellow-600 dark:text-yellow-400',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      value: 'text-red-600 dark:text-red-400',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      value: 'text-blue-600 dark:text-blue-400',
    },
  };

  const colors = colorMap[colorClass as keyof typeof colorMap] || colorMap.blue;

  // Get trend icon
  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div
      className={`${colors.bg} ${colors.border} border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
        expanded ? 'col-span-full' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className={`font-semibold ${colors.text} text-sm`}>{data.kpi}</div>
          <div className={`${colors.value} text-lg font-bold mt-1`}>
            {typeof value === 'number' ? value.toFixed(2) : value}
          </div>
          {benchmark && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              vs Fleet Avg: {benchmark.average.toFixed(2)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {trend && getTrendIcon()}
          {history && history.length > 0 && (
            <button className="text-gray-400 hover:text-gray-600">
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {benchmark && (
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Median:</span>
                <span className="font-semibold">{benchmark.median.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">75th Percentile:</span>
                <span className="font-semibold">{benchmark.p75.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">90th Percentile:</span>
                <span className="font-semibold">{benchmark.p90.toFixed(2)}</span>
              </div>
            </div>
          )}

          {trend && (
            <div className="text-xs space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Previous:</span>
                <span className="font-semibold">{trend.previous.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Change:</span>
                <span
                  className={`font-semibold ${
                    trend.change > 0 ? 'text-green-600' : trend.change < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}
                >
                  {trend.change > 0 ? '+' : ''}
                  {trend.change.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Trend:</span>
                <span className="font-semibold capitalize">{trend.trend}</span>
              </div>
            </div>
          )}

          {history && history.length > 0 && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Historical Trend
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={history}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number) => value.toFixed(2)}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={colors.value}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
            Source: {data.table}
          </div>
        </div>
      )}
    </div>
  );
}
