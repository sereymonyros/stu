
'use client';

import Link from 'next/link';
import { UserAuthButton } from '@/components/user-auth-button';
import { Button } from './ui/button';
import { EmailVerificationBanner } from './EmailVerificationBanner';

const AngkorWatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 180"
    width="40"
    height="32"
    className="h-8 w-10 text-primary"
    fill="currentColor"
  >
    <path d="M128 35.2L116.5 22.8 113.1 26.5V0h-3.4v26.5L106.3 22.8 95 35.2l-31.5 39.5-3.3 2.9h28.5l-3.3 4.2h-28.5l-3.3 2.9h38.4l-3.3 4.2H51.7l-3.3 2.9h45.1l-3.3 4.2H45l-3.3 2.9h54.9l-3.3 4.2H38.3l-3.3 2.9h63.2l-3.3 4.2H31.7l-3.3 2.9h70l-3.3 4.2H25l-3.3 2.9h76.6l-3.3 4.2H15l-3.3 2.9h86.6l-3.3 4.2H1.7l-1.7 1.4V180h256V117.8l-1.7-1.4h-10v-4.2h10v-2.9h-10v-4.2h10v-2.9h-10v-4.2h10v-2.9h-10v-4.2h10v-2.9h-66.6l3.3-4.2h63.3v-2.9h-70l3.3-4.2h66.7v-2.9h-76.6l3.3-4.2h73.3v-2.9h-54.9l3.3-4.2h51.6v-2.9h-45.1l3.3-4.2h41.8v-2.9h-38.4l3.3-4.2h28.5v-2.9h-28.5l3.3-2.9L128 35.2zm-66.6 42.4h-3.4v-3h3.4v3zm136.6 0h-3.4v-3h3.4v3zm-136.6 5.8h-3.4v-3h3.4v3zm136.6 0h-3.4v-3h3.4v3zm-136.6 5.8h-3.4v-3h3.4v3zm136.6 0h-3.4v-3h3.4v3zm-136.6 5.7h-3.4v-3h3.4v3zm136.6 0h-3.4v-3h3.4v3zm-136.6 5.8h-3.4v-3h3.4v3zm136.6 0h-3.4v-3h3.4v3zm-136.6 5.8h-3.4v-3h3.4v3zm136.6 0h-3.4v-3h3.4v3zm-136.6 5.8h-3.4v-3h3.4v3zm136.6 0h-3.4v-3h3.4v3zm-136.6 5.8h-3.4v-3h3.4v3zm136.6 0h-3.4v-3h3.4v3z" />
  </svg>
);

export function Header() {
  return (
    <>
      <header className="w-full">
        <div className="container mx-auto flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
                <AngkorWatIcon />
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
