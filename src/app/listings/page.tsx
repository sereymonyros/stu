'use client';

import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';

export default function ListingsPage() {
  const firestore = useFirestore();
  const listingsCollection = collection(firestore, 'listings');
  const { data: listings, isLoading } = useCollection(listingsCollection);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight">For Sale</h1>
            <Button asChild>
              <Link href="/listings/new">Post an Item</Link>
            </Button>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-40 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && listings && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <Link key={listing.id} href={`/listings/${listing.id}`} legacyBehavior>
                  <a className="block group">
                    <Card className="overflow-hidden h-full flex flex-col transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1">
                      <CardHeader className="p-0">
                        <div className="aspect-square relative w-full">
                          <Image
                            src={listing.imageUrls?.[0] || 'https://picsum.photos/seed/default/600/600'}
                            alt={listing.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 flex-grow">
                        <CardTitle className="text-lg font-semibold truncate group-hover:text-primary">
                          {listing.title}
                        </CardTitle>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <p className="text-xl font-bold text-primary">${listing.price}</p>
                      </CardFooter>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          )}
           {!isLoading && (!listings || listings.length === 0) && (
             <div className="text-center py-20">
                <h2 className="text-2xl font-semibold">No listings yet</h2>
                <p className="text-muted-foreground mt-2">Be the first to post something for sale!</p>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}
