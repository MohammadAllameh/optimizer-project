
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  className = '',
  ...props
}) => {
  const baseStyles = "px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed";
  
  let variantStyles = '';
  switch (variant) {
    case 'primary':
      variantStyles = 'bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-400';
      break;
    case 'secondary':
      variantStyles = 'bg-slate-600 hover:bg-slate-700 text-slate-100 focus:ring-slate-500';
      break;
    case 'danger':
      variantStyles = 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400';
      break;
    default:
      variantStyles = 'bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-400';
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : children}
    </button>
  );
};
