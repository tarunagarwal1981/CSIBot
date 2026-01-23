/**
 * Loading Spinner Component
 * Reusable loading spinner with customizable size and color
 * @module components/LoadingSpinner
 */

import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
  text?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const colorMap = {
  primary: 'text-blue-500',
  white: 'text-white',
  gray: 'text-gray-500',
};

export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-2 ${fullScreen ? 'min-h-screen' : ''}`}>
      <Loader2 className={`${sizeMap[size]} ${colorMap[color]} animate-spin`} />
      {text && (
        <p className={`text-sm ${color === 'white' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Inline Loading Spinner
 * Smaller variant for inline use
 */
export function InlineSpinner({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <Loader2 className={`${sizeMap[size]} text-gray-400 animate-spin inline-block`} />;
}
