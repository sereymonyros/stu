

'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { Pencil, Store } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

export default function ListingsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const listingsCollection = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'listings');
  }, [firestore]);

  const { data: listings } = useCollection(listingsCollection);

  return (
    <div className="flex flex-col  ">
      <main className="flex-1 p-4 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">For Sale</h1>
          <Button asChild>
            <Link href="/listings/new">Post an Item</Link>
          </Button>
        </div>

        {listings && listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.map((listing) => {
              const isOwner = user && user.uid === listing.sellerId;

              return (
                <Card key={listing.id} className="overflow-hidden h-full flex flex-col transition-all duration-200 hover:shadow-2xl">
                    <Carousel className="w-full relative">
                      <CarouselContent>
                        {listing.imageUrls && listing.imageUrls.length > 0 ? (
                          listing.imageUrls.map((url: string, index: number) => (
                            <CarouselItem key={index}>
                              <div className="aspect-square relative w-full">
                                <Image
                                  src={url}
                                  alt={`${listing.title} - image ${index + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            </CarouselItem>
                          ))
                        ) : (
                           <CarouselItem>
                              <div className="aspect-square relative w-full">
                                <Image
                                  src={'https://picsum.photos/seed/default/600/600'}
                                  alt={listing.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            </CarouselItem>
                        )}
                      </CarouselContent>
                      {listing.imageUrls?.length > 1 && (
                        <>
                          <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
                          <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
                        </>
                      )}
                    </Carousel>
                  <CardContent className="p-4 flex-grow">
                      <CardTitle className="text-lg font-semibold truncate hover:text-primary">
                         <Link href={`/listings/${listing.id}/edit`}>{listing.title}</Link>
                      </CardTitle>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex justify-between items-end">
                    <div>
                      {listing.originalPrice ? (
                        <div className="flex flex-col items-start">
                          <p className="text-sm text-muted-foreground line-through">
                            ${listing.originalPrice}
                          </p>
                          <p className="text-xl font-bold text-primary">${listing.price}</p>
                        </div>
                      ) : (
                        <p className="text-xl font-bold text-primary">${listing.price}</p>
                      )}
                    </div>

                    {user && isOwner && (
                      <div className="flex gap-2">
                          <Button asChild variant="ghost" size="icon" title="Edit listing">
                            <Link href={`/listings/${listing.id}/edit`}>
                              <Pencil className="h-5 w-5" />
                            </Link>
                          </Button>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        ) : (
           <div className="text-center py-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-4">
              <Store className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                  <h2 className="text-2xl font-semibold tracking-tight">No listings yet</h2>
                  <p className="text-muted-foreground mt-2">Be the first to post something for sale!</p>
              </div>
           </div>
         )}
      </main>
    </div>
  );
}
