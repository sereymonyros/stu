'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from './ui/button';
import { MessageSquareHeart, MessageSquare, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useChatbot } from './chatbot-provider';

// 1. Create a context for the settings sheet
interface SettingsSheetContextType {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

const SettingsSheetContext = createContext<SettingsSheetContextType | undefined>(undefined);

// 2. Create a provider component
export function SettingsSheetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);

  return (
    <SettingsSheetContext.Provider value={{ isOpen, setOpen }}>
      {children}
    </SettingsSheetContext.Provider>
  );
}

// 3. Create a custom hook to use the context
export function useSettingsSheet() {
  const context = useContext(SettingsSheetContext);
  if (context === undefined) {
    throw new Error('useSettingsSheet must be used within a SettingsSheetProvider');
  }
  return context;
}


// 4. The actual Sheet component
export function SettingsSheet() {
  const { isOpen, setOpen } = useSettingsSheet();
  const { theme, setTheme } = useTheme();
  const { setOpen: setChatbotOpen } = useChatbot();

  const handleAskAI = () => {
    setOpen(false); // Close settings sheet
    setChatbotOpen(true); // Open chatbot
  };
  
  return (
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>Manage your app preferences.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={handleAskAI}>
                <MessageSquare /> Ask AI Helper
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                 <Link href="/feedback" onClick={() => setOpen(false)}>
                    <MessageSquareHeart /> Give Feedback
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Sun /> : <Moon />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </Button>
          </div>
        </SheetContent>
      </Sheet>
  );
}
