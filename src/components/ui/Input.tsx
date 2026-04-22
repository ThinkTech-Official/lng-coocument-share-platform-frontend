import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-lng-grey"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full rounded border px-3 py-2 text-sm text-lng-grey placeholder:text-gray-400
            border-gray-300 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue
            disabled:bg-gray-50 disabled:text-gray-400
            ${error ? 'border-lng-red focus:border-lng-red focus:ring-lng-red' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-lng-red">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
