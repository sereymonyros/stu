
import { Card, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-8">
        <div>
          <Skeleton className="h-10 w-1/3 mb-6" />
        </div>
        
        {/* Skeleton for "My Applied Jobs" or "Posted Jobs" section */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-3xl">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <Skeleton className="h-5 w-3/4 mb-1" />
                    </div>
                    <Skeleton className="h-4 w-1/2 mb-3" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Skeleton for "Favorite Jobs" or "Saved Searches" section */}
        <section>
           <Skeleton className="h-8 w-1/4 mb-4" />
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="rounded-3xl">
                 <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex-grow">
                         <Skeleton className="h-5 w-4/5 mb-2" />
                         <Skeleton className="h-4 w-2/4 mb-3" />
                         <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <div className="flex gap-2">
                           <Skeleton className="h-8 w-16 rounded-md" />
                           <Skeleton className="h-8 w-16 rounded-md" />
                        </div>
                         <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}
