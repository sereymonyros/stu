

'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc, deleteDoc, getDocs, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
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
import { JobCardBig } from '@/components/job-card-big';
import { setDoc, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { LoadMoreButton } from '@/components/load-more-button';

const JOBS_PER_PAGE = 8;


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

    // --- User Profile ---
    const userProfileRef = useMemo(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile } = useDoc(userProfileRef);
    const isRecruiter = userProfile?.userType === 'recruiter';
    const isStandardUser = userProfile?.userType === 'standard';

    // --- State for Data, Loading, and Pagination ---
    const [postedJobs, setPostedJobs] = useState<any[]>([]);
    const [appliedJobs, setAppliedJobs] = useState<any[]>([]);
    const [favouriteJobs, setFavouriteJobs] = useState<any[]>([]);
    const [savedSearches, setSavedSearches] = useState<any[]>([]);

    const [isLoadingPosted, setIsLoadingPosted] = useState(true);
    const [isLoadingApplied, setIsLoadingApplied] = useState(true);
    const [isLoadingFavourites, setIsLoadingFavourites] = useState(true);

    const [lastPosted, setLastPosted] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [lastAppliedRef, setLastAppliedRef] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [lastFavouriteRef, setLastFavouriteRef] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

    const [hasMorePosted, setHasMorePosted] = useState(true);
    const [hasMoreApplied, setHasMoreApplied] = useState(true);
    const [hasMoreFavourites, setHasMoreFavourites] = useState(true);
    
    // Simple collection fetches that don't need pagination
    const { data: savedSearchesData } = useCollection(useMemo(() => (firestore && user && isStandardUser) ? collection(firestore, `users/${user.uid}/savedSearches`) : null, [firestore, user, isStandardUser]));
    const { data: favouriteJobRefs } = useCollection(useMemo(() => (firestore && user && isStandardUser) ? collection(firestore, `users/${user.uid}/favouriteJobs`) : null, [firestore, user, isStandardUser]));
    const favouriteJobIdsSet = useMemo(() => new Set(favouriteJobRefs?.map(fav => fav.jobId) || []), [favouriteJobRefs]);


    useEffect(() => {
        if (!user) router.replace('/login');
    }, [user, router]);
    
    useEffect(() => {
        if (savedSearchesData) setSavedSearches(savedSearchesData);
    }, [savedSearchesData]);

    // --- Data Fetching Callbacks ---
    const fetchPostedJobs = useCallback(async (loadMore = false) => {
        if (!user || !isRecruiter) {
            setIsLoadingPosted(false);
            return;
        }
        if (!loadMore) setIsLoadingPosted(true);

        let q = query(collection(firestore, 'jobs'), where('recruiterId', '==', user.uid), limit(JOBS_PER_PAGE));
        if (loadMore && lastPosted) {
            q = query(q, startAfter(lastPosted));
        }

        const snapshot = await getDocs(q);
        
        const newJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Sort client-side
        const sortedJobs = newJobs.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return dateB - dateA;
        });

        setLastPosted(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMorePosted(newJobs.length === JOBS_PER_PAGE);
        setPostedJobs(prev => loadMore ? [...prev, ...sortedJobs] : sortedJobs);
        setIsLoadingPosted(false);
    }, [user, isRecruiter, firestore, lastPosted]);

    const fetchAppliedJobs = useCallback(async (loadMore = false) => {
        if (!user || !isStandardUser) {
            setIsLoadingApplied(false);
            return;
        }
        if (!loadMore) setIsLoadingApplied(true);

        // 1. Fetch references from the user's subcollection
        let refQuery = query(collection(firestore, `users/${user.uid}/applications`), orderBy('appliedAt', 'desc'), limit(JOBS_PER_PAGE));
        if (loadMore && lastAppliedRef) {
            refQuery = query(refQuery, startAfter(lastAppliedRef));
        }

        const refSnapshot = await getDocs(refQuery);
        const newRefs = refSnapshot.docs;
        const jobIds = newRefs.map(refDoc => refDoc.id);

        setLastAppliedRef(newRefs[newRefs.length - 1] || null);
        setHasMoreApplied(newRefs.length === JOBS_PER_PAGE);

        if (jobIds.length === 0) {
            setIsLoadingApplied(false);
            if (!loadMore) setAppliedJobs([]);
            return;
        }

        // 2. Fetch the actual job documents
        const jobsQuery = query(collection(firestore, 'jobs'), where('__name__', 'in', jobIds));
        const jobsSnapshot = await getDocs(jobsQuery);
        const jobsById = new Map(jobsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
        
        // Preserve the order from the reference query
        const newJobs = jobIds.map(id => jobsById.get(id)).filter(Boolean);

        setAppliedJobs(prev => loadMore ? [...prev, ...newJobs] : newJobs);
        setIsLoadingApplied(false);
    }, [user, isStandardUser, firestore, lastAppliedRef]);
    
    const fetchFavouriteJobs = useCallback(async (loadMore = false) => {
        if (!user || !isStandardUser) {
            setIsLoadingFavourites(false);
            return;
        }
        if (!loadMore) setIsLoadingFavourites(true);

        let refQuery = query(collection(firestore, `users/${user.uid}/favouriteJobs`), orderBy('favouritedAt', 'desc'), limit(JOBS_PER_PAGE));
        if (loadMore && lastFavouriteRef) {
            refQuery = query(refQuery, startAfter(lastFavouriteRef));
        }

        const refSnapshot = await getDocs(refQuery);
        const newRefs = refSnapshot.docs;
        const jobIds = newRefs.map(refDoc => refDoc.id);

        setLastFavouriteRef(newRefs[newRefs.length - 1] || null);
        setHasMoreFavourites(newRefs.length === JOBS_PER_PAGE);

        if (jobIds.length === 0) {
            setIsLoadingFavourites(false);
            if (!loadMore) setFavouriteJobs([]);
            return;
        }

        const jobsQuery = query(collection(firestore, 'jobs'), where('__name__', 'in', jobIds));
        const jobsSnapshot = await getDocs(jobsQuery);
        const jobsById = new Map(jobsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
        
        const newJobs = jobIds.map(id => jobsById.get(id)).filter(Boolean);

        setFavouriteJobs(prev => loadMore ? [...prev, ...newJobs] : newJobs);
        setIsLoadingFavourites(false);
    }, [user, isStandardUser, firestore, lastFavouriteRef]);

    // Initial data fetch
    useEffect(() => {
        if (user) {
            if (isRecruiter) fetchPostedJobs();
            if (isStandardUser) {
                fetchAppliedJobs();
                fetchFavouriteJobs();
            }
        }
    }, [user, isRecruiter, isStandardUser, fetchPostedJobs, fetchAppliedJobs, fetchFavouriteJobs]);

    // --- Handlers ---
    const [isDeletingSearch, setIsDeletingSearch] = useState(false);
    const [isSendingAlerts, setIsSendingAlerts] = useState(false);
    const [isSendingSingleAlert, setIsSendingSingleAlert] = useState<string | null>(null);


    const handleExecuteSearch = (savedSearch: any) => {
        const params = new URLSearchParams();
        if (savedSearch.searchQuery) params.set('q', savedSearch.searchQuery);
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
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
        const favDocRef = doc(firestore, `users/${user.uid}/favouriteJobs`, jobId);
        try {
            if (isCurrentlyFavourite) {
                await deleteDoc(favDocRef);
            } else {
                await setDoc(favDocRef, { jobId, favouritedAt: serverTimestamp() });
            }
        } catch (error: any) {
             errorEmitter.emit('permission-error', new FirestorePermissionError({ path: favDocRef.path, operation: isCurrentlyFavourite ? 'delete' : 'create' }));
             toast({ variant: "destructive", title: "An error occurred", description: "You may not have permission to perform this action." });
        }
    };

    const handleDeleteSearch = async (searchId: string) => {
        if (!user || !firestore) return;
        setIsDeletingSearch(true);
        const searchDocRef = doc(firestore, `users/${user.uid}/savedSearches`, searchId);
        try {
            await deleteDoc(searchDocRef);
            toast({ title: "Search Deleted" });
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: searchDocRef.path, operation: 'delete' }));
            toast({ variant: "destructive", title: "Delete failed" });
        } finally {
            setIsDeletingSearch(false);
        }
    };
    
    const handleFindMatches = async () => {
        setIsSendingAlerts(true);
        toast({ title: "Processing Job Alerts..." });
        try {
            const result = await findJobMatches({});
            toast({ title: "Processing Complete!", description: `Sent ${result.emailsSent} emails for ${result.matchedJobs} matched jobs.` });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Failed to Send Alerts", description: error.message });
        } finally {
            setIsSendingAlerts(false);
        }
    }

    const handleNotifyUser = async (searchId: string) => {
        if (!user) return;
        setIsSendingSingleAlert(searchId);
        toast({ title: "Checking for new jobs..." });
        try {
            const result = await findJobMatches({ userId: user.uid, searchId: searchId });
            if (result.emailsSent > 0) {
                 toast({ title: "Alert Sent!", description: `We found ${result.matchedJobs} new job(s) and sent you an email.` });
            } else {
                 toast({ title: "No New Jobs Found", description: "There are no new jobs matching this search right now." });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to Get Alerts", description: error.message });
        } finally {
            setIsSendingSingleAlert(null);
        }
    }

    if (!user) return null;

    return (
        <div className="flex flex-col">
            <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-8 pb-10">
                <div><h1 className="text-3xl font-bold tracking-tight">Dashboard</h1></div>

                {isRecruiter && (
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            {postedJobs && postedJobs.length > 0 && (
                                <Button onClick={handleFindMatches} disabled={isSendingAlerts}>
                                    <Send className="mr-2 h-4 w-4" /> {isSendingAlerts ? 'Sending to All...' : 'Send Job Alerts'}
                                </Button>
                            )}
                        </div>
                        {isLoadingPosted && postedJobs.length === 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="rounded-3xl h-56"><CardContent className="p-4 h-full"><div className="bg-muted animate-pulse h-full w-full rounded-2xl"></div></CardContent></Card>)}
                           </div>
                        ) : postedJobs.length > 0 ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {postedJobs.map(job => <JobCardBig key={job.id} job={job} isFavourite={false} onToggleFavourite={async () => {}} hasApplied={false} isRecruiter={true} />)}
                                </div>
                                {hasMorePosted && <div className="flex justify-center"><LoadMoreButton onClick={() => fetchPostedJobs(true)} isLoading={isLoadingPosted} /></div>}
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

                {isStandardUser && (
                    <>
                     <section>
                         {isLoadingApplied && appliedJobs.length === 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                 {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="rounded-3xl h-56"><CardContent className="p-4 h-full"><div className="bg-muted animate-pulse h-full w-full rounded-2xl"></div></CardContent></Card>)}
                            </div>
                         ) : appliedJobs.length > 0 ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {appliedJobs.map(job => <JobCardBig key={job.id} job={job} isFavourite={favouriteJobIdsSet.has(job.id)} onToggleFavourite={handleToggleFavourite} hasApplied={true} isRecruiter={false} />)}
                                </div>
                                {hasMoreApplied && <div className="flex justify-center"><LoadMoreButton onClick={() => fetchAppliedJobs(true)} isLoading={isLoadingApplied} /></div>}
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

                    {(isLoadingFavourites || favouriteJobs.length > 0) && (
                        <>
                        <Separator />
                        <section>
                            <h2 className="text-2xl font-semibold tracking-tight mb-4 flex items-center gap-2"><Heart />Favorite Jobs</h2>
                             {isLoadingFavourites && favouriteJobs.length === 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {Array.from({ length: 2 }).map((_, i) => <Card key={i} className="rounded-3xl h-56"><CardContent className="p-4 h-full"><div className="bg-muted animate-pulse h-full w-full rounded-2xl"></div></CardContent></Card>)}
                                </div>
                             ) : favouriteJobs.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {favouriteJobs.map(job => <JobCardBig key={job.id} job={job} isFavourite={true} onToggleFavourite={handleToggleFavourite} hasApplied={false} isRecruiter={false} />)}
                                    </div>
                                    {hasMoreFavourites && <div className="flex justify-center"><LoadMoreButton onClick={() => fetchFavouriteJobs(true)} isLoading={isLoadingFavourites} /></div>}
                                </div>
                            ) : null}
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
                                    <SavedSearchCard key={search.id} savedSearch={search} onExecute={handleExecuteSearch} onDelete={handleDeleteSearch} isDeleting={isDeletingSearch} onNotify={handleNotifyUser} isNotifying={isSendingSingleAlert === search.id} />
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
