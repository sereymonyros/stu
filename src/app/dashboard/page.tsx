
'use client';

import { useMemo, useEffect } from 'react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Briefcase, ClipboardList, FileText, Users, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

function JobCard({ job }: { job: any }) {
    const firestore = useFirestore();
    const applicantsQuery = useMemo(() => {
        if (!firestore || !job.id) return null;
        return collection(firestore, `jobs/${job.id}/applications`);
    }, [firestore, job.id]);

    const { data: applicants, isLoading } = useCollection(applicantsQuery);

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
                     {isLoading ? (
                        <Skeleton className="h-6 w-16 rounded-full" />
                    ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                           <Users className="h-3 w-3" />
                           {applicants?.length || 0} {applicants?.length === 1 ? 'Applicant' : 'Applicants'}
                        </Badge>
                    )}
                </div>
            </CardContent>
            <CardFooter>
                 <Button asChild variant="outline">
                    <Link href={`/jobs/${job.id}/applicants`}>View Applicants</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

function AppliedJobCard({ job, applicationStatus, isFavourite }: { job: any, applicationStatus: string, isFavourite: boolean }) {

    const statusColors: { [key: string]: string } = {
        submitted: 'bg-blue-500 hover:bg-blue-600',
        reviewed: 'bg-yellow-500 hover:bg-yellow-600 text-black',
        offered: 'bg-purple-500 hover:bg-purple-600',
        accepted: 'bg-green-500 hover:bg-green-600',
        rejected: 'bg-red-500 hover:bg-red-600',
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{job.companyName} - {job.location}</p>
                    </div>
                    {isFavourite && (
                        <Heart className="h-5 w-5 fill-red-500 text-red-500" title="Favorite Job" />
                    )}
                </div>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Status:</span>
                    <Badge className={cn("capitalize text-white", statusColors[applicationStatus] || 'bg-gray-500')}>{applicationStatus}</Badge>
                </div>
            </CardContent>
            <CardFooter>
                 <Button asChild variant="outline">
                    <Link href={`/jobs/${job.id}/apply`}>View Job</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

function FavouriteJobCard({ job }: { job: any }) {
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
                    <Link href={`/jobs/${job.id}/apply`}>View Job</Link>
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
    
    // This state gates all dependent queries, preventing race conditions.
    const shouldRunRoleQueries = user && !isProfileLoading && userProfile;

    // For Recruiters: Fetch jobs they created
    const postedJobsQuery = useMemo(() => {
        if (!firestore || !shouldRunRoleQueries || !isRecruiter) return null;
        return query(collection(firestore, 'jobs'), where('recruiterId', '==', user.uid));
    }, [firestore, user, isRecruiter, shouldRunRoleQueries]);
    const { data: postedJobs, isLoading: isPostedJobsLoading } = useCollection(postedJobsQuery);

    // For Standard Users: Fetch their applications (which now include status)
    const applicationsQuery = useMemo(() => {
        if (!firestore || !shouldRunRoleQueries || isRecruiter) return null;
        return query(collection(firestore, `users/${user.uid}/applications`));
    }, [firestore, user, isRecruiter, shouldRunRoleQueries]);
    const { data: applications, isLoading: areApplicationsLoading } = useCollection(applicationsQuery);
    
    // Create a map of jobId to application status
    const applicationStatusMap = useMemo(() => {
        if (!applications) return new Map();
        return new Map(applications.map(app => [app.jobId, app.status]));
    }, [applications]);

    const appliedJobIds = useMemo(() => Array.from(applicationStatusMap.keys()), [applicationStatusMap]);

    // For Standard Users: Fetch the details of the jobs they applied for
    const appliedJobsQuery = useMemo(() => {
        if (!firestore || areApplicationsLoading || !appliedJobIds || appliedJobIds.length === 0) {
            return null;
        }
        return query(collection(firestore, 'jobs'), where('__name__', 'in', appliedJobIds));
    }, [firestore, areApplicationsLoading, appliedJobIds]);
    const { data: appliedJobs, isLoading: areAppliedJobsLoading } = useCollection(appliedJobsQuery);
    
    // For Standard Users: Fetch their favorite jobs
    const favouriteJobsQuery = useMemo(() => {
        if (!firestore || !shouldRunRoleQueries || isRecruiter) return null;
        return query(collection(firestore, `users/${user.uid}/favouriteJobs`));
    }, [firestore, user, isRecruiter, shouldRunRoleQueries]);
    const { data: favouriteJobsRefs, isLoading: areFavouritesLoading } = useCollection(favouriteJobsQuery);

    const favouriteJobIds = useMemo(() => {
        if (!favouriteJobsRefs) return [];
        return favouriteJobsRefs.map(fav => fav.jobId);
    }, [favouriteJobsRefs]);
    
    const favouriteJobIdsSet = useMemo(() => new Set(favouriteJobIds), [favouriteJobIds]);

    // Filter out favorite jobs that the user has already applied for
    const filteredFavouriteJobIds = useMemo(() => {
        return favouriteJobIds.filter(id => !appliedJobIds.includes(id));
    }, [favouriteJobIds, appliedJobIds]);


    const favouriteJobsDetailsQuery = useMemo(() => {
        if (!firestore || areFavouritesLoading || !filteredFavouriteJobIds || filteredFavouriteJobIds.length === 0) {
            return null;
        }
        return query(collection(firestore, 'jobs'), where('__name__', 'in', filteredFavouriteJobIds));
    }, [firestore, areFavouritesLoading, filteredFavouriteJobIds]);
    const { data: favouriteJobs, isLoading: areFavouriteJobsDetailsLoading } = useCollection(favouriteJobsDetailsQuery);

    // --- Loading and Rendering Logic ---
    const isLoading = isUserLoading || isProfileLoading;
    const isStandardUserDashboardLoading = areApplicationsLoading || areAppliedJobsLoading || areFavouritesLoading || areFavouriteJobsDetailsLoading;

    if (isLoading) {
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
        // The useEffect hook handles redirection, so we can return null here.
        return null;
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

                {!isRecruiter && (
                    <>
                     <section>
                        <h2 className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2"><FileText /> My Job Applications</h2>
                        {isStandardUserDashboardLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                            </div>
                        ) : appliedJobs && appliedJobs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {appliedJobs.map(job => (
                                    <AppliedJobCard 
                                        key={job.id} 
                                        job={job} 
                                        applicationStatus={applicationStatusMap.get(job.id) || 'submitted'}
                                        isFavourite={favouriteJobIdsSet.has(job.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-3">
                                <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                                <h3 className="text-xl font-semibold">You haven't applied for any jobs yet</h3>
                                <p className="text-muted-foreground">Find your next opportunity on the job board.</p>
                                <Button asChild><Link href="/jobs">Browse Jobs</Link></Button>
                            </div>
                        )}
                    </section>
                    <section>
                        <h2 className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2"><Heart /> My Favorite Jobs</h2>
                         {isStandardUserDashboardLoading ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                            </div>
                         ) : favouriteJobs && favouriteJobs.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {favouriteJobs.map(job => <FavouriteJobCard key={job.id} job={job} />)}
                            </div>
                         ) : (
                              <div className="text-center py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-3">
                                <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
                                <h3 className="text-xl font-semibold">No favorite jobs yet</h3>
                                <p className="text-muted-foreground">Browse jobs and save your favorites to find them here later.</p>
                                <Button asChild><Link href="/jobs">Browse Jobs</Link></Button>
                            </div>
                         )}
                    </section>
                    </>
                )}

            </main>
        </div>
    );
}
