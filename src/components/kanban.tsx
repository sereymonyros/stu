
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable, DndContext, type DragEndEvent, useSensor, PointerSensor, useSensors } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles, ThumbsDown, ThumbsUp, X, Lightbulb, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { analyzeApplicant } from '@/ai/flows/analyze-applicant-flow';
import type { AnalyzeApplicantOutput } from '@/ai/flows/analyze-applicant-schema';
import { useToast } from '@/hooks/use-toast';
import type { Timestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/ai-cache';


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

function AIAnalysisDisplay({ analysis, error, isLoading, onRetry }: { analysis: AnalyzeApplicantOutput | null, error: string | null, isLoading: boolean, onRetry: () => void }) {
    if (isLoading) {
       return (
            <div className="flex flex-col items-center justify-center p-4">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4" />
                <p className="text-muted-foreground">Analysis in progress...</p>
            </div>
        )
    }
    
    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Analysis Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <Button onClick={onRetry} variant="secondary" className="mt-4">Retry Analysis</Button>
            </Alert>
        )
    }

    if (!analysis) {
        return (
             <div className="text-center p-4 space-y-3">
                <p className="text-muted-foreground">Analysis is not yet available.</p>
                <Button onClick={onRetry}>Start Analysis</Button>
             </div>
        )
    }

    return (
        <div className="space-y-4">
            <Card className="bg-muted/50 p-4 rounded-3xl">
                <CardHeader className="p-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>AI Summary</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Match Score:</span>
                            <Progress value={analysis.matchScore} className="w-24 h-2" />
                            <span className="text-sm font-bold">{analysis.matchScore}%</span>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-4">
                    <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                </CardContent>
            </Card>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-muted/50 p-4 rounded-3xl">
                    <CardHeader className="p-0">
                         <CardTitle className="text-base mb-2 flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-green-500" /> Strengths</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                            {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </CardContent>
                </Card>
                 <Card className="bg-muted/50 p-4 rounded-3xl">
                    <CardHeader className="p-0">
                         <CardTitle className="text-base mb-2 flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-red-500" /> Gaps</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                         <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                             {analysis.gaps.map((g, i) => <li key={i}>{g}</li>)}
                         </ul>
                    </CardContent>
                </Card>
            </div>
            
            {analysis.performanceIndicators && analysis.performanceIndicators.length > 0 && (
                <Card className="bg-muted/50 p-4 rounded-3xl">
                    <CardHeader className="p-0">
                        <CardTitle className="text-base mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /> Performance Indicators</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                            {analysis.performanceIndicators.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-muted/50 p-4 rounded-3xl">
                <CardHeader className="p-0">
                    <CardTitle className="text-base mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-500" /> Suggested Interview Questions</CardTitle>
                </CardHeader>
                 <CardContent className="p-0">
                     <ul className="list-decimal pl-5 text-sm space-y-2 text-muted-foreground">
                         {analysis.suggestedInterviewQuestions.map((q, i) => <li key={i}>{q}</li>)}
                     </ul>
                </CardContent>
            </Card>

        </div>
    )
}

function ApplicantCard({ applicant, jobDetails }: { applicant: any, jobDetails: any }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: applicant.id });
    const { toast } = useToast();
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        boxShadow: isDragging ? '0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -4px rgb(0 0 0 / 0.1)' : undefined,
        transform: isDragging ? `${CSS.Transform.toString(transform)} scale(1.05)` : CSS.Transform.toString(transform),
        zIndex: isDragging ? 10 : 'auto',
    };
    
    // State is now managed inside the card
    const [analysis, setAnalysis] = useState<AnalyzeApplicantOutput | null>(() => getCachedAnalysis(applicant.id, applicant.resumeUrl));
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

    // This effect ensures that if the resume URL changes (from a parent re-render), we check the cache again.
    useEffect(() => {
        setAnalysis(getCachedAnalysis(applicant.id, applicant.resumeUrl));
    }, [applicant.id, applicant.resumeUrl]);


    // This function is called when the dialog opens or when "Retry" is clicked.
    const handleGetAIAnalysis = async () => {
        // Always check cache first.
        const cached = getCachedAnalysis(applicant.id, applicant.resumeUrl);
        if (cached) {
            setAnalysis(cached);
            return;
        }

        // If not cached, and not already loading, then fetch.
        if (isLoadingAnalysis) return;

        setIsLoadingAnalysis(true);
        setAnalysisError(null);

        try {
            const resumeDataUri = await urlToDataUri(applicant.resumeUrl);
            const result = await analyzeApplicant({
                jobTitle: jobDetails.title,
                jobDescription: jobDetails.description,
                resumeDataUri: resumeDataUri,
            });
            setAnalysis(result);
            setCachedAnalysis(applicant.id, applicant.resumeUrl, result); // Save to cache on success
        } catch (error: any) {
            console.error("AI Analysis Failed:", error);
            const friendlyError = error.message || 'An unknown error occurred during analysis.';
            setAnalysisError(friendlyError);
            toast({ variant: 'destructive', title: 'Analysis Failed', description: friendlyError });
        } finally {
            setIsLoadingAnalysis(false);
        }
    };
        
    // Safely convert Firestore Timestamp, JS Date, or date string to a valid Date object.
    const appliedAtDate = useMemo(() => {
        const appliedAt = applicant.appliedAt;
        if (!appliedAt) return null;
        // Case 1: Firestore Timestamp object (from live snapshot)
        if (typeof appliedAt.toDate === 'function') {
            return (appliedAt as Timestamp).toDate();
        }
        // Case 2: Already a Date object
        if (appliedAt instanceof Date) {
            return appliedAt;
        }
        // Case 3: A string or number from cache or serialized data.
        // The Date constructor can handle ISO strings and numbers (timestamps).
        const date = new Date(appliedAt);
        // Check if the created date is valid before returning
        return isNaN(date.getTime()) ? null : date;
    }, [applicant.appliedAt]);


    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className={cn("mb-2 bg-card hover:bg-muted/50 rounded-3xl", isDragging ? "cursor-grabbing" : "cursor-grab")}>
                <div className="p-3" {...listeners}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                             <Avatar className="h-8 w-8">
                                <AvatarImage src={applicant.applicantPhotoURL} />
                                <AvatarFallback>{applicant.applicantName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm leading-tight select-none">{applicant.applicantName}</p>
                                {appliedAtDate && (
                                    <p className="text-xs text-muted-foreground leading-tight">Applied {formatDistanceToNow(appliedAtDate, { addSuffix: true })}</p>
                                )}
                            </div>
                        </div>
                         {applicant.resumeUrl && (
                             <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={applicant.resumeUrl} target="_blank" rel="noopener noreferrer">
                                    <FileText className="h-4 w-4" />
                                </a>
                            </Button>
                         )}
                    </div>
                     <Dialog onOpenChange={(open) => { if (open) handleGetAIAnalysis() }}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
                                <Sparkles className="mr-2 h-3 w-3 text-yellow-500" />
                                AI Review
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl h-[70vh] flex flex-col rounded-3xl">
                            <DialogHeader>
                                <DialogTitle>AI Applicant Analysis</DialogTitle>
                                <DialogDescription>
                                    This is an AI-generated analysis of the applicant's resume against the job description.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 overflow-y-auto flex-1">
                                <AIAnalysisDisplay 
                                  analysis={analysis} 
                                  error={analysisError} 
                                  isLoading={isLoadingAnalysis}
                                  onRetry={handleGetAIAnalysis}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </Card>
        </div>
    );
}

