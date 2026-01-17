import { useState } from 'react';

interface PRDEditorProps {
  content: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function PRDEditor({ content, onSave, onCancel, isSaving }: PRDEditorProps) {
  const [editContent, setEditContent] = useState(content);

  const handleSave = () => {
    if (!editContent.trim()) return;
    onSave(editContent);
  };

  return (
    <div className="flex flex-col h-full">
      <textarea
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        className="flex-1 w-full min-h-[300px] p-3 bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg font-mono text-sm text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        placeholder="Enter PRD content in markdown..."
        autoFocus
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-500 dark:text-neutral-500">
          {editContent.length} characters
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !editContent.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
