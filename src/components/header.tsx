'use client';

import Link from 'next/link';
import { UserAuthButton } from '@/components/user-auth-button';
import { Button } from './ui/button';

export function Header() {
  return (
    <header className="w-full flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-2xl font-bold">
          Cambodia Hub
        </Link>
        <nav className="hidden md:flex gap-4">
          <Button variant="ghost" asChild>
            <Link href="/listings" className="text-foreground hover:text-primary-foreground">For Sale</Link>
          </Button>
           <Button variant="ghost" asChild>
            <Link href="/jobs" className="text-foreground hover:text-primary-foreground">Jobs</Link>
          </Button>
        </nav>
      </div>
      <UserAuthButton />
    </header>
  );
}
