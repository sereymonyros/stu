
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { User, Users } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

export function ApplicantCounter({ jobId, layout = 'horizontal' }: { jobId: string, layout?: 'horizontal' | 'vertical' }) {
    const firestore = useFirestore();
    const router = useRouter();

    const applicantsQuery = useMemo(() => {
        if (!firestore || !jobId) return null;
        return query(collection(firestore, 'jobs', jobId, 'applications'));
    }, [firestore, jobId]);

    const { data: applicants, isLoading } = useCollection(applicantsQuery);

    const handleBadgeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        router.push(`/jobs/${jobId}/applicants`);
    };

    if (isLoading) {
        if (layout === 'vertical') {
            return <Skeleton className="h-full w-8 rounded-r-2xl" />;
        }
        return <Skeleton className="h-6 w-6 rounded-full" />;
    }

    const applicantCount = applicants?.length ?? 0;

    const getBackgroundColor = () => {
        if (applicantCount === 0) return 'bg-red-500 text-white';
        if (applicantCount < 6) return 'bg-yellow-400 text-black';
        return 'bg-green-500 text-white';
    };

    if (layout === 'vertical') {
        return (
            <div
                onClick={handleBadgeClick}
                className={cn(
                    "flex items-center justify-center h-full w-8 text-black hover:bg-lime-600 cursor-pointer rounded-r-2xl",
                    getBackgroundColor()
                )}
            >
                <span className="font-bold text-xs">{applicantCount}</span>
            </div>
        )
    }
    
    // Default horizontal layout
    if (applicantCount === 0) {
        return null;
    }

    return (
        <Badge 
            onClick={handleBadgeClick}
            className={cn(
                "absolute top-2 right-1 flex items-center gap-1.5 z-10 px-2 py-1 rounded-full text-xs pointer-events-auto cursor-pointer",
                getBackgroundColor()
            )}
        >
            {applicantCount === 1 ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
            {applicantCount}
        </Badge>
    );
}
