
'use client';

import { useMemo, useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { FileText, ArrowLeft, CheckCircle, UploadCloud, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { uploadFile } from '@/ai/flows/upload-file-flow';
import { ACCEPTED_RESUME_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Alert } from '@/components/ui/alert';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { getPublicProfile } from '@/ai/flows/get-public-profile-flow';
import { applicantConfirmationTemplate } from '@/components/emails/applicant-confirmation-template';
import { recruiterNotificationTemplate } from '@/components/emails/recruiter-notification-template';
import { WithdrawApplicationButton } from '@/components/withdraw-application-button';


// Helper function to convert a File to a Base64 data URI
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

  // --- Data Fetching ---
  const jobRef = useMemo(() => {
    if (!firestore || !jobId) return null;
    return doc(firestore, 'jobs', jobId);
  }, [firestore, jobId]);

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  // --- Check if user has already applied ---
  const userApplicationRef = useMemo(() => {
    if (!firestore || !user || !jobId) return null;
    return doc(firestore, `users/${user.uid}/applications`, jobId);
  }, [firestore, user, jobId]);

  const { data: job } = useDoc(jobRef);
  const { data: userProfile, refetch: refetchUserProfile } = useDoc(userProfileRef);
  const { data: application, refetch: refetchApplication } = useDoc(userApplicationRef);

  const hasApplied = !!application;
  const profileComplete = !!userProfile?.photoURL && !!userProfile?.resumeUrl;
  const canWithdraw = hasApplied && (application.status === 'submitted' || application.status === 'reviewed');

  // --- Effects ---
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
    // Redirect if user is not a standard user
    if (userProfile && userProfile.userType !== 'standard') {
        toast({ variant: 'destructive', title: 'Recruiters cannot apply for jobs.' });
        router.replace('/jobs');
    }
  }, [user, userProfile, router, toast]);

  const sendConfirmationEmails = async () => {
    if (!user || !userProfile || !job) return;

    // --- 1. Send email to applicant ---
    if (user.email && userProfile.displayName) {
      try {
        const htmlBody = applicantConfirmationTemplate({
          applicantName: userProfile.displayName,
          jobTitle: job.title,
          companyName: job.companyName,
        });

        await sendEmail({
          to: user.email,
          subject: `Your Application for ${job.title}`,
          htmlBody,
        });
      } catch (e) {
        console.error('Failed to send applicant confirmation email', e);
        // Non-critical, so we just toast. The application was still submitted.
        toast({
          variant: 'destructive',
          title: 'Could not send confirmation email',
          description: 'Your application was submitted, but the confirmation email could not be sent to you.',
        });
      }
    }

    // --- 2. Send email to recruiter ---
    if (job.recruiterId && userProfile.displayName && user.email) {
      try {
        // Fetch the recruiter's public profile to get their email
        const recruiterProfile = await getPublicProfile({ userId: job.recruiterId });

        if (recruiterProfile && recruiterProfile.email) {
            const htmlBody = recruiterNotificationTemplate({
              recruiterName: recruiterProfile.displayName || 'Recruiter',
              applicantName: userProfile.displayName,
              jobTitle: job.title
            });

            await sendEmail({
                to: recruiterProfile.email,
                subject: `New Application for ${job.title}`,
                htmlBody: htmlBody,
                replyTo: user.email,
            });
        } else {
            // This is a data-issue, not a system failure. Log it.
            console.error(`Could not send recruiter notification. Recruiter profile or email not found for ID: ${job.recruiterId}`);
            toast({
                variant: 'destructive',
                title: 'Could not notify recruiter',
                description: 'The recruiter\'s contact information could not be found.',
            });
        }
      } catch (e: any) {
        console.error('Failed to send recruiter notification email', e);
        toast({
          variant: 'destructive',
          title: 'Could not notify recruiter',
          description: 'The application was submitted, but there was an error sending the email notification to the recruiter.',
        });
      }
    }
  };

  // --- Handlers ---
  const handleApply = async () => {
    if (!user || !userProfile || !job || !jobId || hasApplied || isSubmitting || !firestore) return;
    if (!profileComplete) {
      toast({ variant: 'destructive', title: 'Please complete your profile first.' });
      return;
    }

    setIsSubmitting(true);

    try {
      // This is the main application document stored under the job
      const applicationData = {
        applicantId: user.uid,
        jobId: jobId,
        status: 'submitted',
        appliedAt: serverTimestamp(),
        resumeUrl: userProfile.resumeUrl,
        // Denormalized data for recruiter's dashboard
        applicantName: userProfile.displayName || user.email,
        applicantPhotoURL: userProfile.photoURL || '',
      };
      const applicationRef = doc(firestore, 'jobs', jobId, 'applications', user.uid);

      // This is the user's copy of the application, for their dashboard
      const userApplicationData = {
        jobId: jobId,
        appliedAt: serverTimestamp(),
        status: 'submitted', // Add status here as well
      };
      // Re-using userApplicationRef from the useMemo above
      if (!userApplicationRef) {
        throw new Error('Could not create application reference.');
      }

      // Chain the promises
      await Promise.all([
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
      ]);

      // Show success dialog and then send emails
      setIsSuccessDialogOpen(true);
      await sendConfirmationEmails();


    } catch (error) {
      // Errors are already emitted, but we can handle UI feedback here if needed.
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not submit your application. Please check permissions.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !userProfileRef) return;

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
        toast({ variant: 'destructive', title: 'File too large', description: 'Max resume size is 5MB.'});
        return;
    }
     if (!ACCEPTED_RESUME_TYPES.includes(file.type)) {
        toast({ variant: 'destructive', title: 'Invalid file type', description: 'Please upload a PDF, DOC, or DOCX file.'});
        return;
    }

    setIsUploadingResume(true);

    try {
        const fileDataUri = await toBase64(file);
        const uploadResult = await uploadFile({
            fileDataUri,
            fileName: file.name,
            path: `resumes/${user.uid}`
        });

        // Update the user's profile with the new resume URL
        await updateDoc(userProfileRef, { resumeUrl: uploadResult.downloadUrl });

        toast({ title: 'Resume uploaded!', description: 'Your resume has been successfully saved.'});

        // Manually trigger a re-fetch of the user profile data
        refetchUserProfile();

    } catch (e: any) {
        console.error('Resume upload failed:', e);
        toast({ variant: 'destructive', title: 'Upload Failed', description: e.message || 'Could not upload your resume.'});
    } finally {
        setIsUploadingResume(false);
        // Reset the input so the same file can be selected again if needed
        if(resumeInputRef.current) {
            resumeInputRef.current.value = '';
        }
    }
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

  if (!job) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 p-4 md:p:6 lg:p-8 text-center">
            <h2 className="text-2xl font-semibold">Job not found</h2>
            <p className="text-muted-foreground mt-2">This job may no longer be available.</p>
            <Button asChild className="mt-4"><Link href="/jobs">Back to Jobs</Link></Button>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p:6 lg:p-8">
        <div>
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
                    <Badge variant={job.status === 'Sold' ? 'destructive' : 'default'} className="capitalize">{job.status}</Badge>
                </div>
                </div>

                {hasApplied ? (
                    <div className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300 p-4 rounded-md flex flex-col sm:flex-row items-center gap-4">
                         <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                         <div className="flex-1">
                            <span className="font-medium">You have already applied for this job.</span>
                            <p className="text-sm">Your application status is: <span className="font-semibold capitalize">{application.status}</span></p>
                         </div>
                         {canWithdraw && (
                            <WithdrawApplicationButton 
                                jobId={jobId} 
                                onWithdrawSuccess={() => refetchApplication()}
                            />
                         )}
                    </div>
                ) : !profileComplete ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <CardTitle className="mb-2">Profile Incomplete</CardTitle>
                      <CardDescription>You must have a profile picture and a resume uploaded to apply for jobs.</CardDescription>
                      <Button asChild className="mt-4">
                        <Link href="/profile">Go to Profile</Link>
                      </Button>
                    </Alert>
                ) : null}

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
                !hasApplied && profileComplete && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Upload Resume to Apply</h3>
                    <Label htmlFor="resume-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {isUploadingResume ? (
                              <>
                                <div className="animate-spin h-8 w-8 border-2 border-current border-t-transparent rounded-full" role="status" />
                                <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
                              </>
                            ) : (
                              <>
                                  <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                  <p className="mb-1 text-sm text-primary underline">
                                    Click to upload a resume
                                  </p>
                                  <p className="text-xs text-muted-foreground">You must have a resume to apply for jobs.</p>
                              </>
                            )}
                        </div>
                        <Input
                            id="resume-upload"
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx"
                            disabled={isUploadingResume}
                            ref={resumeInputRef}
                            onChange={handleResumeUpload}
                        />
                    </Label>
                  </div>
                )
                )}

            </CardContent>
            {!hasApplied && (
                <CardFooter>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                          className="w-full"
                          disabled={isSubmitting || !profileComplete || job.status === 'Sold' || isUploadingResume}
                      >
                      {isSubmitting ? 'Submitting...' : 'Confirm and Submit Application'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to apply?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your profile and resume will be sent to {job.companyName}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleApply} disabled={isSubmitting}>
                          {isSubmitting ? 'Submitting...' : 'Yes, Submit Application'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
            )}
            </Card>
        </div>

        {/* Success Dialog */}
        <AlertDialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Application Submitted!</AlertDialogTitle>
                <AlertDialogDescription>
                  Your application for "{job?.title}" has been successfully submitted.
                  You can track the status in your dashboard.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button variant="outline" onClick={() => router.push('/jobs')}>
                  Return to Job Board
                </Button>
                <Button onClick={() => router.push('/dashboard')}>
                  Go to My Dashboard
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </main>
    </div>
  );
}
