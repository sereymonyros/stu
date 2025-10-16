
'use client';

import * as React from "react"
import { useMemo } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { JobCardBig } from './job-card-big';

export function JobCard({
    job,
    isDraggable,
}: {
    job: any;
    isDraggable: boolean;
    // Add other props even if unused to match signature
    isFavourite: boolean;
    onToggleFavourite: (jobId: string, isCurrentlyFavourite: boolean) => Promise<void>;
    hasApplied: boolean;
    isRecruiter: boolean;
}) {
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
    
    return (
        <div ref={setNodeRef} style={style} {...attributes}>
             <div {...(isDraggable ? listeners : {})}>
                <JobCardBig
                    job={job}
                    isFavourite={false}
                    onToggleFavourite={async () => {}}
                    hasApplied={false}
                    isRecruiter={true}
                />
            </div>
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
