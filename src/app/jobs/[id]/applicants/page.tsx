'use client';

import { useMemo, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, updateDoc } from 'firebase/firestore';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Users, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getPublicProfile } from '@/ai/flows/get-public-profile-flow';
import type { GetPublicProfileOutput } from '@/ai/flows/get-public-profile-schema';

function ApplicantRow({ application, jobId }: { application: any, jobId: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
    const [applicant, setApplicant] = useState<GetPublicProfileOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        if (!application.applicantId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        getPublicProfile({ userId: application.applicantId })
            .then(profile => setApplicant(profile))
            .catch(err => {
                console.error("Failed to fetch applicant profile:", err);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load applicant profile.' });
            })
            .finally(() => setIsLoading(false));
    }, [application.applicantId, toast]);


    const handleStatusChange = async (newStatus: string) => {
        if (!firestore || !applicant) return;
        setIsUpdating(true);
        
        const mainApplicationRef = doc(firestore, `jobs/${jobId}/applications`, application.id);
        const userApplicationRef = doc(firestore, `users/${application.applicantId}/applications`, jobId);
        const jobRef = doc(firestore, 'jobs', jobId);

        try {
            const statusUpdate = { status: newStatus };
            
            // First, update the application statuses
            const applicationUpdates = [
                updateDoc(mainApplicationRef, statusUpdate),
                updateDoc(userApplicationRef, statusUpdate)
            ];
            await Promise.all(applicationUpdates);
            
            let toastDescription = `${applicant.displayName}'s application is now '${newStatus}'.`;

            // If accepted, also close the job posting
            if (newStatus === 'accepted') {
                const jobStatusUpdate = { status: 'Closed' };
                await updateDoc(jobRef, jobStatusUpdate);
                toastDescription += " The job posting has been automatically closed.";
            }

            toast({ title: "Status Updated", description: toastDescription });

        } catch (error: any) {
            // Determine which update failed for a more specific error
            // This is a simplification; a more complex logic could check which promise failed.
            // For now, we assume the most likely failure is the job update if status is 'accepted'.
            const isJobUpdate = newStatus === 'accepted' && error.message.includes('permission-denied');
            
            if (isJobUpdate) {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: jobRef.path,
                    operation: 'update',
                    requestResourceData: { status: 'Closed' }
                }));
            } else {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: mainApplicationRef.path, // or userApplicationRef.path
                    operation: 'update',
                    requestResourceData: { status: newStatus }
                }));
            }

            toast({ variant: 'destructive', title: 'Update Failed', description: 'You do not have permission to perform this action.' });
        } finally {
            setIsUpdating(false);
        }
    }


    if (isLoading) {
        return (
            <TableRow>
                <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-20" /></TableCell>
            </TableRow>
        );
    }
    
    if (!applicant) {
         return (
            <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Could not load applicant profile.
                </TableCell>
            </TableRow>
        );
    }

    const fallbackText = applicant.displayName?.charAt(0).toUpperCase() || applicant.email?.charAt(0).toUpperCase() || 'U';

    return (
        <TableRow>
            <TableCell>
                 <Avatar>
                    <AvatarImage src={applicant.photoURL} alt={applicant.displayName} />
                    <AvatarFallback>{fallbackText}</AvatarFallback>
                </Avatar>
            </TableCell>
            <TableCell>
                <div className="font-medium">{applicant.displayName}</div>
                <div className="text-sm text-muted-foreground">{applicant.email}</div>
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
        </TableRow>
    )
}


export default function ApplicantsPage() {
    const { id: jobId } = useParams();
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
        if (!firestore || !finalJobId) return null;
        return query(collection(firestore, `jobs/${finalJobId}/applications`));
    }, [firestore, finalJobId]);
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
    
    // Refetch job data when applicants list changes, to update job status if closed
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
                        <CardDescription>Review the candidates who have applied for this position.</CardDescription>
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
                                        </TableRow>
                                    ))
                                )}
                                {!isLoading && applicants && applicants.length > 0 ? (
                                    applicants.map(app => <ApplicantRow key={app.id} application={app} jobId={finalJobId} />)
                                ) : !isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
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
