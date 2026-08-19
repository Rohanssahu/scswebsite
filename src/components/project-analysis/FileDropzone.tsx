import React, { useRef, useState } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { UploadedFileMeta } from '@/types/projectAnalysis';

interface FileDropzoneProps {
  files: UploadedFileMeta[];
  onChange: (files: UploadedFileMeta[]) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * UI-only upload control. Only file names/sizes are kept in memory —
 * nothing is read or transmitted anywhere.
 */
const FileDropzone = ({ files, onChange }: FileDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const metas = Array.from(list).map((f) => ({ name: f.name, size: f.size }));
    const merged = [...files, ...metas.filter((m) => !files.some((f) => f.name === m.name))];
    onChange(merged.slice(0, 5));
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Add reference files (demo only, nothing is uploaded)"
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

      <p className="mt-2 text-xs font-medium text-amber-700">Demo only — your file is not being uploaded.</p>

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
