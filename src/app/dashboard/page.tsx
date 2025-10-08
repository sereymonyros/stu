'use client';

import { useMemo, useEffect } from 'react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc, collectionGroup } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Briefcase, Store, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';

function JobCard({ job }: { job: any }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">{job.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{job.companyName} - {job.location}</p>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    {job.jobType && <Badge variant="secondary">{job.jobType}</Badge>}
                    {job.status && <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize">{job.status}</Badge>}
                </div>
            </CardContent>
            <CardFooter>
                 <Button asChild variant="outline">
                    <Link href={`/jobs/${job.id}/edit`}>View Details</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

function ListingCard({ listing }: { listing: any }) {
    return (
        <Card className="overflow-hidden">
            <div className="aspect-square relative w-full">
                <Image 
                    src={listing.imageUrls?.[0] || 'https://picsum.photos/seed/default/600/600'} 
                    alt={listing.title} 
                    fill 
                    className="object-cover" 
                />
            </div>
            <CardHeader>
                <CardTitle className="text-xl truncate">{listing.title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-lg font-bold text-primary">${listing.price}</p>
            </CardContent>
            <CardFooter>
                <Button asChild variant="outline">
                    <Link href={`/listings/${listing.id}/edit`}>View Details</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}


export default function DashboardPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/login');
        }
    }, [user, isUserLoading, router]);

    // --- User Profile ---
    const userProfileRef = useMemo(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    // --- Data Queries ---
    const isRecruiter = userProfile?.userType === 'recruiter';
    const isStandard = userProfile?.userType === 'standard';

    // Add a check to ensure the user profile has loaded OR user is null (for safe rendering)
    const shouldRunRoleQueries = user && !isProfileLoading && userProfile; // Only run if profile data is confirmed present

    // For Recruiters: Fetch jobs they created
    const postedJobsQuery = useMemo(() => {
        // Check for shouldRunRoleQueries, then check the role
        if (!firestore || !shouldRunRoleQueries || userProfile?.userType !== 'recruiter') {
            return null;
        }
        return query(collection(firestore, 'jobs'), where('recruiterId', '==', user.uid));
    }, [firestore, user, userProfile, shouldRunRoleQueries]);
    const { data: postedJobs, isLoading: isPostedJobsLoading } = useCollection(postedJobsQuery);

    // For All Users: Fetch listings they created
    const myListingsQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'listings'), where('sellerId', '==', user.uid));
    }, [firestore, user]);
    const { data: myListings, isLoading: isMyListingsLoading } = useCollection(myListingsQuery);

    // For Standard Users: Fetch job applications
    const appliedApplicationsQuery = useMemo(() => {
        // Check for shouldRunRoleQueries, then check the role
        if (!firestore || !shouldRunRoleQueries || userProfile?.userType !== 'standard') {
            return null;
        }
        return query(collectionGroup(firestore, 'applications'), where('applicantId', '==', user.uid));
    }, [firestore, user, userProfile, shouldRunRoleQueries]);
    const { data: applications, isLoading: areApplicationsLoading } = useCollection(appliedApplicationsQuery);

    // For Standard Users: Fetch job details based on applications
    const appliedJobIds = useMemo(() => applications?.map(app => app.jobId) || [], [applications]);
    
    const appliedJobsQuery = useMemo(() => {
        // CRITICAL FIX: Do not run this query until the applications have finished loading and we have job IDs.
        if (!firestore || !isStandard || areApplicationsLoading || appliedJobIds.length === 0) {
            return null;
        }
        
        return query(collection(firestore, 'jobs'), where('__name__', 'in', appliedJobIds));
    }, [firestore, isStandard, areApplicationsLoading, appliedJobIds]);
    const { data: appliedJobs, isLoading: areAppliedJobsLoading } = useCollection(appliedJobsQuery);


    // --- Loading and Rendering Logic ---
    if (isUserLoading || isProfileLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </main>
            </div>
        );
    }
    
    if (!user) {
        return null; // Redirect is handled by the useEffect
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
                    <p className="text-muted-foreground">Manage your activity on Cambodia Hub.</p>
                </div>

                {isRecruiter && (
                    <section>
                        <h2 className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2"><Briefcase /> My Job Postings</h2>
                        {isPostedJobsLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                            </div>
                        ) : postedJobs && postedJobs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {postedJobs.map(job => <JobCard key={job.id} job={job} />)}
                            </div>
                        ) : (
                             <div className="text-center py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-3">
                                <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
                                <h3 className="text-xl font-semibold">No jobs posted yet</h3>
                                <p className="text-muted-foreground">Post a job to attract top talent.</p>
                                <Button asChild><Link href="/jobs/new">Post a Job</Link></Button>
                            </div>
                        )}
                    </section>
                )}

                {isStandard && (
                    <section>
                         <h2 className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2"><Briefcase /> My Job Applications</h2>
                         {
                           areApplicationsLoading || (applications && applications.length > 0 && areAppliedJobsLoading) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                            </div>
                        ) : appliedJobs && appliedJobs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {appliedJobs.map(job => <JobCard key={job.id} job={job} />)}
                            </div>
                        ) : (
                             <div className="text-center py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-3">
                                <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
                                <h3 className="text-xl font-semibold">You haven't applied to any jobs yet</h3>
                                <p className="text-muted-foreground">Browse open positions and find your next opportunity.</p>
                                <Button asChild><Link href="/jobs">Browse Jobs</Link></Button>
                            </div>
                        )}
                    </section>
                )}


                <section>
                    <h2 className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2"><Store /> My Listings</h2>
                    {isMyListingsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                             {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                        </div>
                    ) : myListings && myListings.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {myListings.map(listing => <ListingCard key={listing.id} listing={listing} />)}
                        </div>
                    ) : (
                         <div className="text-center py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-3">
                            <Store className="mx-auto h-10 w-10 text-muted-foreground" />
                            <h3 className="text-xl font-semibold">You have no active listings</h3>
                            <p className="text-muted-foreground">Sell your items and reach buyers across the country.</p>
                            <Button asChild><Link href="/listings/new">Post an Item</Link></Button>
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
}
