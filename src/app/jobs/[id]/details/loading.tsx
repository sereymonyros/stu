
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function JobDetailsLoading() {
  return (
    <div className="flex flex-col  ">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Card className="w-full max-w-3xl mx-auto rounded-3xl">
            <CardHeader>
                <div className="flex justify-between items-start mb-4">
                    <Skeleton className="h-10 w-10" />
                </div>
                <Skeleton className="h-9 w-3/4" />
                <Skeleton className="h-7 w-1/2 mt-1" />
                <div className="flex flex-wrap gap-2 pt-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-px w-full" />
                <div>
                    <Skeleton className="h-6 w-40 mb-4" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                </div>
            </CardContent>
            <div className="p-6 pt-0">
                <Skeleton className="h-12 w-full" />
            </div>
        </Card>
      </main>
    </div>
  );
}
