
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
            <Card className={cn("hover:shadow-md transition-shadow duration-200 w-full relative group/item rounded-2xl flex justify-between")}>
                <div className="flex-1 py-2 pl-2 min-w-0">
                    <p className="text-xs font-medium truncate">{job.title}</p>
                </div>
                <div className="flex-shrink-0">
                    <ApplicantCounter jobId={job.id} layout="vertical" />
                </div>
            </Card>
        </Link>
    );
}

