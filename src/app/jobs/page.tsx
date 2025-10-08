'use client';

import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pencil, Trash2, Heart, Briefcase, Search, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'];

export default function JobsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [jobTypeFilters, setJobTypeFilters] = useState<string[]>([]);
  const [locationFilters, setLocationFilters] = useState<string[]>([]);

  const jobsCollection = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'jobs');
  }, [firestore]);

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  
  const favoriteJobsCollectionRef = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/favoriteJobs`);
  }, [firestore, user]);

  const { data: jobs, isLoading: isJobsLoading } = useCollection(jobsCollection);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  const { data: favoriteJobDocs, isLoading: areFavoritesLoading } = useCollection(favoriteJobsCollectionRef);
  
  const isRecruiter = userProfile?.userType === 'recruiter';
  const favoriteJobIds = useMemo(() => new Set(favoriteJobDocs?.map(fav => fav.id) || []), [favoriteJobDocs]);

  const uniqueLocations = useMemo(() => {
    if (!jobs) return [];
    const locations = jobs.map(job => job.location).filter(Boolean);
    return [...new Set(locations)];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    let filtered = jobs;

    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(job => 
            job.title?.toLowerCase().includes(lowercasedQuery) ||
            job.companyName?.toLowerCase().includes(lowercasedQuery) ||
            job.description?.toLowerCase().includes(lowercasedQuery)
        );
    }
    
    if (showFavoritesOnly) {
      filtered = filtered.filter(job => favoriteJobIds.has(job.id));
    }

    if (jobTypeFilters.length > 0) {
      filtered = filtered.filter(job => job.jobType && jobTypeFilters.includes(job.jobType));
    }

    if (locationFilters.length > 0) {
      filtered = filtered.filter(job => 
        job.location && locationFilters.includes(job.location)
      );
    }
    
    return filtered.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
  }, [jobs, searchQuery, showFavoritesOnly, favoriteJobIds, jobTypeFilters, locationFilters]);

  const handleToggleFavorite = async (jobId: string) => {
    if (!user || !firestore) return;
    const isFavorite = favoriteJobIds.has(jobId);
    const favJobRef = doc(firestore, `users/${user.uid}/favoriteJobs`, jobId);

    try {
      if (isFavorite) {
        await deleteDoc(favJobRef);
        toast({ title: "Job removed from favorites" });
      } else {
        await setDoc(favJobRef, { 
          jobId: jobId,
          favoritedAt: serverTimestamp() 
        });
        toast({ title: "Job saved to favorites!" });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error updating favorites', description: error.message });
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'jobs', jobId));
      toast({ title: "Job deleted successfully." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to delete job', description: error.message });
    }
  };

  const isLoading = isUserLoading || isJobsLoading || isProfileLoading || areFavoritesLoading;
  
  const hasActiveFilters = showFavoritesOnly || jobTypeFilters.length > 0 || locationFilters.length > 0 || searchQuery.length > 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Job Board</h1>
            <div className="flex flex-wrap items-center gap-4">
              {isRecruiter && (
                <Button asChild>
                  <Link href="/jobs/new">Post a New Job</Link>
                </Button>
              )}
            </div>
          </div>
          
          {!isLoading && jobs && jobs.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-4 flex flex-col gap-4">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input 
                        placeholder="Search by title, company, or description..."
                        className="pl-10 w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={isLoading}
                      />
                  </div>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center">
                      <ToggleGroup 
                        type="multiple"
                        variant="outline"
                        value={locationFilters}
                        onValueChange={(value) => setLocationFilters(value)}
                        className="flex-wrap justify-start"
                        disabled={isLoading || uniqueLocations.length === 0}
                        aria-label="Filter by location"
                      >
                        {uniqueLocations.map(location => (
                          <ToggleGroupItem key={location} value={location}>{location}</ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                      
                      {!isRecruiter && user && (
                        <div className="flex items-center space-x-2 sm:ml-auto">
                          <Switch
                            id="favorites-filter"
                            checked={showFavoritesOnly}
                            onCheckedChange={setShowFavoritesOnly}
                            disabled={isLoading}
                          />
                          <Label htmlFor="favorites-filter" className="whitespace-nowrap">Favorites Only</Label>
                        </div>
                      )}
                  </div>
                  <ToggleGroup 
                      type="multiple"
                      variant="outline"
                      value={jobTypeFilters}
                      onValueChange={(value) => setJobTypeFilters(value)}
                      className="flex-wrap justify-start"
                      disabled={isLoading}
                      aria-label="Filter by job type"
                    >
                      {jobTypes.map(type => (
                        <ToggleGroupItem key={type} value={type}>{type}</ToggleGroupItem>
                      ))}
                    </ToggleGroup>
              </CardContent>
            </Card>
          )}


          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-full" /></CardContent><CardFooter><Skeleton className="h-8 w-24" /></CardFooter></Card>
              ))}
            </div>
          )}

          {!isLoading && filteredJobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => {
                const isOwner = user && user.uid === job.recruiterId;
                const isFavorite = favoriteJobIds.has(job.id);

                return (
                  <Card key={job.id} className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold flex items-start justify-between">
                        <span>{job.title}</span>
                        <div className="flex flex-col items-end gap-2">
                           {job.jobType && <Badge variant="secondary">{job.jobType}</Badge>}
                           {job.status && <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize">{job.status}</Badge>}
                        </div>
                      </CardTitle>
                      <p className="text-muted-foreground">{job.companyName} - {job.location}</p>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2">
                       <p className="text-sm text-muted-foreground line-clamp-3">{job.description}</p>
                       {job.salary && <p className="font-semibold text-primary">{job.salary}</p>}
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                      {!isRecruiter && (
                         <Button variant="outline">Apply Now</Button>
                      )}
                      {user && (
                        <div className="flex items-center gap-2">
                          {isOwner && (
                            <>
                              <Button asChild variant="ghost" size="icon" title="Edit Job">
                                <Link href={`/jobs/${job.id}/edit`}>
                                  <Pencil className="h-5 w-5" />
                                </Link>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" title="Delete Job" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the job posting.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteJob(job.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                          {!isRecruiter && (
                            <Button variant="ghost" size="icon" onClick={() => handleToggleFavorite(job.id)} title={isFavorite ? 'Unfavorite' : 'Favorite'}>
                              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                            </Button>
                          )}
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}

          {!isLoading && (!filteredJobs || filteredJobs.length === 0) && (
            <div className="text-center py-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-4">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {hasActiveFilters ? "No matching jobs found" : "No jobs posted yet"}
                </h2>
                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                  {hasActiveFilters 
                    ? "Try adjusting your filters to find more jobs."
                    : (isRecruiter ? "Post a job to attract top talent and fill your open positions." : "There are currently no open positions. Check back later for new opportunities!")
                  }
                </p>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" className="mt-4" onClick={() => {
                  setSearchQuery('');
                  setLocationFilters([]);
                  setJobTypeFilters([]);
                  setShowFavoritesOnly(false);
                }}>Clear all filters</Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
