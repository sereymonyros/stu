
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
import { Heart, Briefcase, Building, MapPin, DollarSign, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function JobCard({ job, isFavourite, onToggleFavourite, hasApplied }: { job: any; isFavourite: boolean; onToggleFavourite: (jobId: string, isCurrentlyFavourite: boolean) => void; hasApplied: boolean; }) {
    const { user } = useUser();
    const isOwner = user && user.uid === job.recruiterId;

    return (
        <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-xl font-bold">{job.title}</CardTitle>
                    {user && !isOwner && (
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggleFavourite(job.id, isFavourite)}
                            className="text-muted-foreground hover:text-red-500"
                        >
                            <Heart className={cn("h-6 w-6", isFavourite && "fill-red-500 text-red-500")} />
                        </Button>
                    )}
                     {isOwner && (
                        <Button asChild variant="ghost" size="icon">
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
                 <Button asChild className="w-full" disabled={hasApplied}>
                    {hasApplied ? (
                        <span>Applied</span>
                    ) : (
                        <Link href={`/jobs/${job.id}/apply`}>View & Apply</Link>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function JobsPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    // Fetch all jobs
    const jobsQuery = useMemo(() => {
        if (!firestore) return null;
        return collection(firestore, 'jobs');
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

    const isLoading = isUserLoading || areJobsLoading || isProfileLoading || areFavouritesLoading || areApplicationsLoading;
    const isRecruiter = userProfile?.userType === 'recruiter';

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="container mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">Job Board</h1>
                        {isRecruiter && (
                            <Button asChild>
                                <Link href="/jobs/new">Post a New Job</Link>
                            </Button>
                        )}
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

                    {!isLoading && jobs && jobs.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {jobs.map((job) => (
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

                    {!isLoading && (!jobs || jobs.length === 0) && (
                        <div className="text-center py-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-4">
                            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                            <div className="text-center">
                                <h2 className="text-2xl font-semibold tracking-tight">No jobs posted yet</h2>
                                <p className="text-muted-foreground mt-2">Check back soon for new opportunities!</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
