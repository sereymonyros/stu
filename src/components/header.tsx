
'use client';

import Link from 'next/link';
import { EmailVerificationBanner } from './EmailVerificationBanner';
import { Slack } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();

  // On the homepage, the header should be absolute to float over the hero image.
  // On all other pages, it should be sticky.
  const isHomePage = pathname === '/';

  return (
    <>
      <header className={cn(
        "top-0 z-50 w-full",
        isHomePage ? 'absolute bg-transparent' : 'sticky bg-background/80 backdrop-blur-sm'
      )}>
        <div className="container mx-auto flex h-16 items-center justify-center px-4">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
                <Slack className="h-8 w-8" />
            </Link>
        </div>
      </header>

      {/* TODO: For development, I comment it out now. Will reactive when ready */}
      {/* <EmailVerificationBanner /> */}
    </>
  );
}
