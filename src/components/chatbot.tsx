
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Sparkles, User } from 'lucide-react';
import { chat, type ChatOutput } from '@/ai/flows/chat-flow';
import { marked } from 'marked';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';
import { JobResultCard } from './job-result-card';
import { useChatbot } from './chatbot-provider';

interface Message {
  id: string;
  node: React.ReactNode;
  sender: 'user' | 'bot';
}

export function Chatbot() {
  const { isOpen, setOpen } = useChatbot();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc(userProfileRef);

  const renderContent = (content: ChatOutput['response']) => {
    if (typeof content === 'string') {
        const html = marked.parse(content);
        return <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
    }
    if (Array.isArray(content) && content.length > 0) {
        return (
            <div className="space-y-2">
                <p className="font-medium">I found {content.length} job(s) for you:</p>
                {content.map(job => (
                   <JobResultCard key={job.id} job={job} onLinkClick={() => setOpen(false)}/>
                ))}
            </div>
        )
    }
     if (Array.isArray(content) && content.length === 0) {
        return <p>I couldn't find any jobs matching your request. Try broadening your search!</p>
    }
    return <p>Sorry, I'm not sure how to help with that.</p>;
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage: Message = { id: Date.now().toString(), node: <p>{input}</p>, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    const botMessageId = (Date.now() + 1).toString();
    const loadingNode = (
        <div className="flex items-center gap-2">
            <div className="animate-pulse h-2 w-2 bg-muted-foreground/50 rounded-full" />
            <div className="animate-pulse h-2 w-2 bg-muted-foreground/50 rounded-full delay-150" />
            <div className="animate-pulse h-2 w-2 bg-muted-foreground/50 rounded-full delay-300" />
        </div>
    );
    setMessages(prev => [...prev, { id: botMessageId, node: loadingNode, sender: 'bot' }]);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const errorNode = <span className="text-destructive">You appear to be offline. Please check your connection.</span>
        setMessages(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, node: errorNode } : msg));
        setIsLoading(false);
        return;
    }

    try {
      const response = await chat({ query: input, userId: user.uid });
      const botMessageNode = renderContent(response.response);
      
      setMessages(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, node: botMessageNode } : msg));
      
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorNode = <span className="text-destructive">Sorry, I encountered an error. Please try again.</span>
      setMessages(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, node: errorNode } : msg));
    } finally {
        setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const fallbackText = userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Cambodia Hub Helper</SheetTitle>
            <SheetDescription>Ask me to find jobs or help you use the app.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
                {messages.map((message) => (
                    <div key={message.id} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                        {message.sender === 'bot' && (
                            <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                <AvatarFallback><Sparkles className="h-5 w-5" /></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`rounded-lg px-3 py-2 max-w-sm text-sm ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            {message.node}
                        </div>
                         {message.sender === 'user' && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={userProfile?.photoURL || undefined} alt={userProfile?.displayName ?? 'User'} />
                                <AvatarFallback>{fallbackText}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
            </div>
          </ScrollArea>
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., find me a job in marketing"
                className="pr-12"
                disabled={!user || isLoading}
              />
              <Button type="submit" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8" disabled={!user || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
  );
}
