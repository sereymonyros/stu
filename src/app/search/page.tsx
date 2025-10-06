'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { searchCambodia } from '@/ai/flows/search-flow';
import { UserAuthButton } from '@/components/user-auth-button';
import { SearchBox } from '@/components/search-box';
import { search } from '../actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuLink, SidebarProvider, SidebarFooter } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function SearchHistory() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isClearing, setIsClearing] = useState(false);

  const queriesQuery = useMemo(() => {
    if (user && firestore) {
      return query(collection(firestore, `users/${user.uid}/searchQueries`), orderBy('timestamp', 'desc'));
    }
    return null;
  }, [user, firestore]);

  const { data: searchHistory, isLoading } = useCollection(queriesQuery);

  const handleClearHistory = async () => {
    if (!user || !firestore) return;
    setIsClearing(true);
    const queriesCollectionRef = collection(firestore, `users/${user.uid}/searchQueries`);
    
    try {
      const querySnapshot = await getDocs(queriesCollectionRef);
      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error clearing history: ", error);
    } finally {
      setIsClearing(false);
    }
  };


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
              <div className='p-2 space-y-2'>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
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
        {searchHistory && searchHistory.length > 0 && (
          <SidebarFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full" disabled={isClearing}>
                  {isClearing ? 'Clearing...' : 'Clear history'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    search history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarFooter>
        )}
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
