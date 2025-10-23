
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
            <Card className={cn("hover:shadow-md transition-shadow duration-200 w-full relative group/item rounded-2xl")}>
                <div className="flex items-center justify-between p-2 space-x-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{job.title}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center space-x-2">
                        <div className="pointer-events-auto">
                            <ApplicantCounter jobId={job.id} />
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    );
}
