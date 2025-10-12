

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { searchCambodia } from '@/ai/flows/search-flow';
import { SearchBox } from '@/components/search-box';
import { search } from '../actions';
import { Skeleton } from '@/components/ui/skeleton';

function SearchResults() {
  const searchParams = useSearchParams();
  const queryText = searchParams.get('q');
  const [loading, setLoading] = useState(!!queryText);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      if (!queryText) {
        setLoading(false);
        setResult(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const response = await searchCambodia({ query: queryText });
        setResult(response.answer);
      } catch (err) {
        console.error(err);
        setError('Sorry, something went wrong while searching. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    performSearch();
  }, [queryText]);

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-background text-foreground">
      <main className="w-full mt-4 flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-xl mx-auto mb-8">
            <SearchBox searchAction={search} />
        </div>
        
        <div className="max-w-3xl mx-auto">
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
            {!loading && !result && !error && !queryText && (
            <p className="text-center text-muted-foreground pt-8">
                Start a new search to see results.
            </p>
            )}
        </div>
      </main>
    </div>
  );
}


export default function SearchPage({
  searchParams,
}: {
  searchParams: { q: string };
}) {
  return (
    <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center"><p>Loading...</p></div>}>
      <SearchResults />
    </Suspense>
  );
}
