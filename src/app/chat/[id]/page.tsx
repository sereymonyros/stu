
'use client';

import { useMemo, useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { getPublicProfile } from '@/ai/flows/get-public-profile-flow';
import type { GetPublicProfileOutput } from '@/ai/flows/get-public-profile-schema';

function Message({ message, isOwnMessage, otherUser }: { message: any; isOwnMessage: boolean; otherUser: GetPublicProfileOutput | null }) {
    const fallback = otherUser?.displayName?.[0] || 'U';

    return (
        <div className={cn("flex items-end gap-2", isOwnMessage ? "justify-end" : "justify-start")}>
            {!isOwnMessage && (
                <Avatar className="h-8 w-8">
                    <AvatarImage src={otherUser?.photoURL} />
                    <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
            )}
            <div
                className={cn(
                    "max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl",
                    isOwnMessage
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                )}
            >
                <p className="text-sm">{message.text}</p>
                 <p className="text-xs opacity-70 mt-1 text-right">
                    {message.timestamp ? format(message.timestamp.toDate(), 'p') : ''}
                </p>
            </div>
        </div>
    );
}

export default function ChatPage({ params }: { params: { id: string } }) {
    const { id: chatId } = params;
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [otherUser, setOtherUser] = useState<GetPublicProfileOutput | null>(null);
    const [isOtherUserLoading, setIsOtherUserLoading] = useState(true);

    const finalChatId = Array.isArray(chatId) ? chatId[0] : chatId;

    const chatRef = useMemo(() => {
        if (!firestore || !finalChatId) return null;
        return doc(firestore, 'chats', finalChatId);
    }, [firestore, finalChatId]);

    const messagesQuery = useMemo(() => {
        if (!chatRef) return null;
        return collection(chatRef, 'messages');
    }, [chatRef]);

    const { data: chat, isLoading: isChatLoading } = useDoc(chatRef);
    const { data: messages, isLoading: areMessagesLoading } = useCollection(messagesQuery);

    const otherUserId = useMemo(() => {
        if (!chat || !user) return null;
        return chat.participants.find((p: string) => p !== user.uid);
    }, [chat, user]);

    useEffect(() => {
        if (!otherUserId) {
            setIsOtherUserLoading(false);
            return;
        };
        
        setIsOtherUserLoading(true);
        getPublicProfile({ userId: otherUserId })
            .then(profile => setOtherUser(profile))
            .catch(err => {
                console.error("Failed to fetch other user profile:", err);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load user information.' });
            })
            .finally(() => setIsOtherUserLoading(false));

    }, [otherUserId, toast]);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/login');
        }
        if (!isChatLoading && chat && user && !chat.participants.includes(user.uid)) {
            toast({ variant: "destructive", title: "Unauthorized", description: "You are not a participant in this chat." });
            router.replace('/chat');
        }
    }, [user, isUserLoading, chat, isChatLoading, router, toast]);

    // Scroll to the bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !messagesQuery || !chatRef) return;

        setIsSending(true);

        const messageData = {
            senderId: user.uid,
            text: newMessage.trim(),
            timestamp: serverTimestamp(),
        };

        const updateChatData = {
            lastMessage: newMessage.trim(),
            updatedAt: serverTimestamp(),
        }

        try {
            // These are non-blocking, but we can still use Promise.all to handle combined failure.
            await Promise.all([
                addDoc(messagesQuery, messageData).catch(serverError => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: messagesQuery.path,
                        operation: 'create',
                        requestResourceData: messageData
                    }));
                    throw serverError; // Propagate to outer catch
                }),
                updateDoc(chatRef, updateChatData).catch(serverError => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: chatRef.path,
                        operation: 'update',
                        requestResourceData: updateChatData
                    }));
                    throw serverError; // Propagate to outer catch
                })
            ]);
            setNewMessage('');
        } catch (error) {
            // Errors are emitted globally, but we show a toast for user feedback
            toast({ variant: 'destructive', title: 'Failed to send message', description: 'Please try again.'});
        } finally {
            setIsSending(false);
        }
    };
    
    // Sort messages by timestamp
    const sortedMessages = useMemo(() => {
        if (!messages) return [];
        return messages.sort((a, b) => {
            const dateA = a.timestamp?.toDate?.()?.getTime() || 0;
            const dateB = b.timestamp?.toDate?.()?.getTime() || 0;
            return dateA - dateB;
        });
    }, [messages]);


    const isLoading = isChatLoading || areMessagesLoading || isUserLoading || isOtherUserLoading;
    const otherUserName = otherUser?.displayName || "User";

    return (
        <div className="flex flex-col h-screen">
            <Header />
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b">
                     <Button variant="ghost" size="sm" asChild>
                        <Link href="/chat"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Conversations</Link>
                    </Button>
                    <div className="mt-2">
                        {isLoading ? (
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-4 w-48" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={otherUser?.photoURL} />
                                    <AvatarFallback>{otherUserName[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="font-semibold text-lg">{otherUserName}</h2>
                                    <p className="text-sm text-muted-foreground truncate">
                                        Regarding: <span className="font-medium text-foreground">{chat?.listingTitle}</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {sortedMessages.map(msg => (
                        <Message
                            key={msg.id}
                            message={msg}
                            isOwnMessage={msg.senderId === user?.uid}
                            otherUser={otherUser}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                     {areMessagesLoading && (
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-3/4 self-start" />
                            <Skeleton className="h-12 w-1/2 self-end" />
                        </div>
                     )}
                </div>

                <div className="p-4 border-t bg-background">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <Input
                            type="text"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={isSending || isLoading}
                            autoComplete="off"
                        />
                        <Button type="submit" size="icon" disabled={isSending || isLoading || !newMessage.trim()}>
                            {isSending ? <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" /> : <Send />}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
