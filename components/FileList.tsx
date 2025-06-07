
import React from 'react';
import { ProjectFile } from '../types';

interface FileListProps {
  files: ProjectFile[];
  activeIndex: number | null;
  onFileSelect: (index: number) => void;
}

const getFileIcon = (fileName: string): string => {
  if (fileName.endsWith('.py')) return '🐍';
  if (fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return '📜';
  if (fileName.endsWith('.json')) return '{}';
  if (fileName.endsWith('.md')) return '📄';
  return '📁';
}

export const FileList: React.FC<FileListProps> = ({ files, activeIndex, onFileSelect }) => {
  return (
    <ul className="space-y-1">
      {files.map((file, index) => (
        <li key={file.name}>
          <button
            onClick={() => onFileSelect(index)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors duration-150 ease-in-out flex items-center
              ${activeIndex === index
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
          >
            <span className="mr-2 text-lg">{getFileIcon(file.name)}</span>
            <span className="truncate">{file.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};
