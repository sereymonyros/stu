
'use client';

import { useMemo, useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, updateDoc } from 'firebase/firestore';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getPublicProfile } from '@/ai/flows/get-public-profile-flow';
import type { GetPublicProfileOutput } from '@/ai/flows/get-public-profile-schema';
import { Board } from '@/components/kanban';
import { DndContext, type DragEndEvent, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

// Define the stages for the Kanban board
const KANBAN_STAGES = ["submitted", "reviewed", "offered", "accepted", "rejected"] as const;
type KanbanStage = typeof KANBAN_STAGES[number];

type ApplicantWithProfile = {
    id: string;
    profile: GetPublicProfileOutput;
    application: any;
}

export default function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: jobId } = use(params);
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const finalJobId = Array.isArray(jobId) ? jobId[0] : jobId;
    
    // State to hold combined applicant and profile data
    const [applicantsData, setApplicantsData] = useState<ApplicantWithProfile[]>([]);
    const [isDerivedDataLoading, setIsDerivedDataLoading] = useState(true);

    const jobRef = useMemo(() => {
        if (!firestore || !finalJobId) return null;
        return doc(firestore, 'jobs', finalJobId);
    }, [firestore, finalJobId]);
    const { data: job, isLoading: isJobLoading, refetch: refetchJob } = useDoc(jobRef);
    
    const applicantsQuery = useMemo(() => {
        if (!firestore || !finalJobId || !user) return null;
        return query(collection(firestore, `jobs/${finalJobId}/applications`));
    }, [firestore, finalJobId, user]);
    const { data: applications, isLoading: areApplicationsLoading } = useCollection(applicantsQuery);

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

    // This effect fetches profiles for each applicant and combines the data.
    useEffect(() => {
        if (!applications) {
            if (!areApplicationsLoading) {
                 setApplicantsData([]);
                 setIsDerivedDataLoading(false);
            }
            return;
        };

        setIsDerivedDataLoading(true);
        Promise.all(
            applications.map(async (app) => {
                try {
                    const profile = await getPublicProfile({ userId: app.applicantId });
                    if (profile) {
                        return { id: app.id, profile, application: app };
                    }
                } catch (error) {
                    console.error(`Failed to fetch profile for applicant ${app.applicantId}`, error);
                }
                return null;
            })
        ).then(results => {
            setApplicantsData(results.filter((r): r is ApplicantWithProfile => r !== null));
            setIsDerivedDataLoading(false);
        });

    }, [applications, areApplicationsLoading]);
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
          activationConstraint: {
            distance: 8,
          },
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        
        if (!over || active.id === over.id) {
            return;
        }
        
        const applicantId = active.id as string;
        const newStatus = over.id as KanbanStage;
        
        const applicant = applicantsData.find(a => a.id === applicantId);
        if (!applicant || applicant.application.status === newStatus) {
            return;
        }
        
        // Optimistically update UI
        setApplicantsData(prev => prev.map(a => 
            a.id === applicantId ? { ...a, application: { ...a.application, status: newStatus } } : a
        ));

        // Update Firestore
        const mainApplicationRef = doc(firestore, `jobs/${finalJobId}/applications`, applicantId);
        const userApplicationRef = doc(firestore, `users/${applicant.application.applicantId}/applications`, finalJobId);
        
        const statusUpdate = { status: newStatus };
        try {
             await Promise.all([
                updateDoc(mainApplicationRef, statusUpdate),
                updateDoc(userApplicationRef, statusUpdate)
             ]);
            toast({ title: 'Status Updated', description: `${applicant.profile.displayName}'s status moved to ${newStatus}.` });

            if (newStatus === 'accepted') {
                const jobRef = doc(firestore, 'jobs', finalJobId);
                const jobStatusUpdate = { status: 'Closed' };
                await updateDoc(jobRef, jobStatusUpdate);
                toast({ title: "Job Closed", description: "The job posting has been automatically closed as an applicant was accepted." });
                refetchJob();
            }

        } catch (error) {
            // Revert UI on failure
            setApplicantsData(prev => prev.map(a => 
                a.id === applicantId ? { ...a, application: { ...a.application, status: applicant.application.status } } : a
            ));
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: mainApplicationRef.path,
                operation: 'update',
                requestResourceData: statusUpdate
            }));
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update applicant status.' });
        }
    };


    const isLoading = isJobLoading || areApplicationsLoading || isUserLoading || isDerivedDataLoading;
    
    return (
        <div className="flex flex-col h-screen">
            <Header />
            <main className="flex-1 flex flex-col container mx-auto p-4 md:p-6 lg:p-8 overflow-x-auto">
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

                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <Board>
                        {KANBAN_STAGES.map(stage => (
                            <Board.Column 
                                key={stage}
                                id={stage} 
                                title={stage}
                                applicants={applicantsData.filter(a => a.application.status === stage)}
                                jobDetails={job}
                                isLoading={isLoading}
                            />
                        ))}
                    </Board>
                </DndContext>
            </main>
        </div>
    );
}
