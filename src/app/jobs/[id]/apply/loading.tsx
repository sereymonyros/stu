
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function ApplyLoading() {
  return (
    <div className="flex flex-col  ">
      <main className="flex-1 p-4 md:p:6 lg:p-8">
        <div>
            <Card className="max-w-2xl mx-auto rounded-3xl">
            <CardHeader>
                <div className="mb-4">
                    <Skeleton className="h-10 w-10" />
                </div>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-5 w-1/2 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/50 h-[58px]">
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                </div>
                 <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
