'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ApplicantCounter } from '../applicant-counter';

export function KanbanCardMobile({
    job
}: {
    job: any;
}) {
    return  (
        <Link href={`/jobs/${job.id}/details`} className="block group/card">
            <Card className={cn("hover:shadow-md transition-shadow duration-200 w-full relative group/item rounded-3xl")}>
                <div className="flex items-start p-2">
                    <div className="flex justify-between items-center gap-1">
                        <p className="text-xs">{job.title}</p>
                        <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize px-1.5 py-0.5 text-[8px]">{job.status}</Badge>
                    </div>
                    <div className="pointer-events-auto">
                            <ApplicantCounter jobId={job.id} />
                    </div>
                </div>
            </Card>
        </Link>
    );
}
