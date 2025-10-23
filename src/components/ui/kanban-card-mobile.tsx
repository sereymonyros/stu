
'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ApplicantCounter } from '../applicant-counter';

export function KanbanCardMobile({
    job
}: {
    job: any;
}) {
    return  (
        <div className="block group/card">
            <Card className={cn("hover:shadow-md transition-shadow duration-200 w-full relative group/item rounded-2xl flex justify-between")}>
                <div className="flex-1 py-2 pl-2 pr-4 min-w-0">
                    <p className="text-xs font-medium truncate">{job.title}</p>
                </div>
                <div className="flex-shrink-0">
                    <ApplicantCounter jobId={job.id} layout="vertical" />
                </div>
            </Card>
        </div>
    );
}
