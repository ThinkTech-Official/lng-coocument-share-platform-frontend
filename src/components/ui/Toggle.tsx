interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  description?: string;
}

export default function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
  size = 'md',
  description,
}: ToggleProps) {
  const sizes = {
    sm: { track: 'w-8 h-4.5', thumb: 'w-3.5 h-3.5', translate: 'translate-x-3.5' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7.5', thumb: 'w-6.5 h-6.5', translate: 'translate-x-6.5' },
  };

  const { track, thumb, translate } = sizes[size];

  const descriptionMargins = {
    sm: 'ml-11',
    md: 'ml-14',
    lg: 'ml-17',
  };

  return (
    <div className="flex flex-col gap-1">
      <label className={`flex items-center gap-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
        <div className="relative inline-flex items-center">
          <input
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
          <div
            className={`
              ${track} rounded-full transition-colors duration-200 ease-in-out
              ${checked ? 'bg-lng-blue' : 'bg-gray-200'}
            `}
          >
            <div
              className={`
                ${thumb} transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out
                mt-0.5 ml-0.5
                ${checked ? translate : 'translate-x-0'}
              `}
            />
          </div>
        </div>
        {label && (
          <span className="text-sm font-medium text-lng-grey select-none">
            {label}
          </span>
        )}
      </label>
      {description && (
        <p className={`${descriptionMargins[size]} text-xs text-gray-400`}>
          {description}
        </p>
      )}
    </div>
  );
}
