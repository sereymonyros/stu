'use client';

import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Pencil } from 'lucide-react';

export default function ListingDetailPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const listingId = Array.isArray(id) ? id[0] : id;

  const listingRef = useMemo(() => {
    if (!firestore || !listingId) return null;
    return doc(firestore, 'listings', listingId);
  }, [firestore, listingId]);

  const { data: listing, isLoading } = useDoc(listingRef);

  const [isContacting, setIsContacting] = useState(false);

  const isOwner = user && listing && user.uid === listing.sellerId;

  const handleContactSeller = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!listing || isOwner) return;

    setIsContacting(true);
    try {
      const chatsRef = collection(firestore, 'chats');
      const q = query(
        chatsRef,
        where('listingId', '==', listingId),
        where('buyerId', '==', user.uid)
      );
      
      const existingChats = await getDocs(q);

      if (!existingChats.empty) {
        // Chat already exists, navigate to it
        const chatId = existingChats.docs[0].id;
        router.push(`/chat/${chatId}`);
      } else {
        // Create a new chat
        const newChatRef = await addDoc(chatsRef, {
          listingId: listingId,
          buyerId: user.uid,
          sellerId: listing.sellerId,
          // Add participants array for easier querying
          participants: [user.uid, listing.sellerId],
          lastMessage: `Inquiring about: ${listing.title}`,
          updatedAt: serverTimestamp(),
        });
        router.push(`/chat/${newChatRef.id}`);
      }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Failed to start chat',
            description: error.message || 'There was a problem starting the chat. Please try again.',
        });
        setIsContacting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <div className="space-y-4">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-12 w-48" />
                </div>
            </div>
        )}
        {listing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="aspect-square relative w-full">
                        <Image
                            src={listing.imageUrls?.[0] || 'https://picsum.photos/seed/item/600/600'}
                            alt={listing.title}
                            fill
                            className="object-cover"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight">{listing.title}</h1>
              <div className="flex items-baseline gap-4">
                <p className="text-3xl font-bold text-primary">${listing.price}</p>
                {listing.originalPrice && (
                  <p className="text-xl font-medium text-muted-foreground line-through">
                    ${listing.originalPrice}
                  </p>
                )}
              </div>
              <p className="text-lg text-muted-foreground">{listing.description}</p>
              
              {isOwner ? (
                 <Button asChild size="lg" className="mt-4">
                    <Link href={`/listings/${listingId}/edit`}>
                        <Pencil className="mr-2 h-5 w-5" />
                        Edit Listing
                    </Link>
                </Button>
              ) : (
                <Button onClick={handleContactSeller} disabled={isContacting} size="lg" className="mt-4">
                  {isContacting ? 'Starting Chat...' : 'Contact Seller'}
                </Button>
              )}
            </div>
          </div>
        )}
        {!isLoading && !listing && (
            <div className="text-center py-20">
                <h2 className="text-2xl font-semibold">Listing not found</h2>
                <p className="text-muted-foreground mt-2">This listing may have been removed or the link is incorrect.</p>
                <Button asChild className="mt-6">
                    <Link href="/listings">Back to Listings</Link>
                </Button>
            </div>
        )}
      </main>
    </div>
  );
}
