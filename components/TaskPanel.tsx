
import React from 'react';
import { Button } from './Button';
import { TaskId, TaskType } from '../types';

interface TaskPanelProps {
  onTaskExecute: (taskType: TaskType) => void;
  isLoading: boolean;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({ onTaskExecute, isLoading }) => {
  return (
    <div className="mt-auto pt-4 border-t border-slate-700">
      <h3 className="text-md font-semibold mb-3 text-sky-400">AI Actions:</h3>
      <div className="space-y-2">
        <Button
          onClick={() => onTaskExecute(TaskId.ANALYZE_IMPROVE)}
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full"
          variant="primary"
        >
         <span role="img" aria-label="sparkles" className="mr-2">✨</span> Analyze & Suggest Improvements
        </Button>
        <Button
          onClick={() => onTaskExecute(TaskId.GENERATE_TESTS)}
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full"
          variant="secondary"
        >
         <span role="img" aria-label="test-tube" className="mr-2">🧪</span> Generate Unit Tests
        </Button>
      </div>
    </div>
  );
};
