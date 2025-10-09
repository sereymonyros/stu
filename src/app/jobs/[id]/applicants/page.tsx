'use client';

import { useMemo, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
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

function ApplicantRow({ application }: { application: any }) {
    const firestore = useFirestore();
    
    const applicantRef = useMemo(() => {
        if (!firestore || !application.applicantId) return null;
        return doc(firestore, 'users', application.applicantId);
    }, [firestore, application.applicantId]);

    const { data: applicant, isLoading } = useDoc(applicantRef);

    if (isLoading) {
        return (
            <TableRow>
                <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
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
                <Badge variant={application.status === 'reviewed' ? 'secondary' : 'default'} className="capitalize">{application.status}</Badge>
            </TableCell>
            <TableCell>
                {application.appliedAt ? formatDistanceToNow(application.appliedAt.toDate(), { addSuffix: true }) : 'N/A'}
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
    const { data: job, isLoading: isJobLoading } = useDoc(jobRef);
    
    const applicantsQuery = useMemo(() => {
        if (!firestore || !finalJobId) return null;
        return collection(firestore, `jobs/${finalJobId}/applications`);
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
                            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Briefcase className="h-7 w-7" /> {job.title}</h1>
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
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                                        </TableRow>
                                    ))
                                )}
                                {!isLoading && applicants && applicants.length > 0 ? (
                                    applicants.map(app => <ApplicantRow key={app.id} application={app} />)
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
