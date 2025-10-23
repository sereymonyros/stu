
'use client';

import * as React from "react"
import { useMemo } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { JobCardSmall } from './job-card-small';
import { ApplicantCard } from "./applicant-card";
import { KanbanCardMobile } from "./ui/kanban-card-mobile";



function Column({ id, title, children, items, isLoading, type }: { id: string, title: string, children: React.ReactNode, items: any[], isLoading: boolean, type: 'jobs' | 'applicants' }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    const itemIds = useMemo(() => items.map(i => i.id), [items]);

    const titleColors: { [key: string]: string } = {
        Available: 'border-blue-500',
        Closed: 'border-red-500',
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
                isOver ? 'bg-primary/10 cursor-copy' : 'bg-muted/40',
            )}>
                <CardHeader className={cn("p-3 border-b-4 select-none", titleColors[id] || 'border-gray-500')}>
                    <CardTitle className="text-base font-semibold capitalize flex justify-between items-center">
                        <span>{title}</span>
                        <span className="text-sm font-normal bg-primary/10 text-primary rounded-full h-6 w-6 flex items-center justify-center">{items.length}</span>
                    </CardTitle>
                </CardHeader>
                <div 
                    className={cn(
                        "p-2 flex-1 rounded-b-lg transition-colors min-h-[100px]"
                    )}
                >
                     {isLoading ? (
                        <div className="space-y-2">
                             <Skeleton className="h-24 w-full" />
                             <Skeleton className="h-24 w-full" />
                        </div>
                    ) : (
                        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
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


const JobCard = ({
    job,
    isDraggable,
    isMobile,
}: {
    job: any;
    isDraggable: boolean;
    isFavourite: boolean;
    onToggleFavourite: (jobId: string, isCurrentlyFavourite: boolean) => Promise<void>;
    hasApplied: boolean;
    isRecruiter: boolean;
    isMobile: boolean;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: job.id,
        disabled: !isDraggable,
    });

    const style = {
        transition,
        boxShadow: isDragging ? '0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -4px rgb(0 0 0 / 0.1)' : undefined,
        transform: isDragging ? `${"\'\'" + CSS.Transform.toString(transform)} scale(1.05)` : CSS.Transform.toString(transform),
        zIndex: isDragging ? 10 : 'auto',
    };
    
    return (
        <div ref={setNodeRef} style={style} {...attributes} className="mb-2">
             <div {...(isDraggable ? listeners : {})} className={cn(isDragging ? "cursor-grabbing" : "cursor-grab")}>
                {
                    isMobile
                    ? <KanbanCardMobile
                        job={job}
                    /> : <JobCardSmall
                        job={job}
                        isFavourite={false}
                        onToggleFavourite={async () => {}}
                        hasApplied={false}
                        isRecruiter={true}
                        isDraggable={isDraggable}
                    />
                }
            </div>
        </div>
    );
}


Board.Column = Column;
Board.Card = ApplicantCard;
Board.JobCard = JobCard;

export { Board };
