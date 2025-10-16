
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Eye, CheckCircle, User, Users, MapPin, DollarSign } from 'lucide-react';
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

    const destinationUrl = `/jobs/${job.id}/details`;

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
            <div className={cn("py-2.5 px-6 flex items-center min-h-[84px]", hasApplied && "opacity-50")}>
                <div className="flex-1 min-w-0 pr-10">
                    <p className="font-semibold text-base leading-tight line-clamp-1">
                        {job.title}
                        <span className="font-normal text-muted-foreground"> at </span>
                        <Link href={`/companies/${encodeURIComponent(job.companyName)}`} className="hover:text-primary relative z-10" onClick={(e) => e.stopPropagation()}>
                            {job.companyName}
                        </Link>
                    </p>
                    <div className="flex items-center flex-wrap text-sm text-muted-foreground gap-x-3 gap-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 line-clamp-1"><MapPin className="h-4 w-4 flex-shrink-0" /> <span className="truncate">{job.location}</span></div>
                        {salaryDisplay && <div className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" /> {salaryDisplay}</div>}
                        <div className="flex items-center gap-1.5">
                            <Badge variant="secondary">{job.jobType}</Badge>
                            <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize">{job.status}</Badge>
                        </div>
                    </div>
                </div>

                <div className="absolute top-1 right-1.5 bottom-1 z-10 flex flex-col justify-between items-center py-1 pointer-events-none">
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
                                        <Link href={destinationUrl} onClick={(e) => e.stopPropagation()}><Eye className="h-4 w-4" /></Link>
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
