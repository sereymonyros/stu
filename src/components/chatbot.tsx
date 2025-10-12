'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, Bot, User } from 'lucide-react';
import { guideUser } from '@/ai/flows/guide-user-flow';
import { marked } from 'marked';

interface Message {
  id: string;
  text: string | React.ReactNode;
  sender: 'user' | 'bot';
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Use a streaming-friendly way to update the bot's response
    const botMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: botMessageId, text: <div className="animate-pulse h-4 w-12 bg-muted-foreground/50 rounded-md" />, sender: 'bot' }]);

    try {
      // The guideUser flow is not implemented yet, so we'll simulate a response.
      // This will be replaced with the actual AI call.
      const response = await new Promise<{ answer: string }>(resolve => 
        setTimeout(() => resolve({ answer: `This is a simulated response to: **"${input}"**. The real AI flow is not connected yet.` }), 1500)
      );
      
      const htmlAnswer = await marked.parse(response.answer);
      const botMessageNode = <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: htmlAnswer }} />;
      
      setMessages(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, text: botMessageNode } : msg));
      
    } catch (error) {
      console.error('Chatbot error:', error);
       setMessages(prev => prev.map(msg => msg.id === botMessageId ? { ...msg, text: <span className="text-destructive">Sorry, I encountered an error.</span> } : msg));
    } finally {
        setIsLoading(false);
    }
  };
  
  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-8 w-8" />
      </Button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Cambodia Hub Helper</SheetTitle>
            <SheetDescription>Your personal guide to using the app. Ask me anything!</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
                {messages.map((message) => (
                    <div key={message.id} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                        {message.sender === 'bot' && (
                            <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`rounded-lg px-3 py-2 max-w-xs text-sm ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            {message.text}
                        </div>
                         {message.sender === 'user' && (
                            <Avatar className="h-8 w-8 bg-muted text-muted-foreground">
                                <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
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
                placeholder="How do I post a job?"
                className="pr-12"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8" disabled={isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
