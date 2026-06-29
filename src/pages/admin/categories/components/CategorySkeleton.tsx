export default function CategorySkeleton() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-gray-200 ${cls}`} />
  );
  return (
    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          {bar('h-5 w-5 shrink-0')}
          {i === 0 && bar('h-3 w-3 rounded-sm shrink-0')}
          {bar(`h-4 ${i === 0 ? 'w-36' : 'w-48'}`)}
          {bar('h-3 w-14')}
          {i === 0 && bar('h-4 w-24 rounded-full')}
          <div className="flex flex-1 justify-end gap-2">
            {bar('h-6 w-12 rounded')}
            {bar('h-6 w-14 rounded')}
          </div>
        </div>
      ))}
    </div>
  );
}