function Column({ id, title, children, applicants, isLoading }: { id: string, title: string, children: React.ReactNode, applicants: any[], isLoading: boolean }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    const applicantIds = useMemo(() => applicants.map(a => a.id), [applicants]);

    const titleColors: { [key: string]: string } = {
        submitted: 'border-blue-500',
        reviewed: 'border-yellow-500',
        offered: 'border-purple-500',
        accepted: 'border-green-500',
        rejected: 'border-red-500',
    };

    return (
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col flex-1">
            <Card ref={setNodeRef} className={cn(
                "h-full flex flex-col transition-colors rounded-3xl",
                isOver ? 'bg-primary/10' : 'bg-muted/40',
                isOver && 'cursor-copy'
            )}>
                <CardHeader className={cn("p-3 border-b-4 select-none", titleColors[id] || 'border-gray-500')}>
                    <CardTitle className="text-base font-semibold capitalize flex justify-between items-center">
                        <span>{title}</span>
                        <span className="text-sm font-normal bg-primary/10 text-primary rounded-full h-6 w-6 flex items-center justify-center">{applicants.length}</span>
                    </CardTitle>
                </CardHeader>
                <div 
                    className={cn(
                        "p-2 flex-1 rounded-b-lg transition-colors min-h-[150px]"
                    )}
                >
                     {isLoading ? (
                        <div className="space-y-2">
                             <Skeleton className="h-20 w-full" />
                             <Skeleton className="h-20 w-full" />
                        </div>
                    ) : (
                        <SortableContext items={applicantIds} strategy={verticalListSortingStrategy}>
                            {children}
                        </SortableContext>
                    )}
                </div>
            </Card>
        </div>
    );
}

function Board({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-wrap justify-center gap-4 pb-4 items-stretch">
            {children}
        </div>
    );
}

Board.Column = Column;
Board.Card = ApplicantCard;

export { Board };
