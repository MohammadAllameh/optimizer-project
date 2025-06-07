
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-950 p-4 shadow-md">
      <h1 className="text-3xl font-bold text-center text-sky-400">
        <span role="img" aria-label="brain-atom" className="mr-2">🧠⚛️</span> AlphaEvolve UI Demo
      </h1>
      <p className="text-center text-sm text-slate-400 mt-1">AI-Powered Code Evolution Assistant</p>
    </header>
  );
};
