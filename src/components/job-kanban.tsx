
'use client';

import * as React from "react"
import { useMemo } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, DollarSign, MapPin, Heart, Eye, CheckCircle, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import Link from 'next/link';
import { useUser, useCollection } from '@/firebase';
import { useFirestore } from '@/firebase';
import { collection, query } from "firebase/firestore";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { useRouter } from "next/navigation";

// A new component to securely fetch and display applicant count for a single job
function ApplicantCounter({ jobId }: { jobId: string }) {
    const firestore = useFirestore();
    const { user } = useUser();

    // Query for applicants of a specific job
    const applicantsQuery = useMemo(() => {
        if (!firestore || !jobId) return null;
        return query(collection(firestore, 'jobs', jobId, 'applications'));
    }, [firestore, jobId]);

    const { data: applicants, isLoading } = useCollection(applicantsQuery);

    if (isLoading || !applicants || applicants.length === 0) {
        return null;
    }

    const applicantCount = applicants.length;
    
    return (
         <Badge className="absolute top-2 right-2 flex items-center gap-1.5 z-10 px-2 py-1 rounded-full text-xs bg-lime-500 text-black">
            {applicantCount === 1 ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
            {applicantCount}
        </Badge>
    )
}


export function JobCard({ 
    job, 
    isFavourite, 
    onToggleFavourite, 
    hasApplied, 
    isRecruiter,
    isDraggable,
}: { 
    job: any; 
    isFavourite: boolean; 
    onToggleFavourite: (jobId: string, isCurrentlyFavourite: boolean) => Promise<void>; 
    hasApplied: boolean; 
    isRecruiter: boolean;
    isDraggable: boolean;
}) {
    const { user } = useUser();
    const router = useRouter();
    const isOwner = user && user.uid === job.recruiterId;

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id: job.id,
        disabled: !isDraggable,
    });
    
    const style = {
        transition,
        boxShadow: isDragging ? '0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -4px rgb(0 0 0 / 0.1)' : undefined,
        transform: isDragging ? `${CSS.Transform.toString(transform)} scale(1.05)` : CSS.Transform.toString(transform),
        zIndex: isDragging ? 10 : 'auto',
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    }

    const salaryDisplay = useMemo(() => {
        if (job.salaryMin && job.salaryMax) {
            return `${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax)}`;
        }
        if (job.salaryMin) {
            return `From ${formatCurrency(job.salaryMin)}`;
        }
        if (job.salaryMax) {
            return `Up to ${formatCurrency(job.salaryMax)}`;
        }
        return null;
    }, [job.salaryMin, job.salaryMax]);

    const destinationUrl = `/jobs/${job.id}/details`;

    const handleCompanyClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        router.push(`/companies/${encodeURIComponent(job.companyName)}`);
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
             <Card 
                className={cn(
                    "flex flex-col h-full transition-all duration-200 rounded-3xl group relative",
                    isDraggable ? "mb-2 bg-card" : "hover:scale-[1.02] hover:shadow-lg",
                    hasApplied && "bg-muted/50 hover:shadow-none hover:scale-100",
                    isDragging ? "cursor-grabbing" : isDraggable ? "cursor-grab" : ""
                )}
                {...(isDraggable ? listeners : {})}
            >
              {hasApplied && (
                <div className="absolute inset-0 bg-black/30 rounded-3xl z-10 flex items-center justify-center">
                    <Badge variant="secondary" className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4"/>
                        Applied
                    </Badge>
                </div>
              )}
               {isOwner && (
                   <ApplicantCounter jobId={job.id} />
                )}
              <div className={cn("flex flex-col flex-grow", hasApplied && "opacity-50")}>
                  <Link href={destinationUrl} className="flex flex-col flex-grow group-hover:no-underline">
                    <span className="absolute inset-0 z-0" />
                    <CardHeader className="p-3 pb-2">
                        <div className="flex justify-between items-start gap-2">
                            <CardTitle className="text-base font-bold select-none">{job.title}</CardTitle>
                            {user && !isOwner && !isRecruiter && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavourite(job.id, isFavourite); }}
                                    className="absolute top-1 right-1 text-muted-foreground hover:text-red-500 h-9 w-9 z-10"
                                    disabled={hasApplied}
                                >
                                    <Heart className={cn("h-5 w-5", isFavourite && "fill-red-500 text-red-500")} />
                                </Button>
                            )}
                        </div>
                        <div className="flex flex-row flex-wrap items-center text-xs text-muted-foreground gap-x-2 gap-y-1 pt-1">
                            <div className="flex items-center gap-1.5">
                                <Building className="h-3 w-3" /> 
                                <span onClick={handleCompanyClick} className="hover:text-primary relative z-10 cursor-pointer">
                                    {job.companyName}
                                </span>
                            </div>
                            <span className="text-muted-foreground/50">|</span>
                            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {job.location}</div>
                            {salaryDisplay && (
                                <>
                                    <span className="text-muted-foreground/50 hidden sm:inline">|</span>
                                    <div className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> {salaryDisplay}</div>
                                </>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow p-3 pt-0 flex flex-col justify-end">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">{job.jobType}</Badge>
                                <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize text-[10px] px-1.5 py-0.5">{job.status}</Badge>
                            </div>
                            <div className="relative z-10">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 absolute bottom-[-8px] right-[-8px] pointer-events-none">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>View Details</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    </CardContent>
                  </Link>
              </div>
            </Card>
        </div>
    );
}

function Column({ id, title, children, jobs, isLoading }: { id: string, title: string, children: React.ReactNode, jobs: any[], isLoading: boolean }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    const jobIds = useMemo(() => jobs.map(j => j.id), [jobs]);

    const titleColors: { [key: string]: string } = {
        Available: 'border-blue-500',
        Offering: 'border-purple-500',
        Closed: 'border-red-500',
    };

    return (
        <div ref={setNodeRef} className={cn("w-full sm:w-80 flex-shrink-0", isOver && 'cursor-copy')}>
            <Card className={cn(
                "h-full transition-colors w-full rounded-3xl", 
                isOver && id === 'Closed' ? 'bg-destructive/20' : 
                isOver ? 'bg-primary/10' : 
                'bg-muted/40'
            )}>
                <CardHeader className={cn("p-3 border-b-4", titleColors[id] || 'border-gray-500')}>
                    <CardTitle className="text-base font-semibold capitalize flex justify-between items-center">
                        <span>{title}</span>
                        <span className="text-sm font-normal bg-primary/10 text-primary rounded-full h-6 w-6 flex items-center justify-center">{jobs.length}</span>
                    </CardTitle>
                </CardHeader>
                <div className="p-2 min-h-[150px] md:min-h-[200px] overflow-y-auto">
                     {isLoading ? (
                        <div className="space-y-2">
                             <Skeleton className="h-24 w-full" />
                             <Skeleton className="h-24 w-full" />
                        </div>
                    ) : (
                        <SortableContext items={jobIds} strategy={verticalListSortingStrategy}>
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
        <div className="flex flex-wrap justify-center gap-4 pb-4">
            {children}
        </div>
    );
}

Board.Column = Column;
Board.Card = JobCard;

export { Board };
