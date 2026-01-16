interface PRDViewerProps {
  content: string;
  onEdit?: () => void;
}

function renderMarkdown(content: string): string {
  let html = content
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-neutral-800 p-3 rounded-lg overflow-x-auto my-3"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-neutral-800 px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Checkboxes
    .replace(/^- \[ \] (.+)$/gm, '<div class="flex items-start gap-2 my-1"><span class="w-4 h-4 mt-0.5 border border-neutral-600 rounded flex-shrink-0"></span><span>$1</span></div>')
    .replace(/^- \[x\] (.+)$/gim, '<div class="flex items-start gap-2 my-1"><span class="w-4 h-4 mt-0.5 bg-green-600 rounded flex-shrink-0 flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></span><span class="line-through text-neutral-500">$1</span></div>')
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks for paragraphs
    .replace(/\n\n/g, '</p><p class="my-2">')
    // Single line breaks
    .replace(/\n/g, '<br/>');

  return `<p class="my-2">${html}</p>`;
}

export default function PRDViewer({ content, onEdit }: PRDViewerProps) {
  return (
    <div className="relative">
      {onEdit && (
        <button
          onClick={onEdit}
          className="absolute top-2 right-2 text-sm text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 bg-neutral-800/80 rounded"
        >
          Edit
        </button>
      )}
      <div
        className="prose prose-invert max-w-none text-neutral-300 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </div>
  );
}
