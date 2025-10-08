'use client';

import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { collection, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import Link from 'next/link';
import { useMemo } from 'react';
import { Pencil, Trash2, Heart, Briefcase } from 'lucide-react';
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

export default function JobsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const jobsCollection = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'jobs');
  }, [firestore]);

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: jobs, isLoading: isJobsLoading } = useCollection(jobsCollection);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const isRecruiter = userProfile?.userType === 'recruiter';
  const favoriteJobIds = useMemo(() => new Set(userProfile?.favoriteJobs || []), [userProfile]);

  const handleToggleFavorite = async (jobId: string) => {
    if (!userProfileRef) return;
    const isFavorite = favoriteJobIds.has(jobId);
    try {
      await updateDoc(userProfileRef, {
        favoriteJobs: isFavorite ? arrayRemove(jobId) : arrayUnion(jobId)
      });
      toast({
        title: isFavorite ? "Job removed from favorites" : "Job saved to favorites!",
      });
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

  const isLoading = isUserLoading || isJobsLoading || isProfileLoading;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Job Board</h1>
            {isRecruiter && (
              <Button asChild>
                <Link href="/jobs/new">Post a New Job</Link>
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-full" /></CardContent><CardFooter><Skeleton className="h-8 w-24" /></CardFooter></Card>
              ))}
            </div>
          )}

          {!isLoading && jobs && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => {
                const isOwner = user && user.uid === job.recruiterId;
                const isFavorite = favoriteJobIds.has(job.id);

                return (
                  <Card key={job.id} className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold flex items-start justify-between">
                        <span>{job.title}</span>
                        <div className="flex flex-col items-end gap-2">
                           <Badge variant="secondary">{job.jobType}</Badge>
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
                      <Button variant="outline">Apply Now</Button>
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

          {!isLoading && (!jobs || jobs.length === 0) && (
            <div className="text-center py-20 border-2 border-dashed rounded-lg">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-2xl font-semibold">No jobs posted yet</h2>
              <p className="text-muted-foreground mt-2">
                {isRecruiter ? "Post a job to attract candidates." : "Check back later for new opportunities!"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
