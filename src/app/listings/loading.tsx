
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

function ListingCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full flex flex-col">
        <div className="aspect-square relative w-full">
            <Skeleton className="h-full w-full" />
        </div>
      <CardContent className="p-4 flex-grow">
        <Skeleton className="h-6 w-3/4 mb-2" />
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-end">
        <div>
            <Skeleton className="h-7 w-20" />
        </div>
        <Skeleton className="h-10 w-10" />
      </CardFooter>
    </Card>
  );
}

export default function ListingsLoading() {
  return (
    <div className="flex flex-col  ">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
