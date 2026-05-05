import React from 'react';

const bar = (cls: string) => (
  <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
);

export function DepartmentFormSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">{bar('h-6 w-48')}{bar('h-4 w-36')}</div>
        {bar('h-9 w-44 rounded')}
      </div>
      <div className="max-w-2xl rounded-lg bg-white p-8 shadow-sm space-y-5">
        {bar('h-4 w-32 mb-2')}
        <div className="border-b border-gray-200 pb-1" />
        {bar('h-10 w-full')}
        {bar('h-28 w-full')}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
          {bar('h-9 w-20 rounded')}{bar('h-9 w-36 rounded')}
        </div>
      </div>
    </div>
  );
}

export default DepartmentFormSkeleton;
