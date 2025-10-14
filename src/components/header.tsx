
'use client';

import Link from 'next/link';
import { UserAuthButton } from '@/components/user-auth-button';
import { Button } from './ui/button';
import { EmailVerificationBanner } from './EmailVerificationBanner';
import { Slack } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export function Header() {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
      const mainContent = document.getElementById('main-content');
      if (!mainContent) return;

      const handleScroll = () => {
          setIsScrolling(true);
          if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current);
          }
          scrollTimeoutRef.current = setTimeout(() => {
              setIsScrolling(false);
          }, 150);
      };

      mainContent.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
          mainContent.removeEventListener("scroll", handleScroll);
          if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current);
          }
      };
  }, []);

  return (
    <>
      <header className={cn(
        "sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm transition-opacity duration-1000 ease-in-out",
        isScrolling ? "opacity-50" : "opacity-100"
      )}>
        <div className="container mx-auto flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
                <Slack className="h-8 w-8" />
                <span className="hidden sm:inline-block">Cambodia Hub</span>
            </Link>
            <nav className="hidden md:flex gap-4">
                <Button variant="ghost" asChild>
                <Link href="/jobs" className="header-link">Jobs</Link>
                </Button>
            </nav>
            </div>
            <UserAuthButton />
        </div>
      </header>

      {/* TODO: For development, I comment it out now. Will reactive when ready */}
      {/* <EmailVerificationBanner /> */}
    </>
  );
}
