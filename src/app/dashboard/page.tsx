'use client';

import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, where, collectionGroup, doc } from 'firebase/firestore';
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
import { Pencil, PlusCircle, ShoppingBag, Briefcase, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  // --- QUERIES ---
  const jobsCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'jobs');
  }, [firestore]);
  
  const listingsCollectionRef = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'listings');
  }, [firestore]);

  const applicationsCollectionGroup = useMemo(() => {
    if (!firestore) return null;
    return collectionGroup(firestore, 'applications');
  }, [firestore]);

  // Query for recruiter's posted jobs
  const recruiterJobsQuery = useMemo(() => {
    if (!jobsCollectionRef || !user || userProfile?.userType !== 'recruiter') return null;
    return query(jobsCollectionRef, where('recruiterId', '==', user.uid));
  }, [jobsCollectionRef, user, userProfile]);

  // Query for user's listings
  const userListingsQuery = useMemo(() => {
    if (!listingsCollectionRef || !user) return null;
    return query(listingsCollectionRef, where('sellerId', '==', user.uid));
  }, [listingsCollectionRef, user]);

  // Query for standard user's applied jobs
  const appliedApplicationsQuery = useMemo(() => {
    if (!applicationsCollectionGroup || !user || userProfile?.userType !== 'standard') return null;
    return query(applicationsCollectionGroup, where('applicantId', '==', user.uid));
  }, [applicationsCollectionGroup, user, userProfile]);

  // --- DATA FETCHING ---
  const { data: recruiterJobs, isLoading: areRecruiterJobsLoading } = useCollection(recruiterJobsQuery);
  const { data: listings, isLoading: areListingsLoading } = useCollection(userListingsQuery);
  const { data: applications, isLoading: areApplicationsLoading } = useCollection(appliedApplicationsQuery);

  const appliedJobIds = useMemo(() => applications?.map(app => app.jobId) || [], [applications]);
  
  // Fetch details for applied jobs
  const appliedJobsQuery = useMemo(() => {
    if (!jobsCollectionRef || appliedJobIds.length === 0) return null;
    // Firestore 'in' queries are limited to 30 items. If this grows, pagination or a different approach is needed.
    return query(jobsCollectionRef, where('__name__', 'in', appliedJobIds.slice(0, 30)));
  }, [jobsCollectionRef, appliedJobIds]);
  const { data: appliedJobs, isLoading: areAppliedJobsLoading } = useCollection(appliedJobsQuery);


  const isLoading = isUserLoading || isProfileLoading || areRecruiterJobsLoading || areListingsLoading || areApplicationsLoading || areAppliedJobsLoading;
  const isRecruiter = userProfile?.userType === 'recruiter';

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
            {isRecruiter && (
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/jobs/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Post Job
                  </Link>
                </Button>
              </div>
            )}
             {!isRecruiter && (
                <Button asChild>
                  <Link href="/listings/new">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Post Item
                  </Link>
                </Button>
            )}
          </div>
          
          {isRecruiter ? (
            // --- RECRUITER VIEW ---
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Briefcase /> My Job Postings</CardTitle>
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
                    {isLoading && Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`job-skel-${i}`}>
                        <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && recruiterJobs && recruiterJobs.length > 0 ? (
                      recruiterJobs.map((job) => (
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
          ) : (
            // --- STANDARD USER VIEW ---
             <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText /> My Job Applications</CardTitle>
                <CardDescription>A list of all the jobs you have applied to.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`app-skel-${i}`}>
                        <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && appliedJobs && appliedJobs.length > 0 ? (
                      appliedJobs.map((job) => {
                        const application = applications?.find(app => app.jobId === job.id);
                        return (
                           <TableRow key={job.id}>
                            <TableCell className="font-medium">{job.title}</TableCell>
                            <TableCell>{job.companyName}</TableCell>
                            <TableCell>
                                <Badge variant={job.status === 'Closed' ? 'destructive' : 'secondary'} className="capitalize">
                                  {job.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                               {application?.appliedAt ? formatDistanceToNow(application.appliedAt.toDate(), { addSuffix: true }) : 'N/A'}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      !isLoading && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            You haven't applied to any jobs yet.
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          
          <Separator />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShoppingBag /> My Listings</CardTitle>
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
                  {isLoading && Array.from({ length: 3 }).map((_, i) => (
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
