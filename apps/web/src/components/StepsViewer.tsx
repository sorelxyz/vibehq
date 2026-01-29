import { useState } from 'react';
import type { Step } from '@vibehq/shared';

interface StepsViewerProps {
  steps: Step[];
}

export default function StepsViewer({ steps }: StepsViewerProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const inProgressCount = steps.filter(s => s.status === 'in_progress').length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  if (steps.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-neutral-500">
        No steps available. Steps will be parsed from the PRD when generated.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600 dark:text-neutral-400">
          <span>Progress</span>
          <span>
            {completedCount} of {totalCount} completed
            {inProgressCount > 0 && ` (${inProgressCount} in progress)`}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {steps.map((step) => {
          const isExpanded = expandedSteps.has(step.id);

          return (
            <div
              key={step.id}
              className="border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleStep(step.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                {/* Status Indicator */}
                <div className="flex-shrink-0">
                  {step.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-neutral-600" />
                  )}
                  {step.status === 'in_progress' && (
                    <div className="w-5 h-5 relative">
                      <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </div>
                  )}
                  {step.status === 'completed' && (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Step Title */}
                <div className="flex-1 min-w-0">
                  <span className={`font-medium ${
                    step.status === 'completed'
                      ? 'text-gray-500 dark:text-neutral-500 line-through'
                      : step.status === 'in_progress'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-neutral-100'
                  }`}>
                    {step.id}. {step.title}
                  </span>
                </div>

                {/* Expand/Collapse Icon */}
                <svg
                  className={`w-5 h-5 text-gray-400 dark:text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded Description */}
              {isExpanded && step.description && (
                <div className="px-4 pb-4 pt-0">
                  <div className="pl-8 text-sm text-gray-600 dark:text-neutral-400 whitespace-pre-wrap">
                    {step.description}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
