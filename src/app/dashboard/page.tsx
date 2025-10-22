

'use client';

import { useMemo, useEffect, useState } from 'react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Briefcase, ClipboardList, FileText, Users, Heart, User, Search, Trash2, Send, BellDot, Eye, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { findJobMatches } from '@/ai/flows/find-job-matches-flow';
import { WithdrawApplicationButton } from '@/components/withdraw-application-button';
import { JobCardBig } from '@/components/job-card-big';
import { setDoc, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';


function SavedSearchCard({ savedSearch, onExecute, onDelete, isDeleting, onNotify, isNotifying }: { savedSearch: any, onExecute: (search: any) => void, onDelete: (searchId: string) => void, isDeleting: boolean, onNotify: (searchId: string) => void, isNotifying: boolean }) {
    const { name, searchQuery, filters = {} } = savedSearch;
    const filterCount = (filters.companyNames?.length || 0) + (filters.locations?.length || 0) + (filters.jobTypes?.length || 0) + (filters.salaryMin || filters.salaryMax ? 1 : 0);

    return (
        <Card className="rounded-3xl">
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
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(savedSearch.id)} disabled={isDeleting}>
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

    const appliedJobIds = useMemo(() => {
        return applications ? applications.map(app => app.jobId).filter(id => !!id) : [];
    }, [applications]);
    
    const appliedJobIdsSet = useMemo(() => new Set(appliedJobIds), [appliedJobIds]);


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
        return favouriteJobIds.filter(id => !appliedJobIdsSet.has(id));
    }, [favouriteJobIds, appliedJobIdsSet]);


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
    
    const handleToggleFavourite = async (jobId: string, isCurrentlyFavourite: boolean) => {
        if (!user || !firestore) {
            router.push('/login');
            return;
        }

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }

        const favDocRef = doc(firestore, `users/${user.uid}/favouriteJobs`, jobId);

        try {
            if (isCurrentlyFavourite) {
                await deleteDoc(favDocRef);
            } else {
                const favouriteData = { jobId, favouritedAt: serverTimestamp() };
                await setDoc(favDocRef, favouriteData);
            }
        } catch (error: any) {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: favDocRef.path,
                operation: isCurrentlyFavourite ? 'delete' : 'create'
            }));
            toast({ variant: "destructive", title: "An error occurred", description: "You may not have permission to perform this action." });
        }
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
        <div className="flex flex-col  ">
            <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-8 pb-10">
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
                                {postedJobs.map(job => (
                                     <JobCardBig 
                                        key={job.id}
                                        job={job}
                                        isFavourite={false}
                                        onToggleFavourite={async () => {}}
                                        hasApplied={false}
                                        isRecruiter={true}
                                     />
                                ))}
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
                                    <JobCardBig
                                        key={job.id}
                                        job={job}
                                        isFavourite={favouriteJobIdsSet.has(job.id)}
                                        onToggleFavourite={handleToggleFavourite}
                                        hasApplied={true}
                                        isRecruiter={false}
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
                            <h2 className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2"><Heart />Favorite Jobs</h2>
                             {favouriteJobs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {favouriteJobs.map(job => (
                                         <JobCardBig
                                            key={job.id}
                                            job={job}
                                            isFavourite={true}
                                            onToggleFavourite={handleToggleFavourite}
                                            hasApplied={false}
                                            isRecruiter={false}
                                        />
                                    ))}
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
