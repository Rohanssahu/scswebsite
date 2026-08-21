import React, { useRef, useState } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { UploadedFileMeta } from '@/types/projectAnalysis';

interface FileDropzoneProps {
  files: UploadedFileMeta[];
  onChange: (files: UploadedFileMeta[]) => void;
  /**
   * When provided, added files are handed to the parent as raw File objects
   * (for AI reading/auto-fill) instead of being merged here. Removal still
   * goes through onChange.
   */
  onRawFiles?: (files: File[]) => void;
  /** True when uploaded documents are read by the AI backend. */
  aiEnabled?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FileDropzone = ({ files, onChange, onRawFiles, aiEnabled = false }: FileDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const fresh = Array.from(list).filter((f) => !files.some((existing) => existing.name === f.name));
    if (!fresh.length) return;
    if (onRawFiles) {
      onRawFiles(fresh);
      return;
    }
    const metas = fresh.map((f) => ({ name: f.name, size: f.size }));
    onChange([...files, ...metas].slice(0, 5));
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={aiEnabled ? 'Add reference documents to read and auto-fill your answers' : 'Add reference files (demo only, nothing is uploaded)'}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver ? 'border-pink-500 bg-pink-50' : 'border-gray-300 bg-gray-50 hover:border-pink-400'
        }`}
      >
        <UploadCloud className="mb-2 h-8 w-8 text-pink-600" aria-hidden="true" />
        <p className="text-sm font-medium text-gray-700">Drag & drop documents, designs or screenshots</p>
        <p className="mt-1 text-xs text-gray-500">or click to browse (max 5 files)</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {aiEnabled ? (
        <p className="mt-2 text-xs font-medium text-gray-500">
          PDF and text documents are read securely to auto-fill and improve your analysis.
        </p>
      ) : (
        <p className="mt-2 text-xs font-medium text-amber-700">Demo only — your file is not being uploaded.</p>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file) => (
            <li
              key={file.name}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileIcon className="h-4 w-4 shrink-0 text-pink-600" aria-hidden="true" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-gray-500">{formatSize(file.size)}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((f) => f.name !== file.name))}
                className="ml-2 rounded p-1 text-gray-500 hover:bg-pink-50 hover:text-gray-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FileDropzone;
