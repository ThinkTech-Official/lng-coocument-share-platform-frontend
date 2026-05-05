

const bar = (cls: string) => (
  <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
);

export function VideoFormSkeleton() {
  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          {bar('h-7 w-52')}
          {bar('h-4 w-72')}
        </div>
        {bar('h-9 w-44 rounded')}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left skeleton */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-40')}
            <div className="border-b border-gray-200 pb-2" />
            {bar('h-10 w-full')}
            {bar('h-24 w-full')}
            {bar('h-10 w-full')}
            <div className="flex justify-end gap-3 pt-2">
              {bar('h-9 w-24 rounded')}
              {bar('h-9 w-36 rounded')}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-36')}
            <div className="border-b border-gray-200 pb-2" />
            <div className="aspect-video w-full rounded-lg bg-lng-blue-20 animate-pulse" />
            <div className="border-t border-gray-200 pt-4 space-y-3">
              {bar('h-3 w-24')}
              {bar('h-9 w-full rounded')}
            </div>
          </div>
        </div>

        {/* Right skeleton */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-32')}
            <div className="border-b border-gray-200 pb-2" />
            {bar('h-6 w-24 rounded-full')}
            {bar('h-4 w-56')}
            {bar('h-9 w-full rounded')}
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-40')}
            <div className="border-b border-gray-200 pb-2" />
            {bar('h-6 w-28 rounded-full')}
            {bar('h-9 w-full rounded')}
            {bar('h-32 w-full rounded')}
            {bar('h-9 w-full rounded')}
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4 border border-lng-red-40">
            {bar('h-4 w-28')}
            <div className="border-b border-gray-200 pb-2" />
            {bar('h-4 w-full')}
            {bar('h-9 w-full rounded')}
          </div>
        </div>
      </div>
    </>
  );
}

export default VideoFormSkeleton;
