
import React from 'react';
import { Button } from './Button';

interface LoadProjectButtonProps {
  onLoadProject: () => void;
}

export const FileUploadButton: React.FC<LoadProjectButtonProps> = ({ onLoadProject }) => {
  return (
    <Button onClick={onLoadProject} variant="primary" className="w-full text-lg py-3">
      <span role="img" aria-label="folder-open" className="mr-2">📂</span> Load Project & Start
    </Button>
  );
};
