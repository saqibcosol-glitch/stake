import React, { InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  fullWidth = false,
  rightElement,
  className = '',
  ...props
}) => {
  return (
    <div className={cn(fullWidth ? 'w-full' : '')}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <input
          className={cn(
            "bg-white/5 border text-white rounded-xl px-4 py-3.5 transition-all duration-200 text-base",
            "placeholder-gray-500 focus:outline-none focus:ring-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
              : "border-white/10 focus:border-solana-purple focus:ring-solana-purple/20 hover:border-white/20",
            rightElement ? 'pr-12' : '',
            fullWidth ? 'w-full' : '',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-white transition-colors">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-400 ml-1 flex items-center gap-1">
          <span>•</span> {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-gray-500 ml-1">{helperText}</p>
      )}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  helperText,
  fullWidth = false,
  className = '',
  ...props
}) => {
  return (
    <div className={cn(fullWidth ? 'w-full' : '')}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "bg-white/5 border text-white rounded-xl px-4 py-3 transition-all duration-200 text-base",
          "placeholder-gray-500 focus:outline-none focus:ring-2",
          error
            ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
            : "border-white/10 focus:border-solana-purple focus:ring-solana-purple/20 hover:border-white/20",
          fullWidth ? 'w-full' : '',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-400 ml-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-gray-500 ml-1">{helperText}</p>
      )}
    </div>
  );
};
