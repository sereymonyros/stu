

'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

function CardSkeleton() {
  return (
    <Card className="rounded-3xl flex flex-col">
      <div className="p-3 pb-2">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <div className="flex flex-row flex-wrap items-center text-xs gap-x-2 gap-y-1 pt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <div className="p-3 pt-0 flex-grow flex flex-col justify-end">
        <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-1">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </Card>
  );
}

function ListSkeleton() {
    return (
        <Card className="p-4 flex items-center gap-4 rounded-3xl">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="flex items-center gap-2 pt-1">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                </div>
            </div>
            <Skeleton className="h-9 w-9" />
        </Card>
    )
}

export default function JobsLoading({ count, viewMode = 'list' }: { count?: number, viewMode?: 'list' | 'card' | 'board' }) {
  const Skeletons = Array.from({ length: count || 8 });

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex-1">
            <Skeleton className="h-9 w-48" />
          </div>
          <div className="flex items-center gap-2">
             <Skeleton className="h-10 w-[120px] rounded-md" />
             <Skeleton className="h-10 w-10 rounded-md" />
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 gap-4">
             {Skeletons.map((_, i) => <ListSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Skeletons.map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}
      </main>
    </div>
  );
}
