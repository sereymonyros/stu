
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, DollarSign, MapPin, Heart, Eye, CheckCircle, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { useRouter } from "next/navigation";
import { ApplicantCounter } from './applicant-counter';

export function JobCardBig({
    job,
    isFavourite,
    onToggleFavourite,
    hasApplied,
    isRecruiter,
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

    const destinationUrl = `/jobs/${job.id}/details`;

    const handleCompanyClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        router.push(`/companies/${encodeURIComponent(job.companyName)}`);
    };

    return (
        <Card className={cn(
            "flex flex-col h-full transition-all duration-200 rounded-3xl group relative hover:scale-[1.02] hover:shadow-lg",
            hasApplied && "bg-muted/50 hover:shadow-none hover:scale-100",
        )}>
            {hasApplied && (
                <div className="absolute inset-0 bg-black/30 rounded-3xl z-10 flex items-center justify-center">
                    <Badge variant="secondary" className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Applied
                    </Badge>
                </div>
            )}
            
            <div className={cn("flex flex-col flex-grow", hasApplied && "opacity-50")}>
                <Link href={destinationUrl} className="flex flex-col flex-grow group-hover:no-underline">
                    <span className="absolute inset-0 z-0" />
                    <CardHeader className="p-3 pb-2">
                        <div className="flex justify-between items-start gap-2">
                            <CardTitle className="text-base font-bold select-none pr-10">{job.title}</CardTitle>
                        </div>
                        <div className="flex flex-row flex-wrap items-center text-xs text-muted-foreground gap-x-2 gap-y-1 pt-1">
                            <div className="flex items-center gap-1.5">
                                <Building className="h-3 w-3" />
                                <span onClick={handleCompanyClick} className="hover:text-primary relative z-10 cursor-pointer">
                                    {job.companyName}
                                </span>
                            </div>
                            <span className="text-muted-foreground/50">|</span>
                            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {job.location}</div>
                            {salaryDisplay && (
                                <>
                                    <span className="text-muted-foreground/50 hidden sm:inline">|</span>
                                    <div className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> {salaryDisplay}</div>
                                </>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow p-3 pt-0 flex flex-col justify-end">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">{job.jobType}</Badge>
                                <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize text-[10px] px-1.5 py-0.5">{job.status}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Link>
            </div>
            {/* --- Icon Container --- */}
            <div className="absolute top-1 right-1 bottom-1 flex flex-col justify-between items-end p-1 z-10 pointer-events-none">
                 {/* --- Top-Right Slot --- */}
                 <div className="pointer-events-auto">
                    {isOwner ? (
                        <ApplicantCounter jobId={job.id} />
                    ) : (
                         user && !isRecruiter && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavourite(job.id, isFavourite); }}
                                className="text-muted-foreground hover:text-red-500 h-9 w-9"
                                disabled={hasApplied}
                            >
                                <Heart className={cn("h-5 w-5", isFavourite && "fill-red-500 text-red-500")} />
                            </Button>
                        )
                    )}
                 </div>
                 {/* --- Bottom-Right Slot --- */}
                 <div className="pointer-events-auto">
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                                     <Link href={destinationUrl} onClick={(e) => e.stopPropagation()}>
                                         <Eye className="h-4 w-4" />
                                     </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>View Details</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                 </div>
            </div>
        </Card>
    );
}
