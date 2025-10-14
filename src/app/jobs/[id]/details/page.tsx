
'use client';

import { useMemo, Suspense, use } from 'react';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building, MapPin, DollarSign, Briefcase, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

function JobDetailsProfile({ jobId }: { jobId: string }) {
    const firestore = useFirestore();

    const jobRef = useMemo(() => {
        if (!firestore) return null;
        return doc(firestore, 'jobs', jobId);
    }, [firestore, jobId]);

    const { data: job, isLoading } = useDoc(jobRef);
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    };
    
    const salaryDisplay = useMemo(() => {
        if (!job) return null;
        if (job.salaryMin && job.salaryMax) {
            return `${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax)}`;
        }
        if (job.salaryMin) {
            return `From ${formatCurrency(job.salaryMin)}`;
        }
        if (job.salaryMax) {
            return `Up to ${formatCurrency(job.salaryMax)}`;
        }
        return "Not disclosed";
    }, [job]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2 pt-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-semibold">Job not found</h2>
                <p className="text-muted-foreground mt-2">This job listing may have been removed.</p>
            </div>
        );
    }
    
    return (
        <Card className="w-full max-w-3xl mx-auto rounded-3xl">
            <CardHeader>
                <Button variant="ghost" size="sm" className="mb-4 w-fit -ml-2" asChild>
                    <Link href="/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs</Link>
                </Button>
                <CardTitle className="text-3xl font-bold">{job.title}</CardTitle>
                <CardDescription className="text-lg">
                    at <Link href={`/companies/${encodeURIComponent(job.companyName)}`} className="font-semibold text-primary hover:underline">{job.companyName}</Link>
                </CardDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="capitalize">{job.jobType}</Badge>
                    <Badge variant={job.status === 'Closed' ? 'destructive' : 'default'} className="capitalize">{job.status}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/> {job.location}</div>
                    <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground"/> {salaryDisplay}</div>
                    <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground"/> Posted by {job.recruiterDisplayName}</div>
                    {job.createdAt?.toDate && <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground"/> {job.createdAt.toDate().toLocaleDateString()}</div>}
                </div>
                <Separator />
                <div>
                    <h3 className="text-xl font-semibold mb-2">Job Description</h3>
                    <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                        <p>{job.description || "No description provided."}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <Suspense fallback={<Skeleton className="h-96 w-full max-w-3xl mx-auto rounded-3xl" />}>
                    <JobDetailsProfile jobId={id} />
                </Suspense>
            </main>
        </div>
    );
}