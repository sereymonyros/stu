'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { useMemo, useState } from 'react';
import { Pencil, MessageSquare, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function ListingsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [contactingSellerId, setContactingSellerId] = useState<string | null>(null);

  const listingsCollection = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'listings');
  }, [firestore]);

  const { data: listings, isLoading } = useCollection(listingsCollection);

  const handleContactSeller = async (listing: any) => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.uid === listing.sellerId) {
        toast({ title: "This is your own listing." });
        return;
    }

    setContactingSellerId(listing.id);
    try {
      const chatsRef = collection(firestore, 'chats');
      const q = query(
        chatsRef,
        where('listingId', '==', listing.id),
        where('buyerId', '==', user.uid)
      );

      const existingChats = await getDocs(q);

      if (!existingChats.empty) {
        const chatId = existingChats.docs[0].id;
        router.push(`/chat/${chatId}`);
      } else {
        const newChatData = {
          listingId: listing.id,
          listingTitle: listing.title,
          buyerId: user.uid,
          sellerId: listing.sellerId,
          participants: [user.uid, listing.sellerId],
          lastMessage: `Inquiring about: ${listing.title}`,
          updatedAt: serverTimestamp(),
        };

        const newChatRef = await addDoc(chatsRef, newChatData).catch(serverError => {
            errorEmitter.emit(
              'permission-error',
              new FirestorePermissionError({
                path: chatsRef.path,
                operation: 'create',
                requestResourceData: newChatData,
              })
            );
            throw serverError; // rethrow to be caught by outer try/catch
        });
        router.push(`/chat/${newChatRef.id}`);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to start chat',
        description: error.message || 'There was a problem starting the chat.',
      });
      setContactingSellerId(null);
    }
  };

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
              {listings.map((listing) => {
                const isOwner = user && user.uid === listing.sellerId;
                const isContacting = contactingSellerId === listing.id;

                return (
                  <Card key={listing.id} className="overflow-hidden h-full flex flex-col transition-all duration-200 hover:shadow-xl hover:-translate-y-1">
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
                      
                      {user && (
                        <div className="flex gap-2">
                          {isOwner ? (
                            <Button asChild variant="ghost" size="icon" title="Edit listing">
                              <Link href={`/listings/${listing.id}/edit`}>
                                <Pencil className="h-5 w-5" />
                              </Link>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => handleContactSeller(listing)} disabled={isContacting} title="Contact seller">
                              {isContacting ? (
                                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" role="status" />
                              ) : (
                                <MessageSquare className="h-5 w-5" />
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}

          {!isLoading && (!listings || listings.length === 0) && (
             <div className="text-center py-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-4">
                <Store className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                    <h2 className="text-2xl font-semibold tracking-tight">No listings yet</h2>
                    <p className="text-muted-foreground mt-2">Be the first to post something for sale!</p>
                </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}
