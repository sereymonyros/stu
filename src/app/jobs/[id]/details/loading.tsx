
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function JobDetailsLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Card className="w-full max-w-3xl mx-auto">
            <CardHeader>
                <div className="mb-4 w-fit -ml-2 h-7 flex items-center">
                    <ArrowLeft className="mr-2 h-4 w-4" /> 
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-9 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
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
        </Card>
      </main>
    </div>
  );
}
