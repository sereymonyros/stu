

'use client';

import { useMemo, useState, useEffect, Suspense, useRef } from 'react';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, where, getCountFromServer } from 'firebase/firestore';
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
import { ApplicantCounter } from '@/components/applicant-counter';


function JobsPageContent() {
    const firestore = useFirestore();
    const { user } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    
    // --- Filter Panel State & Ref ---
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    
    // --- View State ---
    const [viewMode, setViewMode] = useState<'list' | 'card' |'board'>('list');
    
    // --- Data for Kanban Board state ---
    const [jobsByStatus, setJobsByStatus] = useState<Record<string, any[]>>({});

    // --- Data Fetching ---
    const userProfileRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc(userProfileRef);
    const isRecruiter = userProfile?.userType === 'recruiter';
    
    const jobsQuery = useMemo(() => query(collection(firestore, 'jobs'), where('title', '!=', '')), [firestore]);
    const { data: jobs, isLoading: areJobsLoading } = useCollection(jobsQuery);
    
    const [jobCount, setJobCount] = useState<number | null>(null);

    useEffect(() => {
        if (firestore) {
            const jobsCollection = collection(firestore, 'jobs');
            getCountFromServer(jobsCollection).then(snapshot => {
                setJobCount(snapshot.data().count);
            });
        }
    }, [firestore]);
    
    const favouriteJobsQuery = useMemo(() => (firestore && user && !isRecruiter) ? collection(firestore, `users/${user.uid}/favouriteJobs`) : null, [firestore, user, isRecruiter]);
    const { data: favouriteJobs } = useCollection(favouriteJobsQuery);

    const applicationsQuery = useMemo(() => (firestore && user && !isRecruiter) ? query(collection(firestore, `users/${user.uid}/applications`)) : null, [firestore, user, isRecruiter]);
    const { data: applications } = useCollection(applicationsQuery);

    // --- Derived State ---
    const { companyOptions, locationOptions, jobTypeOptions, maxSalary } = useMemo(() => {
        if (!jobs) return { companyOptions: [], locationOptions: [], jobTypeOptions: [], maxSalary: 150000 };
        const companies = new Set<string>();
        const locs = new Set<string>();
        const types = new Set<string>();
        let maxSal = 0;
        jobs.forEach(job => {
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
    }, [jobs]);

    const favouriteJobIds = useMemo(() => new Set(favouriteJobs?.map(fav => fav.jobId)), [favouriteJobs]);
    const appliedJobIds = useMemo(() => new Set(applications?.map(app => app.jobId)), [applications]);
    
    // --- Search & Filter State ---
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [selectedCompanies, setSelectedCompanies] = useState<string[]>(searchParams.getAll('company'));
    const [selectedLocations, setSelectedLocations] = useState<string[]>(searchParams.getAll('location'));
    const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(searchParams.getAll('jobType'));
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(searchParams.get('favorites') === 'true');
    const [salaryRange, setSalaryRange] = useState<[number, number]>([0, maxSalary]);

    // --- Dialog State ---
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [savedSearchName, setSavedSearchName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        const min = searchParams.get('salaryMin');
        const max = searchParams.get('salaryMax');
        const initialMin = min ? parseInt(min, 10) : 0;
        const initialMax = max ? parseInt(max, 10) : maxSalary;
        setSalaryRange([initialMin, initialMax]);
    }, [maxSalary, searchParams]);

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
        
        // Using router.replace to update the URL without adding to history
        router.replace(`/jobs?${params.toString()}`, { scroll: false });
    }, [searchQuery, selectedCompanies, selectedLocations, selectedJobTypes, showFavoritesOnly, salaryRange, maxSalary, router]);

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
        setSalaryRange([0, maxSalary]);
    };

    const hasActiveFilters = 
      searchQuery !== '' ||
      selectedCompanies.length > 0 ||
      selectedLocations.length > 0 ||
      selectedJobTypes.length > 0 ||
      showFavoritesOnly ||
      (salaryRange[0] > 0 || salaryRange[1] < maxSalary);

    // --- Toggle Favourite ---
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

    // --- Save Search Handler ---
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
    
    const filteredAndSortedJobs = useMemo(() => {
        if (!jobs) return [];
        
        let filtered = jobs;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(job => 
                (job.title?.toLowerCase() || '').includes(query)
            );
        }

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
        const [filterMin, filterMax] = salaryRange;
        if (filterMin > 0 || filterMax < maxSalary) {
             filtered = filtered.filter(job => {
                const jobMin = job.salaryMin ?? 0;
                const jobMax = job.salaryMax ?? Infinity;
                return Math.max(jobMin, filterMin) <= Math.min(jobMax, filterMax);
            });
        }

        if (!user) return filtered;

        return filtered.sort((a, b) => {
            const aHasApplied = appliedJobIds.has(a.id);
            const bHasApplied = appliedJobIds.has(b.id);
            
            if (aHasApplied === bHasApplied) {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (new Date(a.createdAt)).getTime();
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (new Date(b.createdAt)).getTime();
                return dateB - dateA;
            }
            return aHasApplied ? 1 : -1;
        });
    }, [jobs, user, appliedJobIds, searchQuery, selectedCompanies, selectedLocations, selectedJobTypes, showFavoritesOnly, favouriteJobIds, salaryRange, maxSalary]);

    // --- Kanban Board Logic ---
    useEffect(() => {
        if (jobs && user && isRecruiter) {
            const recruiterJobs = jobs.filter(job => job.recruiterId === user.uid);
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
    }, [jobs, user, isRecruiter]);

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
    
    const isLoading = areJobsLoading || jobCount === null;

    if (isLoading) {
        return <JobsLoading count={jobCount ?? 8} viewMode={viewMode} />;
    }
    
    if (!jobs) {
        return (
            <main className="flex-1 p-4 md:p-6 lg:p-8 pb-32">
                 <div className="text-center py-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-4">
                    <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold tracking-tight">No jobs posted yet</h2>
                        <p className="text-muted-foreground mt-2">Check back soon for new opportunities!</p>
                    </div>
                </div>
            </main>
        )
    }

    const renderJobs = () => {
        const jobsToRender = filteredAndSortedJobs;

        if (jobsToRender.length === 0) {
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
                    {jobsToRender.map((job) => (
                        <JobCardSmall
                            key={job.id} 
                            job={job}
                            isFavourite={favouriteJobIds.has(job.id)}
                            onToggleFavourite={handleToggleFavourite}
                            hasApplied={appliedJobIds.has(job.id)}
                            isRecruiter={isRecruiter ?? false}
                        />
                    ))}
                </div>
            )
        }
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                {jobsToRender.map((job) => (
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
        )
    }

    return (
        <div className="flex flex-col  ">
            <main className="flex-1 p-4 lg:p-8">
                 <div className="mb-6 space-y-4">
                    <div className="flex justify-between items-center">
                         <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-bold tracking-tight">Job Board</h1>
                        </div>
                        <div className="hidden sm:flex">
                             <ToggleGroup type="single" value={viewMode} onValueChange={(value) => { if(value) setViewMode(value as any)}}>
                                <ToggleGroupItem value="list" aria-label="List view"><List /></ToggleGroupItem>
                                <ToggleGroupItem value="card" aria-label="Card view"><LayoutGrid /></ToggleGroupItem>
                                {isRecruiter && <ToggleGroupItem value="board" aria-label="Board view"><KanbanSquare /></ToggleGroupItem>}
                            </ToggleGroup>
                        </div>
                    </div>
                     {viewMode !== 'board' && (
                        <div className="w-full">
                          <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen} className="space-y-2">
                                <CollapsibleTrigger asChild>
                                    <Button variant="outline" className="h-10">
                                        <Filter className="mr-2 h-4 w-4"/>
                                        Filters
                                        {hasActiveFilters && <span className="ml-2 h-2 w-2 rounded-full bg-blue-500"></span>}
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <Card ref={filterRef} onClick={(e) => e.stopPropagation()} className="p-4 rounded-3xl mt-2 relative">
                                         <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full" onClick={() => setIsFilterOpen(false)}><X className="h-4 w-4" /></Button>
                                        <div className="grid gap-4">
                                             <div className="flex items-center gap-2">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                                    <Input
                                                        type="search"
                                                        placeholder="Search by title..."
                                                        className="pl-10 h-10 w-full"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                    />
                                                </div>
                                                {hasActiveFilters && (
                                                    <Button variant="ghost" onClick={clearAllFilters} className="h-10 px-3">
                                                        Clear
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <MultiSelect
                                                    options={companyOptions}
                                                    selectedValues={selectedCompanies}
                                                    onValueChange={(val) => toggleFilter(setSelectedCompanies, val)}
                                                    placeholder="Filter companies..."
                                                />
                                                <MultiSelect
                                                    options={locationOptions}
                                                    selectedValues={selectedLocations}
                                                    onValueChange={(val) => toggleFilter(setSelectedLocations, val)}
                                                    placeholder="Filter locations..."
                                                />
                                                <MultiSelect
                                                    options={jobTypeOptions}
                                                    selectedValues={selectedJobTypes}
                                                    onValueChange={(val) => toggleFilter(setSelectedJobTypes, val)}
                                                    placeholder="Filter job types..."
                                                />
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row items-end gap-4 justify-center">
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
                                                        <span>${salaryRange[1].toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 justify-end flex-shrink-0">
                                                    {user && !isRecruiter && (
                                                        <Toggle
                                                            pressed={showFavoritesOnly}
                                                            onPressedChange={setShowFavoritesOnly}
                                                            className="h-9 px-3 bg-background"
                                                            aria-label="Show favorites only"
                                                        >
                                                            <Heart className={cn("mr-2 h-4 w-4", showFavoritesOnly && "fill-red-500 text-red-500")} />
                                                            <span>Favorites</span>
                                                        </Toggle>
                                                    )}
                                                     {user && !isRecruiter && (
                                                        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" className="bg-background" disabled={!hasActiveFilters}>
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
                                    </Card>
                                </CollapsibleContent>
                          </Collapsible>
                        </div>
                    )}
                </div>
                
                {viewMode !== 'board' && (
                    <div className="space-y-6">
                        {renderJobs()}
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
                                        isLoading={!jobs} // Kanban uses its own loading prop
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

function JobsPageWrapper() {
    const firestore = useFirestore();
    const [jobCount, setJobCount] = useState<number | null>(null);

    useEffect(() => {
        if (firestore) {
            const jobsCollection = collection(firestore, 'jobs');
            getCountFromServer(jobsCollection).then(snapshot => {
                setJobCount(snapshot.data().count);
            });
        }
    }, [firestore]);

    return (
        <Suspense fallback={<JobsLoading count={jobCount ?? 8} />}>
            <JobsPageContent />
        </Suspense>
    )
}

export default function JobsPage() {
    return <JobsPageWrapper />
}

    

    



















