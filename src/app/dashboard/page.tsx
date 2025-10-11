
'use client';

import { useMemo, useEffect, useState } from 'react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Briefcase, ClipboardList, FileText, Users, Heart, User, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


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
                    ) : applicants && applicants.length > 0 ? (
                        <Badge variant="outline" className="flex items-center gap-1">
                           {applicants.length === 1 ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                           {applicants.length} {applicants.length === 1 ? 'Applicant' : 'Applicants'}
                        </Badge>
                    ) : null}
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

function SavedSearchCard({ savedSearch, onExecute, onDelete, isDeleting }: { savedSearch: any, onExecute: (search: any) => void, onDelete: (searchId: string) => void, isDeleting: boolean }) {
    const { name, searchQuery, filters } = savedSearch;
    const filterCount = (filters.companyNames?.length || 0) + (filters.locations?.length || 0) + (filters.jobTypes?.length || 0);

    return (
        <Card className="flex flex-col justify-between">
            <CardHeader>
                <CardTitle className="text-lg">{name}</CardTitle>
                 {searchQuery && <CardDescription>Query: "{searchQuery}"</CardDescription>}
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {filterCount > 0 ? (
                        <Badge variant="secondary">{filterCount} {filterCount === 1 ? 'Filter' : 'Filters'} Applied</Badge>
                    ) : (
                         <Badge variant="outline">No Filters</Badge>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button onClick={() => onExecute(savedSearch)}>
                    <Search className="mr-2 h-4 w-4" /> Run Search
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(savedSearch.id)} disabled={isDeleting}>
                     <Trash2 className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    )
}

export default function DashboardPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [isDeletingSearch, setIsDeletingSearch] = useState(false);

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

    const appliedJobIds = useMemo(() => {
        if (!applications) return [];
        return applications.map(app => app.jobId);
    }, [applications]);

    // For Standard Users: Fetch the details of the jobs they applied for
    const appliedJobsQuery = useMemo(() => {
        // Return null if loading, applications is still null, or there are no IDs to query. This prevents an invalid Firestore query.
        if (areApplicationsLoading || !applications || appliedJobIds.length === 0) {
            return null;
        }
        return query(collection(firestore, 'jobs'), where('__name__', 'in', appliedJobIds));
    }, [firestore, areApplicationsLoading, applications, appliedJobIds]);
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
        // Return null if loading, refs are null, or there are no IDs to query. This prevents an invalid Firestore query.
        if (areFavouritesLoading || !favouriteJobsRefs || filteredFavouriteJobIds.length === 0) {
            return null;
        }
        return query(collection(firestore, 'jobs'), where('__name__', 'in', filteredFavouriteJobIds));
    }, [firestore, areFavouritesLoading, favouriteJobsRefs, filteredFavouriteJobIds]);
    const { data: favouriteJobs, isLoading: areFavouriteJobsDetailsLoading } = useCollection(favouriteJobsDetailsQuery);

    // For Standard Users: Fetch their saved searches
    const savedSearchesQuery = useMemo(() => {
        if (!firestore || !shouldRunRoleQueries || isRecruiter) return null;
        return query(collection(firestore, `users/${user.uid}/savedSearches`));
    }, [firestore, user, isRecruiter, shouldRunRoleQueries]);
    const { data: savedSearches, isLoading: areSavedSearchesLoading } = useCollection(savedSearchesQuery);

    // --- Saved Search Handlers ---
    const handleExecuteSearch = (savedSearch: any) => {
        const params = new URLSearchParams();
        if (savedSearch.searchQuery) {
            params.set('q', savedSearch.searchQuery);
        }
        savedSearch.filters.companyNames?.forEach((c: string) => params.append('company', c));
        savedSearch.filters.locations?.forEach((l: string) => params.append('location', l));
        savedSearch.filters.jobTypes?.forEach((t: string) => params.append('jobType', t));
        router.push(`/jobs?${params.toString()}`);
    };

    const handleDeleteSearch = async (searchId: string) => {
        if (!user || !firestore) return;
        setIsDeletingSearch(true);
        const searchDocRef = doc(firestore, `users/${user.uid}/savedSearches`, searchId);
        try {
            await deleteDoc(searchDocRef);
            toast({ title: "Search Deleted", description: "The saved search has been removed." });
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: searchDocRef.path,
                operation: 'delete'
            }));
            toast({ variant: "destructive", title: "Delete failed", description: "Could not delete the saved search." });
        } finally {
            setIsDeletingSearch(false);
        }
    };


    // --- Loading and Rendering Logic ---
    const isLoading = isUserLoading || isProfileLoading;
    const isStandardUserDashboardLoading = areApplicationsLoading || areAppliedJobsLoading || areFavouritesLoading || areFavouriteJobsDetailsLoading || areSavedSearchesLoading;

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
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
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

                    <Separator />

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
                    
                    <Separator />
                    
                    <section>
                        <h2 className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2"><Search /> My Saved Searches</h2>
                        {isStandardUserDashboardLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                            </div>
                        ) : savedSearches && savedSearches.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {savedSearches.map(search => (
                                    <SavedSearchCard
                                        key={search.id}
                                        savedSearch={search}
                                        onExecute={handleExecuteSearch}
                                        onDelete={handleDeleteSearch}
                                        isDeleting={isDeletingSearch}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-3">
                                <Search className="mx-auto h-10 w-10 text-muted-foreground" />
                                <h3 className="text-xl font-semibold">No saved searches yet</h3>
                                <p className="text-muted-foreground">Save a search on the jobs page to see it here.</p>
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
