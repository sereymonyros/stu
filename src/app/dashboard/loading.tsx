
import { Card, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-8">
        <div>
          <Skeleton className="h-10 w-1/3" />
        </div>
        <Card className="rounded-3xl">
          <CardHeader>
            <Skeleton className="h-8 w-1/4 mb-4" />
          </CardHeader>
          <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-3xl" />)}
          </div>
        </Card>
         <Card className="rounded-3xl">
          <CardHeader>
            <Skeleton className="h-8 w-1/4 mb-4" />
          </CardHeader>
          <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-3xl" />)}
          </div>
        </Card>
      </main>
    </div>
  )
}