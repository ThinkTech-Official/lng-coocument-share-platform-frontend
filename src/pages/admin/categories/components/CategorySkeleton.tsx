export default function CategorySkeleton() {
  const bar = (cls: string) => (
    <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
  );
  return (
    <div>
      <div className="rounded-lg border-l-4 border-lng-blue bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="shrink-0">{bar('h-5 w-5')}</div>
          <div className="flex flex-1 items-center gap-3">
            {bar('h-5 w-48')}
            {bar('h-4 w-20 rounded-full')}
            {bar('h-3 w-28')}
          </div>
          <div className="flex gap-2">
            {bar('h-7 w-14 rounded')}
            {bar('h-7 w-14 rounded')}
          </div>
        </div>
      </div>
      <div className="ml-12 mt-2 animate-pulse rounded bg-lng-blue-20 px-4 py-3">
        <div className="flex items-center gap-3">
          {bar('h-4 w-4')}
          {bar('h-4 w-36')}
          {bar('h-3 w-16 rounded-full')}
        </div>
      </div>
    </div>
  );
}
