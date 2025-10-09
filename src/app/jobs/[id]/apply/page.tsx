
'use client';

import { useMemo, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { FileText, AlertTriangle, ArrowLeft, CheckCircle, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export default function ApplyPage() {
  const { id: jobId } = useParams();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const finalJobId = Array.isArray(jobId) ? jobId[0] : jobId;

  // --- Data Fetching ---
  const jobRef = useMemo(() => {
    if (!firestore || !finalJobId) return null;
    return doc(firestore, 'jobs', finalJobId);
  }, [firestore, finalJobId]);

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  // --- Check if user has already applied ---
  const userApplicationRef = useMemo(() => {
    if (!firestore || !user || !finalJobId) return null;
    return doc(firestore, `users/${user.uid}/applications`, finalJobId);
  }, [firestore, user, finalJobId]);

  const { data: job, isLoading: isJobLoading } = useDoc(jobRef);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  const { data: application, isLoading: isApplicationLoading } = useDoc(userApplicationRef);
  
  const hasApplied = !!application;

  // --- Effects ---
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
    // Redirect if user is not a standard user
    if (userProfile && userProfile.userType !== 'standard') {
        toast({ variant: 'destructive', title: 'Recruiters cannot apply for jobs.' });
        router.replace('/jobs');
    }
  }, [user, isUserLoading, userProfile, router, toast]);

  // --- Handlers ---
  const handleApply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !userProfile || !finalJobId || hasApplied || isSubmitting) return;
    if (!userProfile.resumeUrl) {
      toast({ variant: 'destructive', title: 'Please upload a resume first.' });
      return;
    }

    setIsSubmitting(true);

    const applicationData = {
      applicantId: user.uid,
      jobId: finalJobId,
      status: 'submitted',
      appliedAt: serverTimestamp(),
      resumeUrl: userProfile.resumeUrl,
    };
    const applicationRef = doc(firestore, 'jobs', finalJobId, 'applications', user.uid);

    const userApplicationData = {
      jobId: finalJobId,
      appliedAt: serverTimestamp(),
    };
    // Re-using userApplicationRef from the useMemo above
    if (!userApplicationRef) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not create application reference.' });
      setIsSubmitting(false);
      return;
    }

    // Chain the promises
    Promise.all([
      setDoc(applicationRef, applicationData).catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: applicationRef.path,
          operation: 'create',
          requestResourceData: applicationData,
        });
        errorEmitter.emit('permission-error', permissionError);
        // Throw to prevent the .then() block from executing
        throw permissionError;
      }),
      setDoc(userApplicationRef, userApplicationData).catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: userApplicationRef.path,
          operation: 'create',
          requestResourceData: userApplicationData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      })
    ]).then(() => {
      toast({ title: 'Application submitted!', description: `You have successfully applied for ${job?.title}.` });
      router.push('/jobs');
    }).catch((error) => {
      // Errors are already emitted, but we can handle UI feedback here if needed.
      // For instance, if the first setDoc fails, the second won't run.
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not submit your application. Please check permissions.' });
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  const getFileName = (url: string) => {
    try {
      const decodedUrl = decodeURIComponent(url);
      const urlPath = new URL(decodedUrl).pathname;
      const parts = urlPath.split('/');
      return parts[parts.length - 1];
    } catch (error) {
      console.error("Could not parse file URL:", error);
      return "resume-file";
    }
  };

  // --- Loading & Render States ---
  const isLoading = isUserLoading || isProfileLoading || isJobLoading || isApplicationLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p:6 lg:p-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p:6 lg:p-8 text-center">
            <h2 className="text-2xl font-semibold">Job not found</h2>
            <p className="text-muted-foreground mt-2">This job may no longer be available.</p>
            <Button asChild className="mt-4"><Link href="/jobs">Back to Jobs</Link></Button>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p:6 lg:p-8">
        <form onSubmit={handleApply}>
            <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <Button variant="ghost" size="sm" className="mb-4 w-fit -ml-2" asChild>
                    <Link href="/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs</Link>
                </Button>
                <CardTitle className="text-2xl">Apply for {job.title}</CardTitle>
                <CardDescription>Review your information before submitting your application to <span className="font-semibold">{job.companyName}</span>.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                <h3 className="font-semibold mb-2">Job Details</h3>
                <div className="flex items-center gap-2">
                    {job.jobType && <Badge variant="secondary">{job.jobType}</Badge>}
                    <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize">{job.status}</Badge>
                </div>
                </div>

                {hasApplied && (
                    <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300">
                         <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertTitle>Already Applied</AlertTitle>
                    </Alert>
                )}

                {userProfile && userProfile.resumeUrl ? (
                <div>
                    <h3 className="font-semibold mb-2">Your Resume</h3>
                    <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/50">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <a href={userProfile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline flex-1 truncate">
                        {getFileName(userProfile.resumeUrl)}
                    </a>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        This is the resume that will be sent with your application. You can update it on your <Link href="/profile" className="underline">profile page</Link>.
                    </p>
                </div>
                ) : (
                <div className="space-y-2">
                  <h3 className="font-semibold">Upload Resume to Apply</h3>
                  <Link href="/profile" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="mb-1 text-sm text-primary underline">
                            Go to profile to upload a resume
                          </p>
                          <p className="text-xs text-muted-foreground">You must have a resume to apply for jobs.</p>
                      </div>
                  </Link>
                </div>
                )}

            </CardContent>
            {!hasApplied && (
                <CardFooter>
                    <Button 
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting || !userProfile?.resumeUrl || job.status === 'Closed'}
                    >
                    {isSubmitting ? 'Submitting...' : 'Confirm and Submit Application'}
                    </Button>
                </CardFooter>
            )}
            </Card>
        </form>
      </main>
    </div>
  );
}
