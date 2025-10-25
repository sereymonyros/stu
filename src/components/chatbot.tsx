
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Sparkles, User, X } from 'lucide-react';
import { chat, type ChatOutput } from '@/ai/flows/chat-flow';
import { marked } from 'marked';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';
import { JobCardSmall } from './job-card-small';
import { useChatbot } from './chatbot-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';


interface Message {
  id: string;
  node: React.ReactNode;
  sender: 'user' | 'bot';
}

const suggestionPrompts = [
    "Find me a job in marketing",
    "How do I post a job?",
    "Show me part-time roles",
    "How to update my profile?",
]

export function Chatbot() {
  const { isOpen, setOpen } = useChatbot();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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
                   <JobCardSmall 
                        key={job.id} 
                        job={job}
                        isFavourite={false}
                        onToggleFavourite={async () => {}}
                        hasApplied={false}
                        isRecruiter={false}
                   />
                ))}
            </div>
        )
    }
     if (Array.isArray(content) && content.length === 0) {
        return <p>I couldn't find any jobs matching your request. Try broadening your search!</p>
    }
    return <p>Sorry, I'm not sure how to help with that.</p>;
  }

  const handleSendMessage = async (e: React.FormEvent, messageText?: string) => {
    e.preventDefault();
    const currentInput = messageText || input;
    if (!currentInput.trim() || !user) return;

    const userMessage: Message = { id: Date.now().toString(), node: <p>{currentInput}</p>, sender: 'user' };
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
      const response = await chat({ query: currentInput, userId: user.uid });
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

  const ChatWindow = (
     <div className="flex flex-col h-full bg-background rounded-3xl">
        <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Cambodia Hub Helper</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-8">
                        <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
                            <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold">Welcome!</h2>
                        <p className="text-muted-foreground">How can I help you today?</p>
                        <div className="flex flex-wrap gap-2 justify-center mt-6">
                            {suggestionPrompts.map(prompt => (
                                <Badge 
                                    key={prompt}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-muted"
                                    onClick={(e) => handleSendMessage(e, prompt)}
                                >
                                    {prompt}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((message) => (
                    <div key={message.id} className={cn("flex items-end gap-3", message.sender === 'user' ? 'justify-end' : 'justify-start')}>
                        {message.sender === 'bot' && (
                            <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                <AvatarFallback><Sparkles className="h-5 w-5" /></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`rounded-2xl px-4 py-2.5 max-w-sm text-sm shadow-md ${message.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
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
        <DialogFooter className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="relative w-full">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={user ? "Ask me anything..." : "Please log in to use the chatbot"}
                    className="pr-12 h-12 rounded-full shadow-inner"
                    disabled={!user || isLoading}
                />
                <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full" disabled={!user || isLoading}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </DialogFooter>
     </div>
  );

  if (isMobile) {
      return (
        <Sheet open={isOpen} onOpenChange={setOpen} modal={true}>
            <SheetContent side="bottom" className="h-[80svh] flex flex-col p-0 rounded-t-3xl">
                 <SheetHeader className="p-4 pb-2 relative">
                    <SheetTitle className="text-center">AI Helper</SheetTitle>
                     <button onClick={() => setOpen(false)} className="absolute top-3 right-3 rounded-full p-2 text-muted-foreground hover:bg-muted">
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </button>
                </SheetHeader>
                <div className="flex-1 min-h-0">
                    {ChatWindow}
                </div>
            </SheetContent>
        </Sheet>
      )
  }

  return (
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 gap-0 rounded-3xl shadow-2xl border">
           <div className="h-full">
                {ChatWindow}
           </div>
        </DialogContent>
      </Dialog>
  );
}
