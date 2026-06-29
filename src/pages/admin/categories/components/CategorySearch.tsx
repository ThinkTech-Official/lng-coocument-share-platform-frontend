import { Search } from 'lucide-react';

interface CategorySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CategorySearch({ value, onChange }: CategorySearchProps) {
  return (
    <div className="relative mb-6">
      <Search
        size={15}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="search"
        placeholder="Search categories"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 shadow-sm focus:border-lng-blue focus:outline-none focus:ring-1 focus:ring-lng-blue"
      />
    </div>
  );
}
