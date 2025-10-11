
'use client';

import { useMemo } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Building, DollarSign, Edit, MapPin, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import Link from 'next/link';

function JobCard({ job }: { job: any }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: job.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
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

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className="mb-2 bg-card hover:bg-muted/50" >
                <CardContent className="p-3" {...listeners}>
                    <div className="flex items-start justify-between">
                         <p className="font-semibold text-sm leading-tight">{job.title}</p>
                         <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/jobs/${job.id}/edit`}>
                                <Edit className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                    <div className="flex flex-col text-xs text-muted-foreground gap-1 pt-1">
                        <div className="flex items-center gap-2"><Building className="h-3 w-3" /> {job.companyName}</div>
                        <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {job.location}</div>
                        {salaryDisplay && <div className="flex items-center gap-2"><DollarSign className="h-3 w-3" /> {salaryDisplay}</div>}
                    </div>
                     <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">{job.jobType}</Badge>
                    </div>
                     <Button variant="outline" size="sm" asChild className="w-full mt-3 text-xs">
                        <Link href={`/jobs/${job.id}/applicants`}><Users className="mr-2 h-3 w-3" /> View Applicants</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

function Column({ id, title, children, jobs, isLoading }: { id: string, title: string, children: React.ReactNode, jobs: any[], isLoading: boolean }) {
    const { setNodeRef } = useDroppable({ id });
    const jobIds = useMemo(() => jobs.map(j => j.id), [jobs]);

    const titleColors: { [key: string]: string } = {
        Available: 'border-blue-500',
        Offering: 'border-purple-500',
        Closed: 'border-red-500',
    };

    return (
        <div ref={setNodeRef} className="w-72 flex-shrink-0">
            <Card className="bg-muted/40 h-full">
                <CardHeader className={cn("p-3 border-b-4", titleColors[id] || 'border-gray-500')}>
                    <CardTitle className="text-base font-semibold capitalize flex justify-between items-center">
                        <span>{title}</span>
                        <span className="text-sm font-normal bg-primary/10 text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center">{jobs.length}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2 min-h-[200px] overflow-y-auto">
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
Board.Card = JobCard;

export { Board };
