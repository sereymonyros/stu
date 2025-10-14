
'use client';

import { useMemo, useEffect, useState } from 'react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Briefcase, ClipboardList, FileText, Users, Heart, User, Search, Trash2, Send, BellDot } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { findJobMatches } from '@/ai/flows/find-job-matches-flow';
import { WithdrawApplicationButton } from '@/components/withdraw-application-button';


function JobCard({ job }: { job: any }) {
    const firestore = useFirestore();
    const applicantsQuery = useMemo(() => {
        if (!firestore || !job.id) return null;
        return collection(firestore, `jobs/${job.id}/applications`);
    }, [firestore, job.id]);

    const { data: applicants, isLoading } = useCollection(applicantsQuery);

    const destinationUrl = applicants && applicants.length > 0
        ? `/jobs/${job.id}/applicants`
        : `/jobs/${job.id}/edit`;

    return (
        <Link href={destinationUrl} className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
            <Card className="h-full relative overflow-hidden">
                 {isLoading ? (
                    <Skeleton className="absolute top-0 right-0 h-8 w-12 rounded-bl-lg" />
                ) : applicants && applicants.length > 0 ? (
                    <Badge variant="secondary" className="absolute top-0 right-0 flex items-center gap-1.5 z-10 px-3 py-1.5 rounded-bl-lg rounded-tr-lg text-sm">
                        {applicants.length === 1 ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                        {applicants.length}
                    </Badge>
                ) : null}
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex-grow">
                        <h3 className="font-semibold text-base truncate pr-8">{job.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{job.companyName} - {job.location}</p>
                        <div className="flex items-center gap-2 mb-3">
                            {job.jobType && <Badge variant="secondary">{job.jobType}</Badge>}
                            {job.status && <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize">{job.status}</Badge>}
                        </div>
                    </div>
                    <div className="flex justify-end items-center">
                        <Button variant="outline" size="sm" className="pointer-events-none w-full">
                           {applicants && applicants.length > 0 ? 'View Applicants' : 'Edit Job'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function AppliedJobCard({ job, application, isFavourite }: { job: any, application: any, isFavourite: boolean }) {
    if (!application) {
        return null;
    }

    const statusColors: { [key: string]: string } = {
        submitted: 'bg-blue-500 hover:bg-blue-600',
        reviewed: 'bg-yellow-500 hover:bg-yellow-600 text-black',
        offered: 'bg-purple-500 hover:bg-purple-600',
        accepted: 'bg-green-500 hover:bg-green-600',
        rejected: 'bg-red-500 hover:bg-red-600',
    }
    
    const canWithdraw = application.status === 'submitted' || application.status === 'reviewed';

    return (
        <Card>
            <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-base truncate pr-2">{job.title}</h3>
                        {isFavourite && (
                            <Heart className="h-5 w-5 flex-shrink-0 fill-red-500 text-red-500" title="Favorite Job" />
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{job.companyName} - {job.location}</p>
                </div>
                 <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Status:</span>
                        <Badge className={cn("capitalize text-white", statusColors[application.status] || 'bg-gray-500')}>{application.status}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button asChild variant="outline" size="sm">
                           <Link href={`/jobs/${job.id}/apply`}>View</Link>
                        </Button>
                        {canWithdraw && (
                            <WithdrawApplicationButton 
                                jobId={job.id} 
                            />
                        )}
                   </div>
                </div>
            </CardContent>
        </Card>
    );
}

function FavouriteJobCard({ job }: { job: any }) {
    return (
         <Card>
            <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex-grow">
                    <h3 className="font-semibold text-base truncate">{job.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{job.companyName} - {job.location}</p>
                    <div className="flex items-center gap-2 mb-3">
                       {job.jobType && <Badge variant="secondary">{job.jobType}</Badge>}
                       {job.status && <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize">{job.status}</Badge>}
                   </div>
                </div>
                <div className="flex justify-end">
                    <Button asChild variant="outline" size="sm">
                       <Link href={`/jobs/${job.id}/apply`}>View Job</Link>
                   </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function SavedSearchCard({ savedSearch, onExecute, onDelete, isDeleting, onNotify, isNotifying }: { savedSearch: any, onExecute: (search: any) => void, onDelete: (searchId: string) => void, isDeleting: boolean, onNotify: (searchId: string) => void, isNotifying: boolean }) {
    const { name, searchQuery, filters = {} } = savedSearch;
    const filterCount = (filters.companyNames?.length || 0) + (filters.locations?.length || 0) + (filters.jobTypes?.length || 0) + (filters.salaryMin || filters.salaryMax ? 1 : 0);

    return (
        <Card>
             <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex-grow">
                     <h3 className="font-semibold text-base truncate">{name}</h3>
                     {searchQuery && <p className="text-xs text-muted-foreground truncate mb-2">Query: "{searchQuery}"</p>}
                     <div className="mb-3">
                         {filterCount > 0 ? (
                            <Badge variant="secondary">{filterCount} {filterCount === 1 ? 'Filter' : 'Filters'}</Badge>
                        ) : (
                             <Badge variant="outline">No Filters</Badge>
                        )}
                     </div>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <Button onClick={() => onExecute(savedSearch)} size="sm" variant="outline" className="h-8 px-2">
                            <Search className="mr-1.5 h-4 w-4" /> Run
                        </Button>
                        <Button onClick={() => onNotify(savedSearch.id)} size="sm" variant="outline" className="h-8 px-2" disabled={isNotifying}>
                            <BellDot className="mr-1.5 h-4 w-4" /> Notify
                        </Button>
                    </div>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(savedSearch.id)} disabled={isDeleting}>
                         <Trash2 className="h-4 w-4" />
                         <span className="sr-only">Delete search</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [isDeletingSearch, setIsDeletingSearch] = useState(false);
    const [isSendingAlerts, setIsSendingAlerts] = useState(false);
    const [isSendingSingleAlert, setIsSendingSingleAlert] = useState<string | null>(null);


    useEffect(() => {
        if (!user) {
            router.replace('/login');
        }
    }, [user, router]);

    // --- User Profile ---
    const userProfileRef = useMemo(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile } = useDoc(userProfileRef);

    // --- Data Queries ---
    const isRecruiter = userProfile?.userType === 'recruiter';

    // This state gates all dependent queries, preventing race conditions.
    const shouldRunRoleQueries = userProfile;

    // For Recruiters: Fetch jobs they created
    const postedJobsQuery = useMemo(() => {
        if (!firestore || !user || !shouldRunRoleQueries || !isRecruiter) return null;
        return query(collection(firestore, 'jobs'), where('recruiterId', '==', user.uid));
    }, [firestore, user, isRecruiter, shouldRunRoleQueries]);
    const { data: postedJobs } = useCollection(postedJobsQuery);

    // For Standard Users: Fetch their applications (which now include status)
    const applicationsQuery = useMemo(() => {
        if (!firestore || !user || !shouldRunRoleQueries || isRecruiter) return null;
        return query(collection(firestore, `users/${user.uid}/applications`));
    }, [firestore, user, isRecruiter, shouldRunRoleQueries]);
    const { data: applications } = useCollection(applicationsQuery);

    // Create a map of jobId to application data
    const applicationMap = useMemo(() => {
        if (!applications) return new Map();
        return new Map(applications.map(app => [app.jobId, app]));
    }, [applications]);

    const appliedJobIds = useMemo(() => {
        return applications ? applications.map(app => app.jobId).filter(id => !!id) : [];
    }, [applications]);

    // For Standard Users: Fetch the details of the jobs they applied for
    const appliedJobsQuery = useMemo(() => {
        if (!applications || appliedJobIds.length === 0) {
            return null;
        }
        return query(collection(firestore, 'jobs'), where('__name__', 'in', appliedJobIds));
    }, [firestore, applications, appliedJobIds]);
    const { data: appliedJobs } = useCollection(appliedJobsQuery);

    // For Standard Users: Fetch their favorite jobs
    const favouriteJobsQuery = useMemo(() => {
        if (!firestore || !user || !shouldRunRoleQueries || isRecruiter) return null;
        return query(collection(firestore, `users/${user.uid}/favouriteJobs`));
    }, [firestore, user, isRecruiter, shouldRunRoleQueries]);
    const { data: favouriteJobsRefs } = useCollection(favouriteJobsQuery);

    const favouriteJobIds = useMemo(() => {
        return favouriteJobsRefs ? favouriteJobsRefs.map(fav => fav.jobId).filter(id => !!id) : [];
    }, [favouriteJobsRefs]);

    const favouriteJobIdsSet = useMemo(() => new Set(favouriteJobIds), [favouriteJobIds]);

    // Filter out favorite jobs that the user has already applied for
    const filteredFavouriteJobIds = useMemo(() => {
        return favouriteJobIds.filter(id => !appliedJobIds.includes(id));
    }, [favouriteJobIds, appliedJobIds]);


    const favouriteJobsDetailsQuery = useMemo(() => {
        if (!favouriteJobsRefs || filteredFavouriteJobIds.length === 0) {
            return null;
        }
        return query(collection(firestore, 'jobs'), where('__name__', 'in', filteredFavouriteJobIds));
    }, [firestore, favouriteJobsRefs, filteredFavouriteJobIds]);
    const { data: favouriteJobs } = useCollection(favouriteJobsDetailsQuery);

    // For Standard Users: Fetch their saved searches
    const savedSearchesQuery = useMemo(() => {
        if (!firestore || !user || !shouldRunRoleQueries || isRecruiter) return null;
        return query(collection(firestore, `users/${user.uid}/savedSearches`));
    }, [firestore, user, isRecruiter, shouldRunRoleQueries]);
    const { data: savedSearches } = useCollection(savedSearchesQuery);

    // --- Handlers ---
    const handleExecuteSearch = (savedSearch: any) => {
        const params = new URLSearchParams();
        if (savedSearch.searchQuery) {
            params.set('q', savedSearch.searchQuery);
        }
        savedSearch.filters?.companyNames?.forEach((c: string) => params.append('company', c));
        savedSearch.filters?.locations?.forEach((l: string) => params.append('location', l));
        savedSearch.filters?.jobTypes?.forEach((t: string) => params.append('jobType', t));
        if (savedSearch.filters?.salaryMin) params.set('salaryMin', savedSearch.filters.salaryMin);
        if (savedSearch.filters?.salaryMax) params.set('salaryMax', savedSearch.filters.salaryMax);
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
    
    const handleFindMatches = async () => {
        setIsSendingAlerts(true);
        toast({ title: "Processing Job Alerts...", description: "Finding matches for all users. This may take a moment." });
        try {
            const result = await findJobMatches({});
            toast({
                title: "Processing Complete!",
                description: `Sent ${result.emailsSent} emails for ${result.matchedJobs} matched jobs across ${result.processedUsers} users.`,
            });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Failed to Send Alerts", description: error.message });
        } finally {
            setIsSendingAlerts(false);
        }
    }

    const handleNotifyUser = async (searchId: string) => {
        if (!user) return;
        setIsSendingSingleAlert(searchId);
        toast({ title: "Checking for new jobs...", description: "This might take a moment." });
        try {
            const result = await findJobMatches({ userId: user.uid, searchId: searchId });
            if (result.emailsSent > 0) {
                 toast({
                    title: "Alert Sent!",
                    description: `We found ${result.matchedJobs} new job(s) and sent you an email.`,
                });
            } else {
                 toast({
                    title: "No New Jobs Found",
                    description: "There are no new jobs matching this search right now. Check back later!",
                });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to Get Alerts", description: error.message });
        } finally {
            setIsSendingSingleAlert(null);
        }
    }


    if (!user) {
        // The useEffect hook handles redirection, so we can return null here.
        return null;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-8 pb-16 md:pb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                </div>

                {isRecruiter && (
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            
                            {postedJobs && postedJobs.length > 0 && (
                                <Button onClick={handleFindMatches} disabled={isSendingAlerts}>
                                    <Send className="mr-2 h-4 w-4" />
                                    {isSendingAlerts ? 'Sending to All Users...' : 'Send Job Alerts to All'}
                                </Button>
                            )}
                        </div>
                        {postedJobs && postedJobs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                        {appliedJobs && appliedJobs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {appliedJobs.map(job => (
                                    <AppliedJobCard
                                        key={job.id}
                                        job={job}
                                        application={applicationMap.get(job.id)}
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

                    {favouriteJobs && favouriteJobs.length > 0 && (
                        <>
                        <Separator />
                        <section>
                            <h2 className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2"><Heart /> My Favorite Jobs</h2>
                             {favouriteJobs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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


                    {savedSearches && savedSearches.length > 0 && (
                       <>
                        <Separator />
                        <section>
                            <h2 className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2"><Search /> My Saved Searches</h2>
                             <CardDescription className="mb-4">Get instant email notifications for your saved searches.</CardDescription>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {savedSearches.map(search => (
                                    <SavedSearchCard
                                        key={search.id}
                                        savedSearch={search}
                                        onExecute={handleExecuteSearch}
                                        onDelete={handleDeleteSearch}
                                        isDeleting={isDeletingSearch}
                                        onNotify={handleNotifyUser}
                                        isNotifying={isSendingSingleAlert === search.id}
                                    />
                                ))}
                            </div>
                        </section>
                       </>
                    )}
                    </>
                )}
            </main>
        </div>
    );
}
