import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const baseClass =
  'w-full rounded-lg border bg-[#0f0f12] px-3 py-2 text-sm text-zinc-100 ' +
  'placeholder:text-zinc-600 transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export function Input({ label, error, hint, className = '', ...props }: InputProps) {
  const borderClass = error ? 'border-red-500' : 'border-zinc-700 hover:border-zinc-500';
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-zinc-300">{label}</label>
      )}
      <input
        {...props}
        className={[baseClass, borderClass, className].join(' ')}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!error && hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function Textarea({ label, error, hint, className = '', ...props }: TextareaProps) {
  const borderClass = error ? 'border-red-500' : 'border-zinc-700 hover:border-zinc-500';
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-zinc-300">{label}</label>
      )}
      <textarea
        {...props}
        className={[baseClass, borderClass, 'resize-none', className].join(' ')}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!error && hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
