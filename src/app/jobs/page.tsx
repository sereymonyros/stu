
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Heart, Briefcase, Building, MapPin, DollarSign, Pencil, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '@/components/ui/input';

function JobCard({ job, isFavourite, onToggleFavourite, hasApplied }: { job: any; isFavourite: boolean; onToggleFavourite: (jobId: string, isCurrentlyFavourite: boolean) => void; hasApplied: boolean; }) {
    const { user } = useUser();
    const isOwner = user && user.uid === job.recruiterId;

    return (
        <Card className={cn(
            "flex flex-col h-full hover:shadow-lg transition-shadow duration-200",
            hasApplied && "bg-muted/30 opacity-60 hover:shadow-none"
        )}>
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-xl font-bold">{job.title}</CardTitle>
                    {user && !isOwner && (
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggleFavourite(job.id, isFavourite)}
                            className="text-muted-foreground hover:text-red-500"
                            disabled={hasApplied}
                        >
                            <Heart className={cn("h-6 w-6", isFavourite && "fill-red-500 text-red-500")} />
                        </Button>
                    )}
                     {isOwner && (
                        <Button asChild variant="ghost" size="icon" disabled={hasApplied}>
                            <Link href={`/jobs/${job.id}/edit`}>
                                <Pencil className="h-5 w-5" />
                            </Link>
                        </Button>
                    )}
                </div>
                <div className="flex flex-col text-sm text-muted-foreground gap-1 pt-1">
                    <div className="flex items-center gap-2"><Building className="h-4 w-4" /> {job.companyName}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {job.location}</div>
                    {job.salary && <div className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> {job.salary}</div>}
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{job.jobType}</Badge>
                    <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize">{job.status}</Badge>
                </div>
            </CardContent>
            <CardFooter>
                 {hasApplied ? (
                    <Button className="w-full" disabled>Applied</Button>
                 ) : (
                    <Button asChild className="w-full">
                        <Link href={`/jobs/${job.id}/apply`}>View & Apply</Link>
                    </Button>
                 )}
            </CardFooter>
        </Card>
    );
}

export default function JobsPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch all jobs
    const jobsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'jobs'));
    }, [firestore]);
    const { data: jobs, isLoading: areJobsLoading } = useCollection(jobsQuery);

    // Fetch user profile to check if they are a recruiter
    const userProfileRef = useMemo(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    // Fetch user's favourite jobs
    const favouriteJobsQuery = useMemo(() => {
        if (!firestore || !user || userProfile?.userType === 'recruiter') return null;
        return collection(firestore, `users/${user.uid}/favouriteJobs`);
    }, [firestore, user, userProfile]);
    const { data: favouriteJobs, isLoading: areFavouritesLoading } = useCollection(favouriteJobsQuery);

    const favouriteJobIds = useMemo(() => new Set(favouriteJobs?.map(fav => fav.jobId)), [favouriteJobs]);
    
    // Fetch user's applications
    const applicationsQuery = useMemo(() => {
        if (!firestore || !user || userProfile?.userType === 'recruiter') return null;
        return query(collection(firestore, `users/${user.uid}/applications`));
    }, [firestore, user, userProfile]);
    const { data: applications, isLoading: areApplicationsLoading } = useCollection(applicationsQuery);
    
    const appliedJobIds = useMemo(() => new Set(applications?.map(app => app.jobId)), [applications]);


    const handleToggleFavourite = async (jobId: string, isCurrentlyFavourite: boolean) => {
        if (!user || !firestore) {
            router.push('/login');
            return;
        }

        const favDocRef = doc(firestore, `users/${user.uid}/favouriteJobs`, jobId);

        try {
            if (isCurrentlyFavourite) {
                // Non-blocking delete
                deleteDoc(favDocRef).catch(serverError => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: favDocRef.path,
                        operation: 'delete'
                    }));
                });
                toast({ title: "Removed from Favourites" });
            } else {
                const favouriteData = {
                    jobId: jobId,
                    favouritedAt: serverTimestamp()
                };
                // Non-blocking set
                setDoc(favDocRef, favouriteData).catch(serverError => {
                     errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: favDocRef.path,
                        operation: 'create',
                        requestResourceData: favouriteData
                    }));
                });
                toast({ title: "Added to Favourites" });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "An error occurred", description: error.message });
        }
    };
    
    const filteredAndSortedJobs = useMemo(() => {
        if (!jobs) return [];
        
        // 1. Filter based on search query
        const filtered = jobs.filter(job => {
            const query = searchQuery.toLowerCase();
            const title = job.title?.toLowerCase() || '';
            const description = job.description?.toLowerCase() || '';
            return title.includes(query) || description.includes(query);
        });

        // 2. Sort for authenticated users
        if (!user) return filtered; // For unauthenticated users, return filtered list

        return [...filtered].sort((a, b) => {
            const aHasApplied = appliedJobIds.has(a.id);
            const bHasApplied = appliedJobIds.has(b.id);
            
            if (aHasApplied === bHasApplied) {
                return 0; // Keep original order if both are applied or not applied
            }
            return aHasApplied ? 1 : -1; // If a is applied, it comes after b. If b is applied, it comes after a.
        });
    }, [jobs, user, appliedJobIds, searchQuery]);


    const isLoading = isUserLoading || areJobsLoading || isProfileLoading || areFavouritesLoading || areApplicationsLoading;
    const isRecruiter = userProfile?.userType === 'recruiter';

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="container mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold tracking-tight">Job Board</h1>
                            <p className="text-muted-foreground mt-1">Find your next role in Cambodia.</p>
                        </div>
                        {isRecruiter && (
                            <Button asChild>
                                <Link href="/jobs/new">Post a New Job</Link>
                            </Button>
                        )}
                    </div>
                    
                    <div className="mb-6 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            type="search"
                            placeholder="Search by title or description..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>


                    {isLoading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Card key={i}>
                                    <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
                                    <CardContent><Skeleton className="h-8 w-full" /></CardContent>
                                    <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}

                    {!isLoading && filteredAndSortedJobs && filteredAndSortedJobs.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredAndSortedJobs.map((job) => (
                                <JobCard 
                                    key={job.id} 
                                    job={job}
                                    isFavourite={favouriteJobIds.has(job.id)}
                                    onToggleFavourite={handleToggleFavourite}
                                    hasApplied={appliedJobIds.has(job.id)}
                                />
                            ))}
                        </div>
                    )}

                    {!isLoading && (!jobs || filteredAndSortedJobs.length === 0) && (
                        <div className="text-center py-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-4">
                            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                            <div className="text-center">
                                <h2 className="text-2xl font-semibold tracking-tight">{searchQuery ? 'No Matching Jobs' : 'No jobs posted yet'}</h2>
                                <p className="text-muted-foreground mt-2">
                                    {searchQuery ? 'Try a different search term.' : 'Check back soon for new opportunities!'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
