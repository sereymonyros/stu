

'use client';

import { useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, where, limit, startAfter, getDocs, orderBy, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Heart, Briefcase, Search, Star, LayoutGrid, List, Filter, KanbanSquare, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { DndContext, type DragEndEvent, type DragStartEvent, useSensor, PointerSensor, TouchSensor, useSensors } from '@dnd-kit/core';
import { Board } from '@/components/job-kanban';
import { updateJobStatus } from '@/ai/flows/update-job-status-flow';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import JobsLoading from './loading';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { JobCardBig } from '@/components/job-card-big';
import { JobCardSmall } from '@/components/job-card-small';
import { JobCardBigMobile } from '@/components/job-card-big-mobile';
import { JobCardSmallMobile } from '@/components/job-card-small-mobile';
import { ApplicantCounter } from '@/components/applicant-counter';
import { LoadMoreButton } from '@/components/load-more-button';

const JOBS_PER_PAGE = 8;


function JobsPageContent() {
    const firestore = useFirestore();
    const { user } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    
    // --- View State ---
    const [viewMode, setViewMode] = useState<'list' | 'card' |'board'>('list');
    
    // --- Data Fetching and Pagination State ---
    const [jobs, setJobs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // --- Data for Kanban Board state ---
    const [jobsByStatus, setJobsByStatus] = useState<Record<string, any[]>>({});

    // --- User & Filter Data ---
    const userProfileRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc(userProfileRef);
    const isRecruiter = userProfile?.userType === 'recruiter';
    
    // This query is now just for filter options, not for displaying jobs
    const allJobsQuery = useMemo(() => query(collection(firestore, 'jobs')), [firestore]);
    const { data: allJobsForFilters } = useCollection(allJobsQuery);
    
    const favouriteJobsQuery = useMemo(() => (firestore && user && !isRecruiter) ? collection(firestore, `users/${user.uid}/favouriteJobs`) : null, [firestore, user, isRecruiter]);
    const { data: favouriteJobs } = useCollection(favouriteJobsQuery);

    const applicationsQuery = useMemo(() => (firestore && user && !isRecruiter) ? query(collection(firestore, `users/${user.uid}/applications`)) : null, [firestore, user, isRecruiter]);
    const { data: applications } = useCollection(applicationsQuery);

    const favouriteJobIds = useMemo(() => new Set(favouriteJobs?.map(fav => fav.id)), [favouriteJobs]);
    const appliedJobIds = useMemo(() => new Set(applications?.map(app => app.jobId)), [applications]);
    
    // --- Derived State for Filters ---
    const { companyOptions, locationOptions, jobTypeOptions, maxSalary } = useMemo(() => {
        if (!allJobsForFilters) return { companyOptions: [], locationOptions: [], jobTypeOptions: [], maxSalary: 150000 };
        const companies = new Set<string>();
        const locs = new Set<string>();
        const types = new Set<string>();
        let maxSal = 0;
        allJobsForFilters.forEach(job => {
            if (job.companyName) companies.add(job.companyName);
            if (job.location) locs.add(job.location);
            if (job.jobType) types.add(job.jobType);
            if (job.salaryMax > maxSal) maxSal = job.salaryMax;
        });
        const finalMaxSalary = maxSal > 0 ? Math.ceil(maxSal / 1000) * 1000 : 150000;
        return {
            companyOptions: Array.from(companies).sort().map(c => ({ value: c, label: c })),
            locationOptions: Array.from(locs).sort().map(l => ({ value: l, label: l })),
            jobTypeOptions: Array.from(types).sort().map(t => ({ value: t, label: t })),
            maxSalary: finalMaxSalary,
        };
    }, [allJobsForFilters]);


    // --- Search & Filter State ---
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [selectedCompanies, setSelectedCompanies] = useState<string[]>(searchParams.getAll('company'));
    const [selectedLocations, setSelectedLocations] = useState<string[]>(searchParams.getAll('location'));
    const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(searchParams.getAll('jobType'));
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(searchParams.get('favorites') === 'true');
    const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 150000]);
    
     // --- Dialog State ---
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [savedSearchName, setSavedSearchName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // This effect SYNCS the URL with the state.
    useEffect(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (showFavoritesOnly) params.set('favorites', 'true');
        if (salaryRange[0] > 0) params.set('salaryMin', salaryRange[0].toString());
        if (salaryRange[1] < maxSalary) params.set('salaryMax', salaryRange[1].toString());
        selectedCompanies.forEach(c => params.append('company', c));
        selectedLocations.forEach(l => params.append('location', l));
        selectedJobTypes.forEach(t => params.append('jobType', t));
        router.replace(`/jobs?${params.toString()}`, { scroll: false });
    }, [searchQuery, selectedCompanies, selectedLocations, selectedJobTypes, showFavoritesOnly, salaryRange, maxSalary, router]);

    // This effect SYNCS the slider's range with the data from the server.
    useEffect(() => {
        setSalaryRange(prev => [prev[0], maxSalary]);
    }, [maxSalary]);
    
    // --- Data Fetching ---
    const fetchJobs = useCallback(async (loadMore = false) => {
        if (!firestore) return;

        if (loadMore) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
            setJobs([]); // Reset jobs on a new filter application
        }
        
        let q = query(collection(firestore, 'jobs'), orderBy('createdAt', 'desc'), limit(JOBS_PER_PAGE));

        if (selectedCompanies.length > 0) {
            q = query(q, where('companyName', 'in', selectedCompanies));
        }
        if (selectedLocations.length > 0) {
            q = query(q, where('location', 'in', selectedLocations));
        }
        if (selectedJobTypes.length > 0) {
            q = query(q, where('jobType', 'in', selectedJobTypes));
        }
        if (showFavoritesOnly && user) {
            q = query(q, where('__name__', 'in', Array.from(favouriteJobIds)));
        }

        const [minSal] = salaryRange;
        if (minSal > 0) {
            q = query(q, where('salaryMax', '>=', minSal));
        }
        
        if (loadMore && lastVisible) {
            q = query(q, startAfter(lastVisible));
        }

        try {
            const snapshot = await getDocs(q);
            const newJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(newJobs.length === JOBS_PER_PAGE);

            // Client-side search query and max salary filtering
            let finalJobs = newJobs;
            const [, maxSal] = salaryRange;

            finalJobs = newJobs.filter(job => {
                const textMatch = searchQuery 
                    ? job.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      job.description?.toLowerCase().includes(searchQuery.toLowerCase())
                    : true;
                
                const salaryMatch = maxSal < maxSalary 
                    ? (job.salaryMin || 0) <= maxSal
                    : true;
                
                return textMatch && salaryMatch;
            });

            setJobs(prevJobs => loadMore ? [...prevJobs, ...finalJobs] : finalJobs);
            
        } catch (err) {
            console.error("Error fetching jobs:", err);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch jobs.'});
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }

    }, [
        firestore, searchQuery, selectedCompanies, selectedLocations, 
        selectedJobTypes, showFavoritesOnly, salaryRange, maxSalary, 
        lastVisible, user, favouriteJobIds, toast
    ]);

    useEffect(() => {
        fetchJobs();
    }, [
        fetchJobs, // Now safely included due to useCallback
    ]);

    // --- Handlers ---
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

    const handleSaveSearch = async () => {
        if (!user || !firestore || !savedSearchName.trim()) {
            toast({ variant: 'destructive', title: "Cannot save", description: "Please provide a name for your search."});
            return;
        }

        setIsSaving(true);
        const newSearchDocRef = doc(collection(firestore, `users/${user.uid}/savedSearches`));

        const searchData = {
            id: newSearchDocRef.id,
            name: savedSearchName,
            searchQuery: searchQuery || '',
            filters: {
                companyNames: selectedCompanies,
                locations: selectedLocations,
                jobTypes: selectedJobTypes,
                salaryMin: salaryRange[0] > 0 ? salaryRange[0] : null,
                salaryMax: salaryRange[1] < maxSalary ? salaryRange[1] : null,
            },
            createdAt: serverTimestamp(),
        };
        
        setDoc(newSearchDocRef, searchData).catch(serverError => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: newSearchDocRef.path,
                operation: 'create',
                requestResourceData: searchData
            }));
             toast({ variant: "destructive", title: "Save failed", description: "Could not save your search." });
        }).then(() => {
            toast({ title: "Search Saved!", description: `"${savedSearchName}" has been added to your dashboard.`});
            setIsSaveDialogOpen(false);
            setSavedSearchName('');
        }).finally(() => {
            setIsSaving(false);
        });
    };
    
    // --- Kanban Board Logic ---
    useEffect(() => {
        if (allJobsForFilters && user && isRecruiter) {
            const recruiterJobs = allJobsForFilters.filter(job => job.recruiterId === user.uid);
            const grouped = recruiterJobs.reduce((acc, job) => {
                const status = job.status || 'Available';
                if (!acc[status]) {
                    acc[status] = [];
                }
                acc[status].push(job);
                return acc;
            }, {} as Record<string, any[]>);
            setJobsByStatus(grouped);
        }
    }, [allJobsForFilters, user, isRecruiter]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const handleJobDragStart = (event: DragStartEvent) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(100);
        }
    };


    const handleJobDragEnd = async (event: DragEndEvent) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        const { active, over } = event;

        if (!over || !active) return;
        
        const jobId = active.id as string;
        const newStatus = over.id as string;
        
        let oldStatus: string | undefined;
        let movedJob: any;
        for (const status in jobsByStatus) {
            const job = jobsByStatus[status].find(j => j.id === jobId);
            if (job) {
                oldStatus = status;
                movedJob = job;
                break;
            }
        }
        
        if (!oldStatus || oldStatus === newStatus) {
            return;
        }

        setJobsByStatus((prev) => {
            const newBoardState = { ...prev };
            newBoardState[oldStatus!] = newBoardState[oldStatus!].filter(j => j.id !== jobId);
            newBoardState[newStatus] = [...(newBoardState[newStatus] || []), { ...movedJob, status: newStatus }];
            return newBoardState;
        });
        
        try {
            await updateJobStatus({ jobId, newStatus: newStatus as any });
        } catch (error: any) {
            console.error("Failed to update job status:", error);
            
             setJobsByStatus((prev) => {
                 const revertedState = { ...prev };
                 revertedState[newStatus] = revertedState[newStatus]?.filter(j => j.id !== jobId);
                 if (movedJob && !revertedState[oldStatus!]?.find(j => j.id === jobId)) {
                     revertedState[oldStatus!].push(movedJob);
                 }
                 return revertedState;
             });
        }
    };
    
    const KANBAN_STAGES: ('Available' | 'Closed')[] = ["Available", "Closed"];
    
    if (isLoading && jobs.length === 0) {
        return <JobsLoading count={8} viewMode={viewMode} />;
    }
    
    const hasActiveFilters = 
      searchQuery !== '' ||
      selectedCompanies.length > 0 ||
      selectedLocations.length > 0 ||
      selectedJobTypes.length > 0 ||
      showFavoritesOnly ||
      (salaryRange[0] > 0 || salaryRange[1] < maxSalary);
    
    if (jobs.length === 0 && !isLoading && !hasActiveFilters && !allJobsForFilters) {
        return (
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                 <div className="text-center py-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-4">
                    <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold tracking-tight">No jobs posted yet</h2>
                        <p className="text-muted-foreground mt-2">Check back soon for new opportunities!</p>
                    </div>
                     {isRecruiter && <Button asChild className="mt-4"><Link href="/jobs/new">Post a Job</Link></Button>}
                </div>
            </main>
        )
    }

    const renderJobs = () => {
        if (jobs.length === 0 && !isLoading) {
            return (
                 <div className="text-center py-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-4">
                    <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold tracking-tight">{hasActiveFilters ? 'No Matching Jobs' : 'No jobs posted yet'}</h2>
                        <p className="text-muted-foreground mt-2">
                            {hasActiveFilters ? 'Try adjusting your filters.' : 'Check back soon for new opportunities!'}
                        </p>
                    </div>
                </div>
            )
        }
        
        if (viewMode === 'list') {
            return (
                <div className="grid grid-cols-1 gap-4">
                    {jobs.map((job) => (
                        isMobile ? (
                            <JobCardSmallMobile
                                key={job.id} 
                                job={job}
                                isFavourite={favouriteJobIds.has(job.id)}
                                onToggleFavourite={handleToggleFavourite}
                                hasApplied={appliedJobIds.has(job.id)}
                                isRecruiter={isRecruiter ?? false}
                            />
                        ) : (
                            <JobCardSmall
                                key={job.id} 
                                job={job}
                                isFavourite={favouriteJobIds.has(job.id)}
                                onToggleFavourite={handleToggleFavourite}
                                hasApplied={appliedJobIds.has(job.id)}
                                isRecruiter={isRecruiter ?? false}
                            />
                        )
                    ))}
                </div>
            )
        }
        return (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                {jobs.map((job) => (
                     isMobile ? (
                        <JobCardBigMobile
                            key={job.id} 
                            job={job}
                            isFavourite={favouriteJobIds.has(job.id)}
                            onToggleFavourite={handleToggleFavourite}
                            hasApplied={appliedJobIds.has(job.id)}
                            isRecruiter={isRecruiter ?? false}
                        />
                     ) : (
                        <JobCardBig 
                            key={job.id} 
                            job={job}
                            isFavourite={favouriteJobIds.has(job.id)}
                            onToggleFavourite={handleToggleFavourite}
                            hasApplied={appliedJobIds.has(job.id)}
                            isRecruiter={isRecruiter ?? false}
                        />
                     )
                ))}
            </div>
        )
    }

    return (
        <div className="flex flex-col  ">
            <main className="flex-1 p-4 lg:p-8">
                 <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Job Board</h1>
                     {isRecruiter && (
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="default" size="sm" className="flex items-center gap-2">
                                        <Link href="/jobs/new"><Plus className="h-4 w-4" /> New Job</Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Post a New Job</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>

                <div className="mb-6 space-y-4">
                    {viewMode !== 'board' && (
                        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen} className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search by title, description..."
                                        className="pl-10 h-10 w-full"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {hasActiveFilters && (
                                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground" onClick={() => { setSearchQuery('')}}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <CollapsibleTrigger asChild>
                                    <Button variant="outline" className="h-10">
                                        <Filter className="h-4 w-4" />
                                        {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-blue-500"></span>}
                                    </Button>
                                </CollapsibleTrigger>
                                <div>
                                    <ToggleGroup type="single" value={viewMode} onValueChange={(value) => { if(value) setViewMode(value as any)}}>
                                        <ToggleGroupItem value="list" aria-label="List view" className={cn(!isRecruiter && 'hidden md:inline-flex')}><List /></ToggleGroupItem>
                                        <ToggleGroupItem value="card" aria-label="Card view" className="hidden md:inline-flex"><LayoutGrid /></ToggleGroupItem>
                                        {isRecruiter && <ToggleGroupItem value="board" aria-label="Board view"><KanbanSquare /></ToggleGroupItem>}
                                    </ToggleGroup>
                                </div>
                            </div>

                            <CollapsibleContent>
                                <Card className="p-4 rounded-3xl mt-2">
                                    <div className="w-full mx-auto">
                                        <div className="grid gap-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <MultiSelect
                                                    options={companyOptions}
                                                    selectedValues={selectedCompanies}
                                                    onValueChange={(val) => setSelectedCompanies(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])}
                                                    placeholder="Filter companies..."
                                                />
                                                <MultiSelect
                                                    options={locationOptions}
                                                    selectedValues={selectedLocations}
                                                    onValueChange={(val) => setSelectedLocations(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])}
                                                    placeholder="Filter locations..."
                                                />
                                                <MultiSelect
                                                    options={jobTypeOptions}
                                                    selectedValues={selectedJobTypes}
                                                    onValueChange={(val) => setSelectedJobTypes(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])}
                                                    placeholder="Filter job types..."
                                                />
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                                                <div className="space-y-2 flex-1 w-full">
                                                    <Slider
                                                        value={salaryRange}
                                                        onValueChange={setSalaryRange}
                                                        max={maxSalary}
                                                        step={1000}
                                                        className="my-4 pt-2"
                                                    />
                                                    <div className="flex justify-between text-xs text-muted-foreground">
                                                        <span>${salaryRange[0].toLocaleString()}</span>
                                                        <span className="flex-grow text-center">Filter salary</span>
                                                        <span>${salaryRange[1].toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 justify-center sm:justify-end flex-shrink-0">
                                                    {user && !isRecruiter && (
                                                        <Toggle
                                                            pressed={showFavoritesOnly}
                                                            onPressedChange={setShowFavoritesOnly}
                                                            className="h-9 px-3"
                                                            aria-label="Show favorites only"
                                                        >
                                                            <Heart className={cn("mr-2 h-4 w-4", showFavoritesOnly && "fill-red-500 text-red-500")} />
                                                            <span>Favorites</span>
                                                        </Toggle>
                                                    )}
                                                    {user && !isRecruiter && (
                                                        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" disabled={!hasActiveFilters}>
                                                                    <Star className="mr-2 h-4 w-4" /> Save Search
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="sm:max-w-[425px]">
                                                                <DialogHeader>
                                                                    <DialogTitle>Save Job Search</DialogTitle>
                                                                    <DialogDescription>
                                                                        Name this search to save it to your dashboard for later.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="grid gap-4 py-4">
                                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                                        <Label htmlFor="search-name" className="text-right">
                                                                            Name
                                                                        </Label>
                                                                        <Input
                                                                            id="search-name"
                                                                            value={savedSearchName}
                                                                            onChange={(e) => setSavedSearchName(e.target.value)}
                                                                            className="col-span-3"
                                                                            placeholder="e.g., 'React Jobs in PP'"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <DialogFooter>
                                                                    <Button type="button" variant="secondary" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
                                                                    <Button type="submit" onClick={handleSaveSearch} disabled={isSaving || !savedSearchName.trim()}>
                                                                        {isSaving ? 'Saving...' : 'Save'}
                                                                    </Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </CollapsibleContent>
                        </Collapsible>
                    )}
                     {viewMode === 'board' && (
                         <div className="flex justify-end">
                            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => { if(value) setViewMode(value as any)}}>
                                <ToggleGroupItem value="list" aria-label="List view" className={cn(!isRecruiter && 'hidden md:inline-flex')}><List /></ToggleGroupItem>
                                <ToggleGroupItem value="card" aria-label="Card view" className="hidden md:inline-flex"><LayoutGrid /></ToggleGroupItem>
                                {isRecruiter && <ToggleGroupItem value="board" aria-label="Board view"><KanbanSquare /></ToggleGroupItem>}
                            </ToggleGroup>
                        </div>
                     )}
                </div>
                
                {viewMode !== 'board' && (
                    <div className="space-y-6">
                        {renderJobs()}
                        {hasMore && !isLoading && (
                            <div className="flex justify-center">
                                <LoadMoreButton onClick={() => fetchJobs(true)} isLoading={isLoadingMore} />
                            </div>
                        )}
                        {isLoadingMore && <div className="text-center text-muted-foreground">Loading...</div>}
                    </div>
                )}

                {viewMode === 'board' && isRecruiter && (
                    <DndContext sensors={sensors} onDragStart={handleJobDragStart} onDragEnd={handleJobDragEnd}>
                       <div className="flex justify-center flex-wrap gap-4 pb-4 items-start">
                            {KANBAN_STAGES.map(stage => {
                                const stageJobs = jobsByStatus[stage] || [];
                                return (
                                    <Board.Column
                                        key={stage}
                                        id={stage}
                                        title={stage}
                                        items={stageJobs}
                                        type="jobs"
                                        isLoading={!allJobsForFilters}
                                    >
                                        {stageJobs.map((job: any) => (
                                            <Board.JobCard
                                                key={job.id}
                                                job={job}
                                                isFavourite={false}
                                                onToggleFavourite={async () => {}}
                                                hasApplied={false}
                                                isRecruiter={true}
                                                isDraggable={true}
                                                isMobile={isMobile}
                                            />
                                        ))}
                                    </Board.Column>
                                );
                            })}
                        </div>
                    </DndContext>
                )}
            </main>
        </div>
    );
}


export default function JobsPage() {
    return (
        <Suspense fallback={<JobsLoading />}>
            <JobsPageContent />
        </Suspense>
    )
}
