
'use client';

import { useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ChatListItem({ chat }: { chat: any }) {
    const { user } = useUser();

    // Determine the other participant's ID
    const otherParticipantId = chat.participants.find((p: string) => p !== user?.uid);

    // TODO: A future improvement would be to fetch the other user's profile to display their name and avatar.
    // For now, we will show a generic label.
    const otherParticipantName = chat.buyerId === otherParticipantId ? 'Buyer' : 'Seller';

    return (
        <Link href={`/chat/${chat.id}`} className="block hover:bg-muted/50 rounded-lg transition-colors">
            <Card className="border-l-4 border-transparent hover:border-primary">
                <CardContent className="p-4 grid grid-cols-4 items-center">
                    <div className="col-span-3">
                        <p className="font-semibold text-lg truncate">{chat.listingTitle}</p>
                        <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                        {chat.updatedAt ? formatDistanceToNow(chat.updatedAt.toDate(), { addSuffix: true }) : ''}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function ChatsPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/login');
        }
    }, [user, isUserLoading, router]);

    const chatsQuery = useMemo(() => {
        if (!firestore || !user) return null;
        // Query for chats where the current user is a participant
        return query(collection(firestore, 'chats'), where('participants', 'array-contains', user.uid));
    }, [firestore, user]);

    const { data: chats, isLoading } = useCollection(chatsQuery);

    // Sort chats by last update time
    const sortedChats = useMemo(() => {
        if (!chats) return [];
        return chats.sort((a, b) => {
            const dateA = a.updatedAt?.toDate?.()?.getTime() || 0;
            const dateB = b.updatedAt?.toDate?.()?.getTime() || 0;
            return dateB - dateA;
        });
    }, [chats]);

    if (isUserLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto">
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-8 w-64" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        )
    }

    if (!user) {
        return null;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <MessageSquare /> My Conversations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {sortedChats && sortedChats.length > 0 ? (
                                <div className="space-y-4">
                                    {sortedChats.map(chat => <ChatListItem key={chat.id} chat={chat} />)}
                                </div>
                            ) : (
                                <div className="text-center py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-3">
                                    <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="text-xl font-semibold">No conversations yet</h3>
                                    <p className="text-muted-foreground">Contact a seller on a listing to start a conversation.</p>
                                    <Button asChild><Link href="/listings">Browse Listings</Link></Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
