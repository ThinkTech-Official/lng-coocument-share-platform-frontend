import { Search } from 'lucide-react';

interface CategorySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CategorySearch({ value, onChange }: CategorySearchProps) {
  return (
    <div className="relative mb-6 max-w-sm">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="search"
        placeholder="Search categories"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm text-lng-grey placeholder:text-gray-400 focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
      />
    </div>
  );
}
