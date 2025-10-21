
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useMemo, useState, use } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ArrowLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BackButton } from '@/components/back-button';

const jobSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  companyName: z.string().min(2, 'Company name is required.'),
  location: z.string().min(2, 'Location is required.'),
  jobType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']),
  status: z.enum(['Available', 'Closed']),
  description: z.string().optional(),
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
}).refine(data => {
    if (data.salaryMin && data.salaryMax) {
        return data.salaryMax >= data.salaryMin;
    }
    return true;
}, {
    message: "Maximum salary must be greater than or equal to minimum salary.",
    path: ["salaryMax"],
});

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finalJobId = Array.isArray(jobId) ? jobId[0] : jobId;

  const jobRef = useMemo(() => {
    if (!firestore || !finalJobId) return null;
    return doc(firestore, 'jobs', finalJobId);
  }, [firestore, finalJobId]);

  const { data: job } = useDoc(jobRef);

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
        title: '',
        companyName: '',
        location: '',
        jobType: 'Full-time',
        status: 'Available',
        description: '',
        salaryMin: '' as any,
        salaryMax: '' as any,
    },
  });

  useEffect(() => {
    if (job) {
      form.reset({
        title: job.title,
        companyName: job.companyName,
        location: job.location,
        jobType: job.jobType,
        status: job.status || 'Available',
        description: job.description,
        salaryMin: job.salaryMin || ('' as any),
        salaryMax: job.salaryMax || ('' as any),
      });
    }
  }, [job, form]);

  useEffect(() => {
    if (!job) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (job && user.uid !== job.recruiterId) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You are not the owner of this job posting.",
      });
      router.replace(`/jobs`);
    }
  }, [user, job, router, toast]);


  const onSubmit = (values: z.infer<typeof jobSchema>) => {
    setIsSubmitting(true);
    if (!jobRef) {
        setIsSubmitting(false);
        return;
    }

    const dataToUpdate = {
      ...values,
      salaryMin: values.salaryMin || null,
      salaryMax: values.salaryMax || null,
      updatedAt: serverTimestamp(),
    };

    updateDoc(jobRef, dataToUpdate)
      .catch(serverError => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: jobRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
          })
        );
      });

    toast({
      title: "Job updated!",
      description: "Your job posting has been successfully updated.",
    });

    router.push(`/jobs`);
  };

  return (
    <div className="flex flex-col  ">
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        {job ? (
            <Card className="max-w-2xl mx-auto rounded-3xl">
            <CardHeader>
                <div className="mb-4 -ml-2">
                    <BackButton />
                </div>
                <CardTitle>Edit Job Posting</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input placeholder="e.g., Software Engineer" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="e.g., Acme Inc." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g., Phnom Penh, Cambodia" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="jobType" render={({ field }) => (
                    <FormItem><FormLabel>Job Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select employment type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Full-time">Full-time</SelectItem><SelectItem value="Part-time">Part-time</SelectItem><SelectItem value="Contract">Contract</SelectItem><SelectItem value="Internship">Internship</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select job status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Available">Available</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="salaryMin" render={({ field }) => (
                        <FormItem><FormLabel>Minimum Salary (Optional)</FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="salaryMax" render={({ field }) => (
                        <FormItem><FormLabel>Maximum Salary (Optional)</FormLabel><FormControl><Input type="number" placeholder="e.g., 70000" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                  </div>
                  <FormDescription>Enter salary as annual numbers (e.g., 60000 for $60,000/year).</FormDescription>

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Job Description</FormLabel><FormControl><Textarea placeholder="Describe the role, responsibilities, and requirements..." className="min-h-[150px]" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                  </Button>
                </form>
                </Form>
            </CardContent>
            </Card>
        ) : (
            <div className="text-center py-20">
                <h2 className="text-2xl font-semibold">Job not found</h2>
                <p className="text-muted-foreground mt-2">This job posting may have been removed or the link is incorrect.</p>
                <Button asChild className="mt-6"><Link href="/jobs">Back to Jobs</Link></Button>
            </div>
        )}
      </main>
    </div>
  );
}
