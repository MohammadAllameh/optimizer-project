
import React from 'react';

interface CodeViewProps {
  code: string;
  language: string;
}

export const CodeView: React.FC<CodeViewProps> = ({ code, language }) => {
  // In a real app, use a library like Prism.js or Monaco Editor for syntax highlighting.
  // For this demo, we'll use a simple <pre> tag.
  return (
    <pre className="text-sm whitespace-pre-wrap overflow-x-auto text-slate-200">
      <code className={`language-${language}`}>
        {code.trim()}
      </code>
    </pre>
  );
};
