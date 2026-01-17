import { useEffect, useRef } from 'react';

interface RalphLogViewerProps {
  logs: string;
  status: string | null;
  isConnected: boolean;
  error: string | null;
}

export default function RalphLogViewer({ logs, status, isConnected, error }: RalphLogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span className="text-sm text-gray-600 dark:text-neutral-400">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {status && (
          <span className={`ml-auto text-sm px-2 py-0.5 rounded ${
            status === 'running' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300' :
            status === 'completed' ? 'bg-green-500/20 text-green-600 dark:text-green-300' :
            status === 'failed' ? 'bg-red-500/20 text-red-600 dark:text-red-300' :
            'bg-gray-200 dark:bg-neutral-500/20 text-gray-600 dark:text-neutral-300'
          }`}>
            {status}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="px-3 py-2 bg-red-100 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Log content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 whitespace-pre-wrap"
      >
        {logs || 'Waiting for logs...'}
      </div>
    </div>
  );
}
