
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
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-xl font-bold">{job.title}</CardTitle>
                    {user && !isOwner && !isRecruiter && (
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggleFavourite(job.id, isFavourite)}
                            className="text-muted-foreground hover:text-red-500"
                            disabled={hasApplied}
                        >
                            <Heart className={cn("h-6 w-6", isFavourite && "fill-red-500 text-red-500")} />
                        </Button>
                    )}
                     {isOwner && (
                        <Button asChild variant="ghost" size="icon" disabled={hasApplied}>
                            <Link href={`/jobs/${job.id}/edit`}>
                                <Pencil className="h-5 w-5" />
                            </Link>
                        </Button>
                    )}
                </div>
                <div className="flex flex-col text-sm text-muted-foreground gap-1 pt-1">
                    <Link href={`/companies/${encodeURIComponent(job.companyName)}`} className="flex items-center gap-2 hover:underline">
                        <Building className="h-4 w-4" /> {job.companyName}
                    </Link>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {job.location}</div>
                    {salaryDisplay && <div className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> {salaryDisplay}</div>}
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{job.jobType}</Badge>
                    <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize">{job.status}</Badge>
                </div>
            </CardContent>
            <CardFooter>
                 {hasApplied ? (
                    <Button className="w-full" disabled>Applied</Button>
                 ) : isRecruiter ? (
                     <Button asChild variant="outline" className="w-full">
                        <Link href={`/jobs/${job.id}/edit`}>View</Link>
                    </Button>
                 ) : (
                    <Button asChild className="w-full">
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

function Column({ id, title, children, isLoading }: { id: string, title: string, children: React.ReactNode, isLoading: boolean }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    const jobs = React.Children.toArray(children);


    const titleColors: { [key: string]: string } = {
        Available: 'border-blue-500',
        Offering: 'border-purple-500',
        Closed: 'border-red-500',
    };

    return (
        <div className="w-72 flex-shrink-0">
            <Card ref={setNodeRef} className={cn(
                "h-full transition-colors", 
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
                <div className="p-2 min-h-[200px] overflow-y-auto">
                     {isLoading ? (
                        <div className="space-y-2">
                             <Skeleton className="h-24 w-full" />
                             <Skeleton className="h-24 w-full" />
                        </div>
                    ) : (
                        <SortableContext items={jobs.map((c: any) => c.props.job.id)} strategy={verticalListSortingStrategy}>
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
        <div className="flex-1 flex gap-4 pb-4">
            {children}
        </div>
    );
}

Board.Column = Column;
Board.Card = JobCard;

export { Board };
