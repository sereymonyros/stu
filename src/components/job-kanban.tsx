
'use client';

import * as React from "react"
import { useMemo } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Building, DollarSign, Edit, MapPin, Users, Heart, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import Link from 'next/link';
import { useUser } from '@/firebase';

function JobCard({ 
    job, 
    isFavourite, 
    onToggleFavourite, 
    hasApplied, 
    isRecruiter,
    isDraggable,
}: { 
    job: any; 
    isFavourite: boolean; 
    onToggleFavourite: (jobId: string, isCurrentlyFavourite: boolean) => void; 
    hasApplied: boolean; 
    isRecruiter: boolean;
    isDraggable: boolean;
}) {
    const { user } = useUser();
    const isOwner = user && user.uid === job.recruiterId;

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id: job.id,
        disabled: !isDraggable,
    });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        boxShadow: isDragging ? '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' : undefined,
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

    const cardContent = (
        <>
            <CardHeader className="p-3">
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-sm font-bold">{job.title}</CardTitle>
                    {user && !isOwner && !isRecruiter && (
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggleFavourite(job.id, isFavourite)}
                            className="text-muted-foreground hover:text-red-500 h-6 w-6"
                            disabled={hasApplied}
                        >
                            <Heart className={cn("h-4 w-4", isFavourite && "fill-red-500 text-red-500")} />
                        </Button>
                    )}
                     {isOwner && (
                        <Button asChild variant="ghost" size="icon" disabled={hasApplied} className="h-6 w-6">
                            <Link href={`/jobs/${job.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </div>
                <div className="flex flex-row flex-wrap items-center text-xs text-muted-foreground gap-x-2 gap-y-1 pt-1">
                    <div className="flex items-center gap-1.5">
                        <Building className="h-3 w-3" /> {job.companyName}
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
            <CardContent className="flex-grow p-3 pt-0">
                <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">{job.jobType}</Badge>
                    <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize text-[10px] px-1.5 py-0.5">{job.status}</Badge>
                </div>
            </CardContent>
            <CardFooter className="p-3 pt-0">
                 {hasApplied ? (
                    <Button disabled size="sm">Applied</Button>
                 ) : isRecruiter ? (
                     <Button asChild variant="outline" size="sm">
                        <Link href={`/jobs/${job.id}/edit`}>View</Link>
                    </Button>
                 ) : (
                    <Button asChild size="sm">
                        <Link href={`/jobs/${job.id}/apply`}>View & Apply</Link>
                    </Button>
                 )}
            </CardFooter>
        </>
    );
    
    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card 
                className={cn(
                    "flex flex-col h-full hover:shadow-lg transition-shadow duration-200",
                    isDraggable ? "mb-2 bg-card" : "",
                    hasApplied && "bg-muted/30 opacity-60 hover:shadow-none",
                    isDragging ? "cursor-grabbing" : isDraggable ? "cursor-grab" : ""
                )}
                {...(isDraggable ? listeners : {})}
            >
               {cardContent}
            </Card>
        </div>
    )
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
                "h-full transition-colors w-full", 
                isOver && id === 'Closed' ? 'bg-destructive/20' : 
                isOver ? 'bg-primary/10' : 
                'bg-muted/40'
            )}>
                <CardHeader className={cn("p-3 border-b-4", titleColors[id] || 'border-gray-500')}>
                    <CardTitle className="text-base font-semibold capitalize flex justify-between items-center">
                        <span>{title}</span>
                        <span className="text-sm font-normal bg-primary/10 text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center">{jobs.length}</span>
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
        <div className="flex-1 flex flex-row gap-4 pb-4 overflow-x-auto">
            {children}
        </div>
    );
}

Board.Column = Column;
Board.Card = JobCard;

export { Board };
