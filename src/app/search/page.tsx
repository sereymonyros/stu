'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { searchCambodia } from '@/ai/flows/search-flow';
import { UserAuthButton } from '@/components/user-auth-button';
import { SearchBox } from '@/components/search-box';
import { search } from '../actions';
import { Skeleton } from '@/components/ui/skeleton';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query) {
      setLoading(true);
      setError(null);
      setResult(null);
      searchCambodia({ query })
        .then((response) => {
          setResult(response.answer);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError('Sorry, something went wrong while searching. Please try again.');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-3xl mt-4">
        {loading && (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}
        {error && <p className="text-destructive text-center">{error}</p>}
        {result && (
          <div
            className="prose dark:prose-invert max-w-none p-4"
            dangerouslySetInnerHTML={{ __html: result }}
          />
        )}
        {!loading && !result && !error && !query && (
          <p className="text-center text-muted-foreground">
            Start a new search to see results.
          </p>
        )}
      </div>
    </div>
  );
}


export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center"><p>Loading...</p></div>}>
      <main className="min-h-screen flex flex-col items-center bg-background text-foreground">
        <header className="w-full flex items-center justify-between p-4 border-b">
          <Link href="/" className="text-2xl font-bold">Cambodia Hub</Link>
          <div className="w-full max-w-xl px-4">
            <SearchBox searchAction={search} />
          </div>
          <UserAuthButton />
        </header>
        <SearchResults />
      </main>
    </Suspense>
  );
}

import Link from 'next/link';
