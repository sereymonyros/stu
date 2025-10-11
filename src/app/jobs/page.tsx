

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
import { Heart, Briefcase, Building, MapPin, DollarSign, Pencil, Search, FilterX, Star, LayoutGrid, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
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
import { DndContext, type DragEndEvent, useSensor, PointerSensor, useSensors } from '@dnd-kit/core';
import { Board as JobKanban } from '@/components/job-kanban';
import { updateJobStatus } from '@/ai/flows/update-job-status-flow';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
    const searchParams = useSearchParams();
    
    // --- View State ---
    const [viewMode, setViewMode] = useState<'card' | 'board'>('card');
    
    // --- Data for Kanban Board state ---
    const [jobsByStatus, setJobsByStatus] = useState<Record<string, any[]>>({});


    // --- Data Fetching ---
    const jobsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'jobs'));
    }, [firestore]);
    const { data: jobs, isLoading: areJobsLoading, refetch: refetchJobs } = useCollection(jobsQuery);
    
    // --- Dynamic Filter Options ---
    const { companyNames, locations, jobTypes, maxSalary } = useMemo(() => {
        if (!jobs) return { companyNames: [], locations: [], jobTypes: [], maxSalary: 150000 };
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
            companyNames: Array.from(companies).sort(),
            locations: Array.from(locs).sort(),
            jobTypes: Array.from(types).sort(),
            maxSalary: finalMaxSalary,
        };
    }, [jobs]);

    // --- Search & Filter State ---
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [selectedCompanies, setSelectedCompanies] = useState<string[]>(searchParams.getAll('company') || []);
    const [selectedLocations, setSelectedLocations] = useState<string[]>(searchParams.getAll('location') || []);
    const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(searchParams.getAll('jobType') || []);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(searchParams.get('favorites') === 'true');
    const [salaryRange, setSalaryRange] = useState<[number, number]>([0, maxSalary]);

    // --- Dialog State ---
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [savedSearchName, setSavedSearchName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // Initialize salary range from URL params or default
    useEffect(() => {
        const min = searchParams.get('salaryMin');
        const max = searchParams.get('salaryMax');
        const initialMin = min ? parseInt(min, 10) : 0;
        const initialMax = max ? parseInt(max, 10) : maxSalary;
        setSalaryRange([initialMin, initialMax]);
    }, [maxSalary, searchParams]);

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        selectedCompanies.forEach(c => params.append('company', c));
        selectedLocations.forEach(l => params.append('location', l));
        selectedJobTypes.forEach(t => params.append('jobType', t));
        if (showFavoritesOnly) params.set('favorites', 'true');
        
        // Only add salary to URL if it's not the default range
        if (salaryRange[0] > 0 || salaryRange[1] < maxSalary) {
            params.set('salaryMin', salaryRange[0].toString());
            params.set('salaryMax', salaryRange[1].toString());
        }
        
        router.replace(`/jobs?${params.toString()}`);
    }, [searchQuery, selectedCompanies, selectedLocations, selectedJobTypes, showFavoritesOnly, salaryRange, router, maxSalary]);


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
            searchQuery: searchQuery,
            filters: {
                companyNames: selectedCompanies,
                locations: selectedLocations,
                jobTypes: selectedJobTypes,
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
        // 3. Salary filter
        const [filterMin, filterMax] = salaryRange;
        if (filterMin > 0 || filterMax < maxSalary) {
             filtered = filtered.filter(job => {
                const jobMin = job.salaryMin ?? 0;
                const jobMax = job.salaryMax ?? Infinity;
                // The job's salary range must overlap with the filter's range
                return Math.max(jobMin, filterMin) <= Math.min(jobMax, filterMax);
            });
        }

        // 4. Sort for authenticated users
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
        // Group jobs by status for the Kanban board
        if (jobs && user) {
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
    }, [jobs, user]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );

    const handleJobDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;
    
        const jobId = active.id as string;
        const newStatus = over.id as string;
    
        // Find the old status from the job itself within the local state
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
    
        if (!oldStatus || !movedJob) {
            console.error("Could not find job in local state to determine old status.");
            return;
        }
    
        if (oldStatus === newStatus) {
            return;
        }
        
        // Optimistic UI update
        setJobsByStatus(prev => {
            const newState = { ...prev };
            const oldColumn = newState[oldStatus] ? newState[oldStatus].filter(j => j.id !== jobId) : [];
            const newColumn = newState[newStatus] ? [...newState[newStatus], { ...movedJob, status: newStatus }] : [{ ...movedJob, status: newStatus }];
            
            newState[oldStatus] = oldColumn;
            newState[newStatus] = newColumn;
            
            return newState;
        });
        
        // Call server-side flow
        try {
            await updateJobStatus({ jobId: jobId, newStatus: newStatus as any });
            toast({ title: 'Job Status Updated', description: `Job moved to ${newStatus}.` });
        } catch (error: any) {
            console.error("Failed to update job status:", error);
            // Revert UI on failure
            setJobsByStatus(prev => {
                 const revertedState = { ...prev };
                 // Remove from new column if it was added
                 if (revertedState[newStatus]) {
                     revertedState[newStatus] = revertedState[newStatus].filter(j => j.id !== jobId);
                 }
                 // Add back to old column if it doesn't exist there anymore
                 if (revertedState[oldStatus] && !revertedState[oldStatus].find(j => j.id === jobId)) {
                     revertedState[oldStatus].push(movedJob);
                 }
                 return revertedState;
            });
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        }
    };
    
    const KANBAN_STAGES: ('Available' | 'Offering' | 'Closed')[] = ["Available", "Offering", "Closed"];

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
                        <div className="flex items-center gap-2">
                           {isRecruiter && (
                                <ToggleGroup type="single" value={viewMode} onValueChange={(value) => { if(value) setViewMode(value as any)}} defaultValue="card">
                                    <ToggleGroupItem value="card" aria-label="Card view"><List /></ToggleGroupItem>
                                    <ToggleGroupItem value="board" aria-label="Board view"><LayoutGrid /></ToggleGroupItem>
                                </ToggleGroup>
                            )}
                            {isRecruiter && (
                                <Button asChild>
                                    <Link href="/jobs/new">Post a New Job</Link>
                                </Button>
                            )}
                        </div>
                    </div>
                    
                    {viewMode === 'card' && (
                        <>
                            <Card className="p-4 mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    <div className="relative md:col-span-2 lg:col-span-3">
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
                                        {user && !isRecruiter && hasActiveFilters && (
                                            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline">
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
                                        {hasActiveFilters && (
                                            <Button variant="ghost" onClick={clearAllFilters}>
                                                <FilterX className="mr-2 h-4 w-4" />
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <Separator className="mb-4" />

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                                    <FilterGroup title="Company" options={companyNames} selected={selectedCompanies} onToggle={(val) => toggleFilter(setSelectedCompanies, val)} />
                                    <FilterGroup title="Location" options={locations} selected={selectedLocations} onToggle={(val) => toggleFilter(setSelectedLocations, val)} />
                                    <FilterGroup title="Job Type" options={jobTypes} selected={selectedJobTypes} onToggle={(val) => toggleFilter(setSelectedJobTypes, val)} />
                                    
                                    <div>
                                        <h3 className="text-sm font-semibold mb-2">Salary Range</h3>
                                        <Slider
                                            value={salaryRange}
                                            onValueChange={setSalaryRange}
                                            max={maxSalary}
                                            step={1000}
                                            className="my-4"
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>${salaryRange[0].toLocaleString()}</span>
                                            <span>${salaryRange[1].toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                {user && !isRecruiter && (
                                    <div className="mt-4">
                                        <Toggle
                                            size="sm"
                                            variant="outline"
                                            pressed={showFavoritesOnly}
                                            onPressedChange={setShowFavoritesOnly}
                                            className="h-10 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                        >
                                            <Heart className="mr-2 h-4 w-4" />
                                            Show My Favourites Only
                                        </Toggle>
                                    </div>
                                )}
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
                                        <JobKanban.Card 
                                            key={job.id} 
                                            job={job}
                                            isFavourite={favouriteJobIds.has(job.id)}
                                            onToggleFavourite={handleToggleFavourite}
                                            hasApplied={appliedJobIds.has(job.id)}
                                            isRecruiter={isRecruiter}
                                            isDraggable={false}
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
                        </>
                    )}

                    {viewMode === 'board' && isRecruiter && (
                         <div className="flex-1 flex flex-col overflow-x-auto">
                            <DndContext sensors={sensors} onDragEnd={handleJobDragEnd}>
                                <JobKanban>
                                    {KANBAN_STAGES.map(stage => {
                                        const stageJobs = jobsByStatus[stage] || [];
                                        return (
                                            <JobKanban.Column
                                                key={stage}
                                                id={stage}
                                                title={stage}
                                                isLoading={isLoading}
                                            >
                                                {stageJobs.map((job: any) => (
                                                    <JobKanban.Card
                                                        key={job.id}
                                                        job={job}
                                                        isFavourite={false}
                                                        onToggleFavourite={() => {}}
                                                        hasApplied={false}
                                                        isRecruiter={true}
                                                        isDraggable={true}
                                                    />
                                                ))}
                                            </JobKanban.Column>
                                        );
                                    })}
                                </JobKanban>
                            </DndContext>
                         </div>
                    )}
                </div>
            </main>
        </div>
    );
}
