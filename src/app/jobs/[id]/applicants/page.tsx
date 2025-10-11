

'use client';

import { useMemo, useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, updateDoc } from 'firebase/firestore';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Board } from '@/components/kanban';
import { DndContext, type DragEndEvent, useSensor, PointerSensor, useSensors } from '@dnd-kit/core';

export default function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: jobId } = use(params);
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

    const [applicantsByStatus, setApplicantsByStatus] = useState<Record<string, any[]>>({});

    useEffect(() => {
        if (applications) {
            const grouped = applications.reduce((acc, app) => {
                const status = app.status || 'submitted';
                if (!acc[status]) {
                    acc[status] = [];
                }
                acc[status].push(app);
                return acc;
            }, {} as Record<string, any[]>);
            setApplicantsByStatus(grouped);
        }
    }, [applications]);

    
    const sensors = useSensors(
        useSensor(PointerSensor, {
          activationConstraint: {
            distance: 8,
          },
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        
        if (!over || active.id === over.id || !firestore || !applications) {
            return;
        }
        
        const applicationId = active.id as string;
        const newStatus = over.id as string;
        
        const application = applications.find(a => a.id === applicationId);
        if (!application || application.status === newStatus) {
            return;
        }
        
        // Optimistically update UI
        const oldStatus = application.status;
        setApplicantsByStatus(prev => {
            const newBoardState = { ...prev };
            // Remove from old column
            newBoardState[oldStatus] = newBoardState[oldStatus]?.filter(app => app.id !== applicationId);
            // Add to new column
            const updatedApp = { ...application, status: newStatus };
            if (!newBoardState[newStatus]) newBoardState[newStatus] = [];
            newBoardState[newStatus].push(updatedApp);
            return newBoardState;
        });

        // Update Firestore
        const mainApplicationRef = doc(firestore, `jobs/${finalJobId}/applications`, application.id);
        const userApplicationRef = doc(firestore, `users/${application.applicantId}/applications`, finalJobId);
        
        const statusUpdate = { status: newStatus };
        try {
             await Promise.all([
                updateDoc(mainApplicationRef, statusUpdate),
                updateDoc(userApplicationRef, statusUpdate)
             ]);
            toast({ title: 'Status Updated', description: `Applicant status moved to ${newStatus}.` });

            if (newStatus === 'accepted') {
                const jobRef = doc(firestore, 'jobs', finalJobId);
                const jobStatusUpdate = { status: 'Closed' };
                await updateDoc(jobRef, jobStatusUpdate);
                toast({ title: "Job Closed", description: "The job posting has been automatically closed as an applicant was accepted." });
                refetchJob();
            }

        } catch (error) {
            // Revert UI on failure
            setApplicantsByStatus(prev => {
                const revertedState = { ...prev };
                // Remove from new column
                revertedState[newStatus] = revertedState[newStatus]?.filter(app => app.id !== applicationId);
                // Add back to old column
                 if (!revertedState[oldStatus]) revertedState[oldStatus] = [];
                revertedState[oldStatus].push(application);
                return revertedState;
            });
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: mainApplicationRef.path,
                operation: 'update',
                requestResourceData: statusUpdate
            }));
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update applicant status.' });
        }
    };

    const isLoading = isJobLoading || areApplicationsLoading || isUserLoading;

    const KANBAN_STAGES = ["submitted", "reviewed", "offered", "accepted", "rejected"] as const;
    
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
                        {KANBAN_STAGES.map(stage => {
                            const stageApplicants = applicantsByStatus[stage] || [];
                            return (
                                <Board.Column 
                                    key={stage}
                                    id={stage} 
                                    title={stage}
                                    applicants={stageApplicants}
                                    isLoading={isLoading}
                                >
                                    {stageApplicants.map((app: any) => (
                                        <Board.Card 
                                          key={app.id}
                                          applicant={app}
                                          jobDetails={job}
                                        />
                                    ))}
                                </Board.Column>
                            )
                        })}
                    </Board>
                </DndContext>
            </main>
        </div>
    );
}
