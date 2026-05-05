

const bar = (cls: string) => (
  <div className={`animate-pulse rounded bg-lng-blue-20 ${cls}`} />
);

export function ContractorFormSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">{bar('h-6 w-48')}{bar('h-4 w-36')}</div>
        {bar('h-9 w-44 rounded')}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-36 mb-2')}<div className="border-b border-gray-200 pb-4" />
            {bar('h-10 w-full')}{bar('h-10 w-full')}
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-3">
            {bar('h-4 w-40 mb-2')}<div className="border-b border-gray-200 pb-4" />
            {bar('h-10 w-full')}{bar('h-10 w-full')}{bar('h-10 w-full')}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-32 mb-2')}<div className="border-b border-gray-200 pb-4" />
            {bar('h-5 w-16 rounded-full')}{bar('h-4 w-52')}{bar('h-9 w-full rounded')}
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
            {bar('h-4 w-24 mb-2')}<div className="border-b border-gray-200 pb-4" />
            {bar('h-4 w-64')}{bar('h-9 w-full rounded')}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractorFormSkeleton;
