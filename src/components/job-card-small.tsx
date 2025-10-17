
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Eye, CheckCircle, MapPin, DollarSign, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { ApplicantCounter } from './applicant-counter';

export function JobCardSmall({
    job,
    isFavourite,
    onToggleFavourite,
    hasApplied,
    isRecruiter
}: {
    job: any;
    isFavourite: boolean;
    onToggleFavourite: (jobId: string, isCurrentlyFavourite: boolean) => Promise<void>;
    hasApplied: boolean;
    isRecruiter: boolean;
}) {
    const { user } = useUser();
    const router = useRouter();
    const isOwner = user && user.uid === job.recruiterId;

    const destinationUrl = isOwner ? `/jobs/${job.id}/applicants` : `/jobs/${job.id}/details`;

    const salaryDisplay = useMemo(() => {
        if (job.salaryMin && job.salaryMax) {
            return `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`;
        }
        if (job.salaryMin) {
            return `From $${job.salaryMin.toLocaleString()}`;
        }
        if (job.salaryMax) {
            return `Up to $${job.salaryMax.toLocaleString()}`;
        }
        return null;
    }, [job.salaryMin, job.salaryMax]);

    const handleFavouriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!user) {
            router.push('/login');
            return;
        }
        onToggleFavourite(job.id, isFavourite);
    };

    return (
        <Card className={cn("hover:shadow-md transition-shadow duration-200 w-full relative group/item rounded-3xl", hasApplied && "bg-muted/50")}>
            <Link href={destinationUrl} className="block absolute inset-0 z-0">
                <span className="sr-only">View job: {job.title}</span>
            </Link>
            {hasApplied && (
                <div className="absolute inset-0 bg-black/30 rounded-3xl z-10 flex items-center justify-center">
                    <Badge variant="secondary" className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Applied
                    </Badge>
                </div>
            )}
            <div className={cn("p-4 flex items-start py-4", hasApplied && "opacity-50")}>
                <div className="flex-1 min-w-0 pr-10">
                    <p className="font-semibold text-sm leading-tight line-clamp-1">
                        {job.title}
                        <span className="font-normal text-muted-foreground"> at </span>
                        <Link href={`/companies/${encodeURIComponent(job.companyName)}`} className="hover:text-primary relative z-10" onClick={(e) => e.stopPropagation()}>
                            {job.companyName}
                        </Link>
                    </p>
                    <div className="flex items-center flex-wrap text-xs text-muted-foreground gap-x-3 gap-y-1 min-w-0 mt-1">
                        <div className="flex items-center gap-1.5 line-clamp-1"><MapPin className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{job.location}</span></div>
                        {salaryDisplay && <div className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> {salaryDisplay}</div>}
                        <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">{job.jobType}</Badge>
                            <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize px-1.5 py-0.5 text-[10px]">{job.status}</Badge>
                        </div>
                    </div>
                </div>

                <div className="absolute top-0 right-1.5 bottom-0 z-10 flex flex-col justify-between items-center pointer-events-none">
                     <div className="pointer-events-auto">
                        {isOwner ? (
                            <ApplicantCounter jobId={job.id} />
                        ) : user && !isRecruiter ? (
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleFavouriteClick}
                                            className="h-9 w-9 rounded-full text-muted-foreground flex-shrink-0"
                                            disabled={hasApplied}
                                            aria-label="Toggle Favourite"
                                        >
                                            <Heart className={cn("h-5 w-5", isFavourite && "fill-red-500 text-red-500")} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{isFavourite ? 'Remove from Favourites' : 'Add to Favourites'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : null}
                    </div>

                    <div className="pointer-events-auto">
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="ghost" size="icon" className="h-9 w-9">
                                        <Link href={`/jobs/${job.id}/details`} onClick={(e) => e.stopPropagation()}>
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>View Details</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </div>
        </Card>
    );
}
