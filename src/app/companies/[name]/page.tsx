

'use client';

import { useMemo, Suspense, use, useState, useEffect } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Building, MapPin, DollarSign, ArrowLeft, Link as LinkIcon, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { getCompanyByName } from '@/ai/flows/get-company-by-name-flow';
import type { GetCompanyByNameOutput } from '@/ai/flows/get-company-by-name-flow';
import { BackButton } from '@/components/back-button';
import { JobCardBig } from '@/components/job-card-big';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


function CompanyProfile({ name: encodedName }: { name: string }) {
    const companyName = decodeURIComponent(encodedName);
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();

    const [company, setCompany] = useState<GetCompanyByNameOutput | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    useEffect(() => {
      setIsLoadingProfile(true);
      getCompanyByName({ companyName })
        .then(setCompany)
        .catch(err => {
            console.error("Failed to fetch company profile:", err);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load company information.' });
        })
        .finally(() => setIsLoadingProfile(false));
    }, [companyName, toast]);

    const userProfileRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc(userProfileRef);
    const isRecruiter = userProfile?.userType === 'recruiter';

    const favouriteJobsQuery = useMemo(() => (firestore && user && !isRecruiter) ? collection(firestore, `users/${user.uid}/favouriteJobs`) : null, [firestore, user, isRecruiter]);
    const { data: favouriteJobs } = useCollection(favouriteJobsQuery);
    const favouriteJobIds = useMemo(() => new Set(favouriteJobs?.map(fav => fav.jobId)), [favouriteJobs]);
    
    const applicationsQuery = useMemo(() => (firestore && user && !isRecruiter) ? query(collection(firestore, `users/${user.uid}/applications`)) : null, [firestore, user, isRecruiter]);
    const { data: applications } = useCollection(applicationsQuery);
    const appliedJobIds = useMemo(() => new Set(applications?.map(app => app.jobId)), [applications]);


    // Fetch jobs for this company
    const jobsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'jobs'), where('companyName', '==', companyName));
    }, [firestore, companyName]);
    const { data: jobs, isLoading: isLoadingJobs } = useCollection(jobsQuery);
    
    const availableJobs = useMemo(() => jobs?.filter(job => job.status === 'Available') || [], [jobs]);
    
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


    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1 p-4 lg:p-8 pb-32">
                <div className="mb-6">
                    <div className="mb-4">
                      <BackButton />
                    </div>
                </div>

                {isLoadingProfile ? (
                     <Card className="mb-8 overflow-hidden rounded-3xl">
                        <CardHeader className="flex flex-col md:flex-row items-center gap-6 p-6">
                            <Skeleton className="h-24 w-24 rounded-lg" />
                            <div className="flex-1 space-y-2 text-center md:text-left">
                                <Skeleton className="h-8 w-64 mx-auto md:mx-0" />
                                <Skeleton className="h-5 w-48 mx-auto md:mx-0" />
                            </div>
                        </CardHeader>
                    </Card>
                ) : company ? (
                     <Card className="mb-8 overflow-hidden rounded-3xl">
                        <CardHeader className="flex flex-col md:flex-row items-center gap-6 p-6">
                           <Image
                             src={company.logoUrl || `https://picsum.photos/seed/${companyName}/200`}
                             alt={`${company.name} logo`}
                             width={100}
                             height={100}
                             className="rounded-lg object-contain border p-2"
                           />
                           <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
                                {company.website && (
                                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary mt-1 inline-flex items-center gap-1">
                                       <LinkIcon className="h-4 w-4" /> {company.website.replace(/^(https?:\/\/)?(www\.)?/, '')}
                                    </a>
                                )}
                                {company.description && <p className="text-muted-foreground mt-2">{company.description}</p>}
                           </div>
                           <div className="flex-shrink-0 text-center">
                                <div className="text-4xl font-bold text-primary">{availableJobs.length}</div>
                                <div className="text-sm text-muted-foreground">Open Position{availableJobs.length !== 1 && 's'}</div>
                           </div>
                        </CardHeader>
                    </Card>
                ) : (
                    // Show simple header if no profile exists but jobs might.
                    !isLoadingProfile && (
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold tracking-tight">{companyName}</h1>
                        </div>
                    )
                )}


                {isLoadingJobs && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                )}

                {!isLoadingJobs && jobs && jobs.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight mb-4">Current Openings</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                           {jobs.map(job => (
                                <JobCardBig
                                    key={job.id}
                                    job={job}
                                    isFavourite={favouriteJobIds.has(job.id)}
                                    onToggleFavourite={handleToggleFavourite}
                                    hasApplied={appliedJobIds.has(job.id)}
                                    isRecruiter={isRecruiter ?? false}
                                />
                           ))}
                        </div>
                    </div>
                )}
                
                {!isLoadingJobs && (!jobs || jobs.length === 0) && (
                     <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h2 className="mt-4 text-xl font-semibold">No Current Openings</h2>
                        <p className="mt-2 text-muted-foreground">{companyName} has no job listings at the moment.</p>
                    </div>
                )}

            </main>
        </div>
    );
}

export default function CompanyPage({ params }: { params: Promise<{ name: string }> }) {
    const { name } = use(params);
    return (
        <Suspense fallback={
          <div className="space-y-8 p-4 md:p-6 lg:p-8">
            <Card className="rounded-3xl">
                <CardHeader className="flex flex-col md:flex-row items-center gap-6 p-6">
                    <Skeleton className="h-24 w-24 rounded-lg" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-5 w-full mt-2" />
                    </div>
                    <div className="flex-shrink-0">
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-4 w-20 mt-1" />
                    </div>
                </CardHeader>
            </Card>
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
        }>
            <CompanyProfile name={name} />
        </Suspense>
    )
}
