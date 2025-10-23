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

export function JobCardSmallMobile({
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
        <Link href={`/jobs/${job.id}/details`} className="block group/card">
            <Card className={cn("hover:shadow-md transition-shadow duration-200 w-full relative group/item rounded-3xl")}>
                 {hasApplied && (
                    <div className="absolute inset-0 bg-muted/80 backdrop-blur-sm z-20 flex items-center justify-center rounded-3xl pointer-events-none">
                        <Badge variant="secondary" className="text-base px-4 py-1 rounded-full bg-green-500/10 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-500/50">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Applied
                        </Badge>
                    </div>
                )}
                <div className="flex items-start py-4">
                    <div className="flex-1 min-w-0 pr-10 pl-4">
                        <p className="font-semibold text-sm leading-tight line-clamp-1">
                            <span className="hover:text-primary">{job.title}</span>
                            <span className="font-normal text-muted-foreground"> at </span>
                            <span className="hover:text-primary relative z-10" onClick={(e) => { e.preventDefault(); router.push(`/companies/${encodeURIComponent(job.companyName)}`)}}>
                                {job.companyName}
                            </span>
                        </p>
                        <div className="flex items-center flex-wrap text-xs text-muted-foreground gap-x-3 gap-y-1 min-w-0 mt-1">
                            <div className="flex items-center gap-1.5 line-clamp-1 hover:text-primary"><MapPin className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{job.location}</span></div>
                            {salaryDisplay && <div className="flex items-center gap-1.5 hover:text-primary"><DollarSign className="h-3 w-3" /> {salaryDisplay}</div>}
                            <div className="flex items-center gap-1.5">
                                <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">{job.jobType}</Badge>
                                <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize px-1.5 py-0.5 text-[10px]">{job.status}</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-0 right-1.5 bottom-0 z-20 flex flex-col justify-between items-center pointer-events-none">
                        <div className="pointer-events-auto">
                            {isOwner ? (
                                <ApplicantCounter jobId={job.id} />
                            ) : user && !isRecruiter ? (                                
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleFavouriteClick}
                                    className="h-9 w-9 rounded-full text-muted-foreground flex-shrink-0"
                                    aria-label="Toggle Favourite"
                                >
                                    <Heart className={cn("h-5 w-5", isFavourite && "fill-red-500 text-red-500")} />
                                </Button>
                            ) : null}
                        </div>

                        <div className="pointer-events-auto">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div tabIndex={-1} className='h-9 w-9 rounded-md inline-flex items-center justify-center'>
                                            <Eye className="h-4 w-4" />
                                        </div>
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
        </Link>
    );
}
