import React from 'react';

const bar = (cls: string) => (
  <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
);

export function CategoryFormSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          {bar('h-6 w-48')}
          {bar('h-4 w-64')}
        </div>
        {bar('h-9 w-44 rounded')}
      </div>
      <div className="max-w-2xl space-y-5 rounded-lg bg-white p-8 shadow-sm">
        {bar('h-4 w-32')}
        <div className="border-b border-gray-200 pb-1" />
        {bar('h-9 w-56 rounded')}
        {bar('h-10 w-full')}
        {bar('h-10 w-full')}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
          {bar('h-9 w-20 rounded')}
          {bar('h-9 w-36 rounded')}
        </div>
      </div>
    </div>
  );
}

export default CategoryFormSkeleton;
