'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { searchCambodia } from '@/ai/flows/search-flow';
import { UserAuthButton } from '@/components/user-auth-button';
import { SearchBox } from '@/components/search-box';
import { search } from '../actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, useCollection, errorEmitter } from '@/firebase';
import { addDoc, collection, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuLink, SidebarProvider } from '@/components/ui/sidebar';
import Link from 'next/link';
import { FirestorePermissionError } from '@/firebase/errors';

function SearchHistory() {
  const { user } = useUser();
  const firestore = useFirestore();

  const queriesQuery = useMemo(() => {
    if (user) {
      return query(collection(firestore, `users/${user.uid}/searchQueries`), orderBy('timestamp', 'desc'));
    }
    return null;
  }, [user, firestore]);

  const { data: searchHistory, isLoading } = useCollection(queriesQuery);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarGroup>
            <SidebarGroupLabel>Recent Searches</SidebarGroupLabel>
          </SidebarGroup>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {isLoading && (
              <>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </>
            )}
            {searchHistory?.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuLink href={`/search?q=${encodeURIComponent(item.queryText)}`} className="w-full">
                  {item.queryText}
                </SidebarMenuLink>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <SearchResults />
      </SidebarInset>
    </SidebarProvider>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const queryText = searchParams.get('q');
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (queryText) {
      setLoading(true);
      setError(null);
      setResult(null);

      // Save search query to Firestore if user is logged in
      if (user && firestore) {
        const queriesCollection = collection(firestore, `users/${user.uid}/searchQueries`);
        const searchData = {
          queryText: queryText,
          timestamp: serverTimestamp(),
        };
        addDoc(queriesCollection, searchData).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: queriesCollection.path,
                operation: 'create',
                requestResourceData: searchData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
      }

      searchCambodia({ query: queryText })
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
  }, [queryText, user, firestore]);

  return (
    <div className="flex flex-col items-center w-full">
      <header className="w-full flex items-center justify-between p-4 border-b">
        <Link href="/" className="text-2xl font-bold">Cambodia Hub</Link>
        <div className="w-full max-w-xl px-4">
          <SearchBox searchAction={search} />
        </div>
        <UserAuthButton />
      </header>
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
        {!loading && !result && !error && !queryText && (
          <p className="text-center text-muted-foreground">
            Start a new search to see results.
          </p>
        )}
      </div>
    </div>
  );
}


export default function SearchPage() {
  const { user, isUserLoading } = useUser();

  return (
    <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center"><p>Loading...</p></div>}>
      <main className="min-h-screen bg-background text-foreground">
        {isUserLoading ? (
            <div className="flex min-h-screen items-center justify-center">
                <p>Loading...</p>
            </div>
        ) : user ? (
          <SearchHistory />
        ) : (
          <SearchResults />
        )}
      </main>
    </Suspense>
  );
}
