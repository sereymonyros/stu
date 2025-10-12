
'use client';

import { useMemo, useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useUser } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Board } from '@/components/kanban';
import { DndContext, type DragEndEvent, useSensor, PointerSensor, useSensors } from '@dnd-kit/core';
import { updateApplicationStatus } from '@/ai/flows/update-application-status-flow';
import { analyzeApplicant } from '@/ai/flows/analyze-applicant-flow';
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/ai-cache';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper function to convert a file URL to a Base64 data URI
const urlToDataUri = async (url: string): Promise<string> => {
    // This can be adapted with a proxy if CORS issues arise.
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch file for AI analysis: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};


export default function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: jobId } = use(params);
    const firestore = useFirestore();
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const finalJobId = Array.isArray(jobId) ? jobId[0] : jobId;

    const jobRef = useMemo(() => {
        if (!firestore || !finalJobId) return null;
        return doc(firestore, 'jobs', finalJobId);
    }, [firestore, finalJobId]);

    const { data: job, refetch: refetchJob } = useDoc(jobRef);

    const applicantsQuery = useMemo(() => {
        if (!firestore || !finalJobId) return null;
        return query(collection(firestore, `jobs/${finalJobId}/applications`));
    }, [firestore, finalJobId]);

    const { data: applications, refetch: refetchApplications } = useCollection(applicantsQuery);

     useEffect(() => {
        if (!user) {
            router.replace('/login');
            return;
        }
        if (job && job.recruiterId !== user.uid) {
            toast({ variant: "destructive", title: "Unauthorized", description: "You are not authorized to view applicants for this job." });
            router.replace('/jobs');
        }
    }, [user, job, router, toast]);

    // --- AI Analysis Pre-fetching ---
    useEffect(() => {
        if (job && applications && applications.length > 0) {
            console.log(`Found ${applications.length} applicants. Checking for cached analysis...`);
            applications.forEach(async (app) => {
                try {
                    // Check if analysis is already in the cache
                    const cached = getCachedAnalysis(app.id);
                    if (cached) {
                        console.log(`Analysis for ${app.applicantName} found in cache.`);
                        return;
                    }

                    console.log(`No cache for ${app.applicantName}. Fetching analysis...`);
                    // If not in cache, fetch it
                    const resumeDataUri = await urlToDataUri(app.resumeUrl);
                    const analysisResult = await analyzeApplicant({
                        jobTitle: job.title,
                        jobDescription: job.description,
                        resumeDataUri: resumeDataUri,
                    });
                    
                    // Store the result in the cache
                    setCachedAnalysis(app.id, analysisResult);
                    console.log(`Analysis for ${app.applicantName} fetched and cached.`);

                } catch (error: any) {
                     // We log the error but don't show a toast to avoid spamming the UI
                     console.error(`Failed to pre-fetch analysis for ${app.applicantName}:`, error.message);
                }
            });
        }
    }, [applications, job]);
    

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
            // Require the mouse to move by 8 pixels before activating the drag
            distance: 8,
          },
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const applicationId = active.id as string;
        const newStatus = over.id as string;

        let oldStatus: string | undefined;
        let movedApplicant: any;

        // Find the applicant and its old status from the current state
        for (const status in applicantsByStatus) {
            const app = applicantsByStatus[status].find(a => a.id === applicationId);
            if (app) {
                oldStatus = status;
                movedApplicant = app;
                break;
            }
        }

        if (!oldStatus || !movedApplicant || oldStatus === newStatus) {
            return;
        }

        // Optimistically update UI
        setApplicantsByStatus(prev => {
            const newBoardState = { ...prev };
            // Remove from old column
            if (newBoardState[oldStatus!]) {
                newBoardState[oldStatus!] = newBoardState[oldStatus!].filter(app => app.id !== applicationId);
            }
            // Add to new column
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
             // Revert UI on failure by restoring the original state from before the drag
             setApplicantsByStatus(prev => {
                // To revert, just re-group the original `applications` data
                 if (applications) {
                    const grouped = applications.reduce((acc, app) => {
                        const status = app.status || 'submitted';
                        if (!acc[status]) acc[status] = [];
                        acc[status].push(app);
                        return acc;
                    }, {} as Record<string, any[]>);
                    return grouped;
                }
                return prev; // Fallback
             });
             toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'Could not update applicant status.' });
        }
    };

    const KANBAN_STAGES = ["submitted", "reviewed", "offered", "accepted", "rejected"] as const;

    return (
        <div className="flex flex-col h-[calc(100vh_-_var(--header-height,65px))]">
            <div className="p-4 md:p-6 lg:p-8">
                 <div className="mb-6">
                    <Button variant="ghost" size="sm" className="mb-4" asChild>
                        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                    </Button>
                     {job ? (
                        <div>
                            <div className="flex items-center gap-4">
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><Briefcase className="h-6 w-6 md:h-7 md:w-7" /> {job.title}</h1>
                                {job.status && <Badge variant={job.status === 'Sold' ? 'destructive' : 'default'} className="capitalize text-sm md:text-base">{job.status}</Badge>}
                            </div>
                            <p className="text-muted-foreground text-sm md:text-base">{job.companyName} - {job.location}</p>
                        </div>
                    ) : !applications ? (
                         <div className="space-y-2">
                            <Skeleton className="h-8 w-1/2" />
                            <Skeleton className="h-5 w-1/3" />
                        </div>
                    ) : (
                         <h1 className="text-3xl font-bold tracking-tight">Job not found</h1>
                    )}
                </div>
            </div>
             <div className="flex-1 px-4 md:px-6 lg:px-8 pb-4 flex flex-col min-h-0">
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <ScrollArea className="w-full h-full">
                        <Board>
                            {KANBAN_STAGES.map(stage => {
                                const stageApplicants = applicantsByStatus[stage] || [];
                                return (
                                    <Board.Column
                                        key={stage}
                                        id={stage}
                                        title={stage}
                                        applicants={stageApplicants}
                                        isLoading={!applications}
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
                    </ScrollArea>
                </DndContext>
            </div>
        </div>
    );
}
