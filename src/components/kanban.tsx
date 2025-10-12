

'use client';

import { useMemo, useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { analyzeApplicant } from '@/ai/flows/analyze-applicant-flow';
import type { AnalyzeApplicantOutput } from '@/ai/flows/analyze-applicant-schema';
import { useToast } from '@/hooks/use-toast';
import type { Timestamp } from 'firebase/firestore';

// Helper function to convert a file URL to a Base64 data URI
const urlToDataUri = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

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
        <Card className="bg-muted/50 p-4 my-2">
            <CardHeader className="p-2">
                <CardTitle className="text-lg flex items-center justify-between">
                    <span>AI Analysis</span>
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Match Score:</span>
                        <Progress value={analysis.matchScore} className="w-24 h-2" />
                        <span className="text-sm font-bold">{analysis.matchScore}%</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-4">
                <div>
                    <h4 className="font-semibold text-sm mb-2">Summary</h4>
                    <p className="text-xs text-muted-foreground">{analysis.summary}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-green-500" /> Strengths</h4>
                        <ul className="list-disc pl-5 text-xs space-y-1 text-muted-foreground">
                            {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-red-500" /> Gaps</h4>
                        <ul className="list-disc pl-5 text-xs space-y-1 text-muted-foreground">
                             {analysis.gaps.map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ApplicantCard({ applicant, jobDetails }: { applicant: any, jobDetails: any }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: applicant.id });
    const { toast } = useToast();
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        boxShadow: isDragging ? '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' : undefined,
        zIndex: isDragging ? 10 : 'auto',
    };
    
    const [isAnalysisVisible, setIsAnalysisVisible] = useState(false);
    const [analysis, setAnalysis] = useState<AnalyzeApplicantOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const handleGetAIAnalysis = async () => {
        // If analysis is already available, just show it.
        if (analysis || analysisError) {
            setIsAnalysisVisible(true);
            return;
        }

        if (!jobDetails || !applicant.resumeUrl) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Cannot perform analysis without a job description and a resume.'});
            return;
        }
        
        setIsAnalysisVisible(true);
        setIsAnalyzing(true);
        setAnalysisError(null);

        try {
            const resumeDataUri = await urlToDataUri(applicant.resumeUrl);
            const result = await analyzeApplicant({
                jobTitle: jobDetails.title,
                jobDescription: jobDetails.description || '',
                resumeDataUri: resumeDataUri,
            });
            setAnalysis(result);
        } catch (error: any) {
            console.error("AI Analysis Failed:", error);
            const friendlyError = error.message || 'An unknown error occurred during analysis.';
            setAnalysisError(friendlyError);
            toast({ variant: 'destructive', title: 'Analysis Failed', description: friendlyError });
        } finally {
            setIsAnalyzing(false);
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
            <Card className={cn("mb-2 bg-card hover:bg-muted/50", isDragging ? "cursor-grabbing" : "cursor-grab")}>
                <CardContent className="p-3" {...listeners}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                             <Avatar className="h-9 w-9">
                                <AvatarImage src={applicant.applicantPhotoURL} />
                                <AvatarFallback>{applicant.applicantName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm leading-tight">{applicant.applicantName}</p>
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
                     {isAnalysisVisible ? (
                        <div>
                             <Button variant="ghost" size="sm" onClick={() => setIsAnalysisVisible(false)} className="w-full justify-center mt-2 text-xs">
                                <X className="mr-2 h-3 w-3" /> Hide Analysis
                            </Button>
                            <AIAnalysisDisplay analysis={isAnalyzing ? null : analysis} error={analysisError} />
                        </div>
                    ) : (
                        <Button variant="outline" size="sm" onClick={handleGetAIAnalysis} disabled={isAnalyzing} className="w-full mt-2 text-xs">
                             {isAnalyzing ? (
                                <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full mr-2" />
                            ) : (
                                <Sparkles className="mr-2 h-3 w-3 text-yellow-500" />
                            )}
                            AI Review
                        </Button>
                    )}
                </CardContent>
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
        <div ref={setNodeRef} className={cn("w-72 flex-shrink-0", isOver && 'cursor-copy')}>
            <Card className={cn("h-full transition-colors", isOver ? 'bg-primary/10' : 'bg-muted/40')}>
                <CardHeader className={cn("p-3 border-b-4", titleColors[id] || 'border-gray-500')}>
                    <CardTitle className="text-base font-semibold capitalize flex justify-between items-center">
                        <span>{title}</span>
                        <span className="text-sm font-normal bg-primary/10 text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center">{applicants.length}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2 min-h-[200px] overflow-y-auto">
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
                </CardContent>
            </Card>
        </div>
    );
}

function Board({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex-1 flex gap-4 pb-4">
            {children}
        </div>
    );
}

Board.Column = Column;
Board.Card = ApplicantCard;

export { Board };
