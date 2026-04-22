import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
}

export default function EmptyState({ icon: Icon, title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-lng-blue-20">
        <Icon size={24} className="text-lng-blue" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-lng-grey">{title}</h3>
      {message && <p className="max-w-xs text-sm text-gray-400">{message}</p>}
    </div>
  );
}
