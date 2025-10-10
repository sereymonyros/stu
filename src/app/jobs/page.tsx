
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
import { Heart, Briefcase, Building, MapPin, DollarSign, Pencil, Search, FilterX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';

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

const FilterGroup = ({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (option: string) => void; }) => {
    if (!options || options.length === 0) return null;
    return (
        <div>
            <h3 className="text-sm font-semibold mb-2">{title}</h3>
            <div className="flex flex-wrap gap-2">
                {options.map(option => (
                    <Toggle
                        key={option}
                        size="sm"
                        variant="outline"
                        pressed={selected.includes(option)}
                        onPressedChange={() => onToggle(option)}
                        className="rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                        {option}
                    </Toggle>
                ))}
            </div>
        </div>
    );
};

export default function JobsPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    // --- Search & Filter State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    // --- Data Fetching ---
    const jobsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'jobs'));
    }, [firestore]);
    const { data: jobs, isLoading: areJobsLoading } = useCollection(jobsQuery);

    const userProfileRef = useMemo(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const favouriteJobsQuery = useMemo(() => {
        if (!firestore || !user || userProfile?.userType === 'recruiter') return null;
        return collection(firestore, `users/${user.uid}/favouriteJobs`);
    }, [firestore, user, userProfile]);
    const { data: favouriteJobs, isLoading: areFavouritesLoading } = useCollection(favouriteJobsQuery);

    const favouriteJobIds = useMemo(() => new Set(favouriteJobs?.map(fav => fav.jobId)), [favouriteJobs]);
    
    const applicationsQuery = useMemo(() => {
        if (!firestore || !user || userProfile?.userType === 'recruiter') return null;
        return query(collection(firestore, `users/${user.uid}/applications`));
    }, [firestore, user, userProfile]);
    const { data: applications, isLoading: areApplicationsLoading } = useCollection(applicationsQuery);
    
    const appliedJobIds = useMemo(() => new Set(applications?.map(app => app.jobId)), [applications]);

    // --- Dynamic Filter Options ---
    const { companyNames, locations, jobTypes } = useMemo(() => {
        if (!jobs) return { companyNames: [], locations: [], jobTypes: [] };
        const companies = new Set<string>();
        const locs = new Set<string>();
        const types = new Set<string>();
        jobs.forEach(job => {
            if (job.companyName) companies.add(job.companyName);
            if (job.location) locs.add(job.location);
            if (job.jobType) types.add(job.jobType);
        });
        return {
            companyNames: Array.from(companies).sort(),
            locations: Array.from(locs).sort(),
            jobTypes: Array.from(types).sort(),
        };
    }, [jobs]);

    // --- Toggle Handlers ---
    const toggleFilter = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
        setter(prev => prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]);
    };
    
    const clearAllFilters = () => {
        setSearchQuery('');
        setSelectedCompanies([]);
        setSelectedLocations([]);
        setSelectedJobTypes([]);
        setShowFavoritesOnly(false);
    };

    const hasActiveFilters = [searchQuery, ...selectedCompanies, ...selectedLocations, ...selectedJobTypes, showFavoritesOnly].some(Boolean);

    // --- Toggle Favourite ---
    const handleToggleFavourite = async (jobId: string, isCurrentlyFavourite: boolean) => {
        if (!user || !firestore) {
            router.push('/login');
            return;
        }

        const favDocRef = doc(firestore, `users/${user.uid}/favouriteJobs`, jobId);

        try {
            if (isCurrentlyFavourite) {
                await deleteDoc(favDocRef);
                toast({ title: "Removed from Favourites" });
            } else {
                const favouriteData = { jobId, favouritedAt: serverTimestamp() };
                await setDoc(favDocRef, favouriteData);
                toast({ title: "Added to Favourites" });
            }
        } catch (error: any) {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: favDocRef.path,
                operation: isCurrentlyFavourite ? 'delete' : 'create'
            }));
            toast({ variant: "destructive", title: "An error occurred", description: "You may not have permission to perform this action." });
        }
    };
    
    const filteredAndSortedJobs = useMemo(() => {
        if (!jobs) return [];
        
        let filtered = [...jobs];

        // 1. Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(job => 
                (job.title?.toLowerCase() || '').includes(query) || 
                (job.description?.toLowerCase() || '').includes(query)
            );
        }

        // 2. Toggle filters
        if (selectedCompanies.length > 0) {
            filtered = filtered.filter(job => selectedCompanies.includes(job.companyName));
        }
        if (selectedLocations.length > 0) {
            filtered = filtered.filter(job => selectedLocations.includes(job.location));
        }
        if (selectedJobTypes.length > 0) {
            filtered = filtered.filter(job => selectedJobTypes.includes(job.jobType));
        }
        if (showFavoritesOnly) {
            filtered = filtered.filter(job => favouriteJobIds.has(job.id));
        }

        // 3. Sort for authenticated users
        if (!user) return filtered;

        return filtered.sort((a, b) => {
            const aHasApplied = appliedJobIds.has(a.id);
            const bHasApplied = appliedJobIds.has(b.id);
            
            if (aHasApplied === bHasApplied) {
                // If statuses are same, sort by creation date (newest first)
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (new Date(a.createdAt)).getTime();
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (new Date(b.createdAt)).getTime();
                return dateB - dateA;
            }
            return aHasApplied ? 1 : -1;
        });
    }, [jobs, user, appliedJobIds, searchQuery, selectedCompanies, selectedLocations, selectedJobTypes, showFavoritesOnly, favouriteJobIds]);


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
                    
                    <Card className="p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    type="search"
                                    placeholder="Search by title or description..."
                                    className="pl-10 h-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                {user && !isRecruiter && (
                                     <Toggle
                                        size="sm"
                                        variant="outline"
                                        pressed={showFavoritesOnly}
                                        onPressedChange={setShowFavoritesOnly}
                                        className="rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                    >
                                        <Heart className="mr-2 h-4 w-4" />
                                        My Favourites
                                    </Toggle>
                                )}
                                {hasActiveFilters && (
                                    <Button variant="ghost" onClick={clearAllFilters}>
                                        <FilterX className="mr-2 h-4 w-4" />
                                        Clear Filters
                                    </Button>
                                )}
                            </div>
                        </div>

                        <Separator className="mb-4" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FilterGroup title="Company" options={companyNames} selected={selectedCompanies} onToggle={(val) => toggleFilter(setSelectedCompanies, val)} />
                            <FilterGroup title="Location" options={locations} selected={selectedLocations} onToggle={(val) => toggleFilter(setSelectedLocations, val)} />
                            <FilterGroup title="Job Type" options={jobTypes} selected={selectedJobTypes} onToggle={(val) => toggleFilter(setSelectedJobTypes, val)} />
                        </div>
                    </Card>


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
                                <h2 className="text-2xl font-semibold tracking-tight">{hasActiveFilters ? 'No Matching Jobs' : 'No jobs posted yet'}</h2>
                                <p className="text-muted-foreground mt-2">
                                    {hasActiveFilters ? 'Try adjusting your filters.' : 'Check back soon for new opportunities!'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

    