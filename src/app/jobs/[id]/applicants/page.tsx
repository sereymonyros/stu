

'use client';

import { useMemo, useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Board } from '@/components/kanban';
import { DndContext, type DragEndEvent, useSensor, PointerSensor, useSensors } from '@dnd-kit/core';
import { updateApplicationStatus } from '@/ai/flows/update-application-status-flow';

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
    
    const { data: applications, isLoading: areApplicationsLoading, refetch: refetchApplications } = useCollection(applicantsQuery);

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
        
        if (!over) {
            return;
        }
        
        const applicationId = active.id as string;
        const newStatus = over.id as string;
        const oldStatus = active.data.current?.sortable.containerId as string;

        // If the card is dropped in the same column, do nothing.
        if (oldStatus === newStatus) {
            return;
        }
        
        let movedApplicant: any;

        // Optimistically update UI
        setApplicantsByStatus(prev => {
            const newBoardState = { ...prev };
            const oldColumn = newBoardState[oldStatus];
            if (!oldColumn) return prev;

            const applicantIndex = oldColumn.findIndex(app => app.id === applicationId);
            if (applicantIndex === -1) return prev;

            [movedApplicant] = oldColumn.splice(applicantIndex, 1);
            if (!movedApplicant) return prev;
            
            const newColumn = newBoardState[newStatus] || [];
            newColumn.push({ ...movedApplicant, status: newStatus });
            newBoardState[newStatus] = newColumn;
            
            return newBoardState;
        });

        // Call the server-side flow to update Firestore
        try {
             await updateApplicationStatus({
                jobId: finalJobId,
                applicationId: movedApplicant.id,
                applicantId: movedApplicant.applicantId,
                newStatus: newStatus as any,
             });

            toast({ title: 'Status Updated', description: `Applicant status moved to ${newStatus}.` });

            if (newStatus === 'accepted') {
                refetchJob();
            }

        } catch (error: any) {
             console.error("Failed to update status via flow:", error);
             // Revert UI on failure
             setApplicantsByStatus(prev => {
                 const revertedState = { ...prev };
                 // Remove from new column if it was added
                 if (revertedState[newStatus]) {
                     revertedState[newStatus] = revertedState[newStatus].filter(app => app.id !== applicationId);
                 }
                 // Add back to old column if it doesn't exist there anymore
                 if (revertedState[oldStatus] && !revertedState[oldStatus].find(app => app.id === applicationId)) {
                     revertedState[oldStatus].push(movedApplicant);
                 }
                 return revertedState;
             });
             toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'Could not update applicant status.' });
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
