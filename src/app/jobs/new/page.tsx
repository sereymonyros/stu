
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { BackButton } from '@/components/back-button';
<<<<<<< HEAD
import { putJob } from '@/lib/db';
=======
import { putJobs } from '@/lib/db';
>>>>>>> 1d14c9b6fcb72b301a533835edc3d43a6266207c

const jobSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  companyName: z.string().min(2, 'Company name is required.'),
  location: z.string().min(2, 'Location is required.'),
  jobType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']),
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


export default function NewJobPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc(userProfileRef);

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      companyName: '',
      location: '',
      jobType: 'Full-time',
      description: '',
      salaryMin: '' as any,
      salaryMax: '' as any,
    },
  });

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (userProfile && userProfile.userType !== 'recruiter') {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be a recruiter to post jobs." });
      router.replace('/jobs');
    }
  }, [user, userProfile, router, toast]);

  const onSubmit = async (values: z.infer<typeof jobSchema>) => {
    setIsSubmitting(true);
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      setIsSubmitting(false);
      return;
    }
     if (!userProfile?.photoURL) {
      toast({ variant: 'destructive', title: 'Profile Incomplete', description: 'Please upload a profile picture before posting a job.' });
      setIsSubmitting(false);
      return;
    }

    const jobData = {
      ...values,
      salaryMin: values.salaryMin || null,
      salaryMax: values.salaryMax || null,
      recruiterId: user.uid,
      recruiterDisplayName: userProfile.displayName,
      createdAt: serverTimestamp(),
      status: 'Available',
    };

    const jobsCol = collection(firestore, 'jobs');
<<<<<<< HEAD
    
    try {
        const docRef = await addDoc(jobsCol, jobData);
        // After successfully adding to Firestore, add to IndexedDB
        // We create a client-side version of the job object with the new ID
        const newJobForCache = {
            ...jobData,
            id: docRef.id,
            createdAt: new Date(), // Use current date for immediate sorting
        };
        await putJob(newJobForCache);

        router.push('/jobs');
    } catch (serverError: any) {
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
            path: jobsCol.path,
            operation: 'create',
            requestResourceData: jobData,
            })
        );
        setIsSubmitting(false);
=======
    try {
        const docRef = await addDoc(jobsCol, jobData);
        
        // After successful Firestore write, update IndexedDB
        // We use a client-side version of the object for the cache.
        const jobForCache = {
            ...jobData,
            id: docRef.id,
            createdAt: new Date(), // Use current date for cache
        };
        await putJobs([jobForCache]);

        router.push('/jobs');
    } catch (serverError) {
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: jobsCol.path,
                operation: 'create',
                requestResourceData: jobData,
            })
        );
>>>>>>> 1d14c9b6fcb72b301a533835edc3d43a6266207c
    }
  };

  const isAuthorized = userProfile?.userType === 'recruiter';
  const profileComplete = isAuthorized && !!userProfile?.photoURL;

  return (
    <div className="flex flex-col  ">
      <main className="flex-1 p-4 md:p-6 lg:p-8 mb-16">
        {isAuthorized ? (
            <Card className="max-w-2xl mx-auto rounded-3xl">
            <CardHeader>
                <div className="mb-4 -ml-2">
                    <BackButton />
                </div>
                <CardTitle>Post a New Job</CardTitle>
                 {!profileComplete && (
                  <CardDescription>
                      You must upload a profile picture before you can post a job.
                  </CardDescription>
                 )}
            </CardHeader>
            <CardContent>
                 {!profileComplete && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTitle>Profile Picture Required</AlertTitle>
                        <AlertDescription>
                            Please go to your <Link href="/profile" className="font-bold underline">Profile Page</Link> to upload a profile picture.
                        </AlertDescription>
                    </Alert>
                 )}
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <fieldset disabled={!profileComplete || isSubmitting}>
                        <div className="space-y-6">
                            <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input placeholder="e.g., Software Engineer" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="companyName" render={({ field }) => (
                                    <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="e.g., Acme Inc." {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="location" render={({ field }) => (
                                    <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g., Phnom Penh, Cambodia" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="jobType" render={({ field }) => (
                            <FormItem><FormLabel>Job Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select employment type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Full-time">Full-time</SelectItem><SelectItem value="Part-time">Part-time</SelectItem><SelectItem value="Contract">Contract</SelectItem><SelectItem value="Internship">Internship</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )} />

                            <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="salaryMin" render={({ field }) => (
                                <FormItem><FormLabel>Min Salary (Optional)</FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="salaryMax" render={({ field }) => (
                                <FormItem><FormLabel>Max Salary (Optional)</FormLabel><FormControl><Input type="number" placeholder="e.g., 70000" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            </div>

                            <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Job Description</FormLabel><FormControl><Textarea placeholder="Describe the role, responsibilities, and requirements..." className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </fieldset>
                    <Button type="submit" disabled={isSubmitting || !profileComplete} className="w-full">
                        {isSubmitting ? 'Posting Job...' : 'Post Job'}
                    </Button>
                </form>
                </Form>
            </CardContent>
            </Card>
        ): null}
      </main>
    </div>
  );
}
