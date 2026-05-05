interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'white' | 'current';
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

const colorMap = {
  blue: 'border-lng-blue',
  white: 'border-white',
  current: 'border-current',
};

export default function Spinner({ size = 'md', color = 'blue', className = '' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full ${colorMap[color]} border-t-transparent ${sizeMap[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
