
'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, updateDoc } from 'firebase/firestore';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Users, Briefcase, Sparkles, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getPublicProfile } from '@/ai/flows/get-public-profile-flow';
import type { GetPublicProfileOutput } from '@/ai/flows/get-public-profile-schema';
import { analyzeApplicant } from '@/ai/flows/analyze-applicant-flow';
import type { AnalyzeApplicantOutput } from '@/ai/flows/analyze-applicant-schema';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


function AIAnalysisDisplay({ analysis, error }: { analysis: AnalyzeApplicantOutput | null, error: string | null }) {
    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Analysis Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    if (!analysis) {
        return (
            <div className="space-y-4 p-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex gap-4 pt-4">
                    <div className="w-1/2 space-y-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                    <div className="w-1/2 space-y-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <Card className="bg-muted/50 p-4">
            <CardHeader className="p-2">
                <CardTitle className="text-xl flex items-center justify-between">
                    <span>AI Analysis Guide</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-4">
                <div>
                    <h4 className="font-semibold text-base mb-2">Recruiter Guidance</h4>
                    <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold text-base mb-2 flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-green-500" /> Key Strengths to Look For</h4>
                        <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                            {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-base mb-2 flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-red-500" /> Points to Consider</h4>
                        <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                             {analysis.gaps.map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}


function ApplicantRow({ application, jobId, jobDetails }: { application: any, jobId: string, jobDetails: any }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
    const [applicant, setApplicant] = useState<GetPublicProfileOutput | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    // AI Analysis State
    const [isAnalysisVisible, setIsAnalysisVisible] = useState(false);
    const [analysis, setAnalysis] = useState<AnalyzeApplicantOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    
    useEffect(() => {
        if (!application.applicantId) {
            setIsLoadingProfile(false);
            return;
        }
        setIsLoadingProfile(true);
        getPublicProfile({ userId: application.applicantId })
            .then(profile => setApplicant(profile))
            .catch(err => {
                console.error("Failed to fetch applicant profile:", err);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load applicant profile.' });
            })
            .finally(() => setIsLoadingProfile(false));
    }, [application.applicantId, toast]);
    

    const handleGetAIAnalysis = async () => {
        if (!jobDetails) {
            toast({ variant: 'destructive', title: 'Missing Job Description', description: 'Cannot perform analysis without a job description.'});
            return;
        }
        
        setIsAnalysisVisible(true);
        setIsAnalyzing(true);
        setAnalysis(null);
        setAnalysisError(null);

        try {
            const result = await analyzeApplicant({
                jobTitle: jobDetails.title,
                jobDescription: jobDetails.description || '',
            });
            setAnalysis(result);
        } catch (error: any) {
            console.error("AI Analysis Failed:", error);
            setAnalysisError(error.message || 'An unknown error occurred during analysis.');
        } finally {
            setIsAnalyzing(false);
        }
    }


    const handleStatusChange = async (newStatus: string) => {
        if (!firestore || !applicant || !jobId) return;
        setIsUpdating(true);
        
        const mainApplicationRef = doc(firestore, `jobs/${jobId}/applications`, application.id);
        const userApplicationRef = doc(firestore, `users/${application.applicantId}/applications`, jobId);
        
        const jobRef = doc(firestore, 'jobs', jobId);

        try {
            const statusUpdate = { status: newStatus };
            
            const applicationUpdates = [
                updateDoc(mainApplicationRef, statusUpdate).catch(serverError => {
                     errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: mainApplicationRef.path,
                        operation: 'update',
                        requestResourceData: statusUpdate
                    }));
                    throw serverError;
                }),
                updateDoc(userApplicationRef, statusUpdate).catch(serverError => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                       path: userApplicationRef.path,
                       operation: 'update',
                       requestResourceData: statusUpdate
                   }));
                   throw serverError;
               })
            ];

            await Promise.all(applicationUpdates);
            
            let toastDescription = `${applicant.displayName || 'Applicant'}'s application is now '${newStatus}'.`;

            if (newStatus === 'accepted') {
                const jobStatusUpdate = { status: 'Closed' };
                await updateDoc(jobRef, jobStatusUpdate).catch(serverError => {
                     errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: jobRef.path,
                        operation: 'update',
                        requestResourceData: jobStatusUpdate
                    }));
                    throw serverError;
                });
                toastDescription += " The job posting has been automatically closed.";
            }

            toast({ title: "Status Updated", description: toastDescription });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: 'You do not have permission or an error occurred.' });
        } finally {
            setIsUpdating(false);
        }
    }

    if (isLoadingProfile) {
        return (
            <TableRow>
                <TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell>
            </TableRow>
        );
    }
    
    if (!applicant) {
         return (
            <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Could not load applicant profile. It may have been deleted.
                </TableCell>
            </TableRow>
        );
    }

    const applicantName = applicant.displayName || 'Unnamed User';
    const applicantEmail = applicant.email || 'No email';
    const fallbackText = applicantName.charAt(0).toUpperCase();

    return (
        <>
            <TableRow>
                <TableCell>
                    <Avatar>
                        <AvatarImage src={applicant.photoURL} alt={applicantName} />
                        <AvatarFallback>{fallbackText}</AvatarFallback>
                    </Avatar>
                </TableCell>
                <TableCell>
                    <div className="font-medium">{applicantName}</div>
                    <div className="text-sm text-muted-foreground">{applicantEmail}</div>
                </TableCell>
                <TableCell>
                    <Select defaultValue={application.status} onValueChange={handleStatusChange} disabled={isUpdating}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Set status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="offered">Offered</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </TableCell>
                <TableCell>
                    {application.appliedAt?.toDate ? formatDistanceToNow(application.appliedAt.toDate(), { addSuffix: true }) : 'N/A'}
                </TableCell>
                <TableCell>
                    {application.resumeUrl ? (
                        <Button variant="outline" size="sm" asChild>
                            <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                                <FileText className="mr-2 h-4 w-4" />
                                View Resume
                            </a>
                        </Button>
                    ) : (
                        <span className="text-sm text-muted-foreground">No Resume</span>
                    )}
                </TableCell>
                <TableCell>
                    {isAnalysisVisible ? (
                         <Button variant="ghost" size="icon" onClick={() => setIsAnalysisVisible(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" onClick={handleGetAIAnalysis} disabled={isAnalyzing}>
                            {isAnalyzing ? (
                                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                            ) : (
                                <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />
                            )}
                            AI Review
                        </Button>
                    )}
                </TableCell>
            </TableRow>
            {isAnalysisVisible && (
                <TableRow>
                    <TableCell colSpan={6}>
                        <AIAnalysisDisplay analysis={isAnalyzing ? null : analysis} error={analysisError} />
                    </TableCell>
                </TableRow>
            )}
        </>
    )
}


export default function ApplicantsPage({ params }: { params: { id: string } }) {
    const jobId = params.id;
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const finalJobId = Array.isArray(jobId) ? jobId[0] : jobId;

    const jobRef = useMemo(() => {
        if (!firestore || !finalJobId) return null;
        return doc(firestore, 'jobs', finalJobId);
    }, [firestore, finalJobId]);
    const { data: job, isLoading: isJobLoading, refetch: refetchJob } = useDoc(jobRef);
    
    const applicantsQuery = useMemo(() => {
        // Wait for user to be loaded and authenticated before creating the query
        if (!firestore || !finalJobId || !user) return null;
        return query(collection(firestore, `jobs/${finalJobId}/applications`));
    }, [firestore, finalJobId, user]);
    const { data: applicants, isLoading: areApplicantsLoading } = useCollection(applicantsQuery);

     useEffect(() => {
        if (isUserLoading || isJobLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        if (job && job.recruiterId !== user.uid) {
            toast({ variant: "destructive", title: "Unauthorized", description: "You are not authorized to view applicants for this job." });
            router.replace('/jobs');
        }
    }, [user, isUserLoading, job, isJobLoading, router, toast]);
    
    useEffect(() => {
        refetchJob();
    }, [applicants, refetchJob]);

    const isLoading = isJobLoading || areApplicantsLoading || isUserLoading;
    
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 container mx-auto p-4 md:p:6 lg:p-8">
                 <div className="mb-6">
                    <Button variant="ghost" size="sm" className="mb-4" asChild>
                        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                    </Button>
                     {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-1/2" />
                            <Skeleton className="h-5 w-1/3" />
                        </div>
                    ) : job ? (
                        <div>
                            <div className="flex items-center gap-4">
                                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Briefcase className="h-7 w-7" /> {job.title}</h1>
                                {job.status && <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize text-base">{job.status}</Badge>}
                            </div>
                            <p className="text-muted-foreground">{job.companyName} - {job.location}</p>
                        </div>
                    ) : (
                         <h1 className="text-3xl font-bold tracking-tight">Job not found</h1>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users />Applicants</CardTitle>
                        <CardDescription>Review the candidates who have applied for this position. You can use the AI Review to get a quick analysis.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16"></TableHead>
                                    <TableHead>Applicant</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date Applied</TableHead>
                                    <TableHead>Resume</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {isLoading && (
                                    Array.from({length: 3}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                        </TableRow>
                                    ))
                                )}
                                {!isLoading && applicants && applicants.length > 0 ? (
                                    applicants.map(app => <ApplicantRow key={app.id} application={app} jobId={finalJobId} jobDetails={job} />)
                                ) : !isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No applicants yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
