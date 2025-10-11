
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
import { getPublicProfile } from '@/ai/flows/get-public-profile-flow';
import type { GetPublicProfileOutput } from '@/ai/flows/get-public-profile-schema';

// Define the stages for the Kanban board
const KANBAN_STAGES = ["submitted", "reviewed", "offered", "accepted", "rejected"] as const;
type KanbanStage = typeof KANBAN_STAGES[number];

type ApplicantWithProfile = {
    id: string; // This is the application doc ID
    profile: GetPublicProfileOutput | null;
    application: any;
}


export default function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: jobId } = use(params);
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const finalJobId = Array.isArray(jobId) ? jobId[0] : jobId;
    
    // This state will now hold the combined applicant and profile data
    const [applicantsWithProfiles, setApplicantsWithProfiles] = useState<ApplicantWithProfile[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    
    const jobRef = useMemo(() => {
        if (!firestore || !finalJobId) return null;
        return doc(firestore, 'jobs', finalJobId);
    }, [firestore, finalJobId]);
    const { data: job, isLoading: isJobLoading, refetch: refetchJob } = useDoc(jobRef);
    
    // This query just fetches the raw application data
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

    // Effect to fetch profiles when applications are loaded
    useEffect(() => {
        if (!applications) {
            setIsDataLoading(areApplicationsLoading);
            return;
        }
        if (applications.length === 0) {
            setApplicantsWithProfiles([]);
            setIsDataLoading(false);
            return;
        }

        setIsDataLoading(true);
        const fetchProfiles = async () => {
            try {
                const profilePromises = applications.map(app => getPublicProfile({ userId: app.applicantId }));
                const profiles = await Promise.all(profilePromises);
                
                const combinedData = applications.map((app, index) => ({
                    id: app.id,
                    application: app,
                    profile: profiles[index] || null
                }));
                setApplicantsWithProfiles(combinedData);
            } catch (err: any) {
                 console.error("Failed to fetch applicant profiles:", err);
                 toast({ variant: 'destructive', title: 'Error Loading Profiles', description: 'Could not load all applicant profiles. Check console for details.' });
            } finally {
                setIsDataLoading(false);
            }
        };

        fetchProfiles();
    }, [applications, areApplicationsLoading, toast]);
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
          activationConstraint: {
            distance: 8,
          },
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        
        if (!over || active.id === over.id || !firestore) {
            return;
        }
        
        const applicantId = active.id as string; // This is the application ID (same as user UID)
        const newStatus = over.id as KanbanStage;
        
        const applicant = applicantsWithProfiles.find(a => a.id === applicantId);
        if (!applicant || applicant.application.status === newStatus) {
            return;
        }
        
        // Optimistically update UI
        setApplicantsWithProfiles(prev => prev.map(a => 
            a.id === applicantId ? { ...a, application: { ...a.application, status: newStatus } } : a
        ));

        // Update Firestore
        const mainApplicationRef = doc(firestore, `jobs/${finalJobId}/applications`, applicant.application.applicantId);
        const userApplicationRef = doc(firestore, `users/${applicant.application.applicantId}/applications`, finalJobId);
        
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
             setApplicantsWithProfiles(prev => prev.map(a => 
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

    const isLoading = isJobLoading || isDataLoading || isUserLoading;
    
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
                            const stageApplicants = applicantsWithProfiles.filter(a => a.application.status === stage);
                            return (
                                <Board.Column 
                                    key={stage}
                                    id={stage} 
                                    title={stage}
                                    applicants={stageApplicants}
                                    isLoading={isLoading}
                                >
                                    {stageApplicants.map(app => (
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
