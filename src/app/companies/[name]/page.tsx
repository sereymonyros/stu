
'use client';

import { useMemo, Suspense, use, useState, useEffect } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Heart, Briefcase, Building, MapPin, DollarSign, Pencil, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { getCompanyByName } from '@/ai/flows/get-company-by-name-flow';
import type { GetCompanyByNameOutput } from '@/ai/flows/get-company-by-name-flow';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

// This is the same JobCard from the jobs page, slightly adapted.
function JobCard({ job }: { job: any }) {

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

    return (
        <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
                <CardTitle className="text-xl font-bold">{job.title}</CardTitle>
                <div className="flex flex-col text-sm text-muted-foreground gap-1 pt-1">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {job.location}</div>
                    {salaryDisplay && <div className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> {salaryDisplay}</div>}
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{job.jobType}</Badge>
                    <Badge variant={job.status === 'Sold' ? 'destructive' : 'default'} className="capitalize">{job.status}</Badge>
                </div>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href={`/jobs/${job.id}/apply`}>View & Apply</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

function CompanyProfile({ name: encodedName }: { name: string }) {
    const companyName = decodeURIComponent(encodedName);
    const firestore = useFirestore();
    const { toast } = useToast();

    const [company, setCompany] = useState<GetCompanyByNameOutput | null>(null);

    useEffect(() => {
      getCompanyByName({ companyName })
        .then(setCompany)
        .catch(err => {
            console.error("Failed to fetch company profile:", err);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load company information.' });
        })
    }, [companyName, toast]);

    // Fetch jobs for this company (this can remain client-side as it should be public)
    const jobsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'jobs'), where('companyName', '==', companyName));
    }, [firestore, companyName]);
    const { data: jobs } = useCollection(jobsQuery);

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
                <div className="mb-6">
                    <Button variant="ghost" size="sm" className="mb-4" asChild>
                        <Link href="/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Job Board</Link>
                    </Button>
                </div>

                {company && (
                     <Card className="mb-8">
                        <CardHeader className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                           <Image
                             src={company.logoUrl || `https://picsum.photos/seed/${companyName}/200`}
                             alt={`${company.name} logo`}
                             width={96}
                             height={96}
                             className="rounded-lg object-contain border p-1"
                           />
                           <div className="flex-1">
                                <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
                                {company.description && <p className="text-muted-foreground mt-2">{company.description}</p>}
                           </div>
                        </CardHeader>
                    </Card>
                )}

                 {!company && (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h2 className="mt-4 text-2xl font-semibold">Company Not Found</h2>
                        <p className="mt-2 text-muted-foreground">The profile for "{companyName}" could not be found.</p>
                    </div>
                 )}


                {jobs && jobs.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight mb-4">Current Openings</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {jobs.map(job => <JobCard key={job.id} job={job} />)}
                        </div>
                    </div>
                )}

                {jobs && jobs.length === 0 && company && (
                     <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h2 className="mt-4 text-xl font-semibold">No Current Openings</h2>
                        <p className="mt-2 text-muted-foreground">{companyName} has no job listings at the moment.</p>
                    </div>
                )}

            </main>
        </div>
    );
}

export default function CompanyPage({ params }: { params: Promise<{ name: string }> }) {
    const { name } = use(params);
    return (
        <Suspense fallback={
          <div className="space-y-8 container mx-auto p-4 md:p-6 lg:p-8">
            <Card>
                <CardHeader className="flex flex-col md:flex-row items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-lg" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-4/5" />
                    </div>
                </CardHeader>
            </Card>
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
        }>
            <CompanyProfile name={name} />
        </Suspense>
    )
}
