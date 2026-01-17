import { useState, useRef } from 'react';
import type { TicketImage } from '@vibehq/shared';
import ConfirmDialog from './ConfirmDialog';

interface ImageUploadProps {
  ticketId: string;
  images: TicketImage[];
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
  isUploading?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageUpload({ ticketId, images, onUpload, onDelete, isUploading }: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(f => f.type.startsWith('image/'));
    if (imageFile) {
      onUpload(imageFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = '';
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteImageId) {
      onDelete(deleteImageId);
      setDeleteImageId(null);
    }
  };

  const imageToDelete = images.find(img => img.id === deleteImageId);

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        {isUploading ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-gray-600 dark:text-neutral-400">Uploading...</span>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 mx-auto text-gray-500 dark:text-neutral-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-600 dark:text-neutral-400">
              Drop images here or click to upload
            </p>
            <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
              JPG, PNG, GIF, WebP up to 10MB
            </p>
          </>
        )}
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative bg-gray-200 dark:bg-neutral-800 rounded-lg overflow-hidden"
            >
              <a
                href={`/uploads/${image.storagePath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-video"
              >
                <img
                  src={`/uploads/${image.storagePath}`}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                />
              </a>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                <div className="flex-1 p-2">
                  <p className="text-xs text-white truncate" title={image.filename}>
                    {image.filename}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {formatFileSize(image.size)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteImageId(image.id);
                  }}
                  className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  aria-label="Delete image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        title="Delete Image"
        message={`Are you sure you want to delete "${imageToDelete?.filename}"?`}
        confirmLabel="Delete"
        isOpen={!!deleteImageId}
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteImageId(null)}
      />
    </div>
  );
}
