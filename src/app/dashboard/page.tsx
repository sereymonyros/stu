'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Pencil, PlusCircle, ShoppingBag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Jobs query
  const jobsCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'jobs');
  }, [firestore]);

  const recruiterJobsQuery = useMemo(() => {
    if (!jobsCollectionRef || !user) return null;
    return query(jobsCollectionRef, where('recruiterId', '==', user.uid));
  }, [jobsCollectionRef, user]);

  const { data: jobs, isLoading: areJobsLoading } = useCollection(recruiterJobsQuery);

  // Listings query
  const listingsCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'listings');
  }, [firestore]);
  
  const userListingsQuery = useMemo(() => {
    if (!listingsCollectionRef || !user) return null;
    return query(listingsCollectionRef, where('sellerId', '==', user.uid));
  }, [listingsCollectionRef, user]);

  const { data: listings, isLoading: areListingsLoading } = useCollection(userListingsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || areJobsLoading || areListingsLoading;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container mx-auto space-y-8">
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Manage your jobs and listings.</p>
            </div>
            <div className="flex gap-2">
                <Button asChild>
                <Link href="/jobs/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Post Job
                </Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/listings/new">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Post Item
                    </Link>
                </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>My Job Postings</CardTitle>
              <CardDescription>A list of all the jobs you have posted.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`job-skel-${i}`}>
                        <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                      </TableRow>
                    ))}
                  {!isLoading && jobs && jobs.length > 0 ? (
                    jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>
                          <Badge variant={job.status === 'Closed' ? 'destructive' : 'secondary'} className="capitalize">
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {job.createdAt ? formatDistanceToNow(job.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="icon">
                            <Link href={`/jobs/${job.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit Job</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    !isLoading && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          You haven't posted any jobs yet.
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Separator />
          
          <Card>
            <CardHeader>
              <CardTitle>My Listings</CardTitle>
              <CardDescription>A list of all the items you have listed for sale.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`listing-skel-${i}`}>
                        <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                      </TableRow>
                    ))}
                  {!isLoading && listings && listings.length > 0 ? (
                    listings.map((listing) => (
                      <TableRow key={listing.id}>
                        <TableCell className="font-medium">{listing.title}</TableCell>
                        <TableCell>
                          <Badge variant={listing.status === 'sold' ? 'destructive' : 'secondary'} className="capitalize">
                            {listing.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          ${listing.price}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="icon">
                            <Link href={`/listings/${listing.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit Listing</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    !isLoading && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          You haven't listed any items for sale yet.
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
