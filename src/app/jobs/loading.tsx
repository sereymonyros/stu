
'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="aspect-square w-full" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
    return (
        <Card className="p-4 flex items-center gap-4 rounded-3xl">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex items-center gap-2 pt-1">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                </div>
            </div>
            <Skeleton className="h-9 w-9 rounded-md" />
        </Card>
    )
}

export default function JobsLoading({ count = 8, viewMode = 'list' }: { count?: number, viewMode?: 'list' | 'card' | 'board' }) {
  const Skeletons = Array.from({ length: count });

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
