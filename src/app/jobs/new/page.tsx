
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
import { Header } from '@/components/header';
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
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

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
    if (isUserLoading || isProfileLoading) {
      return;
    }
    if (!user) {
      router.replace('/login');
      return;
    }
    if (userProfile && userProfile.userType !== 'recruiter') {
      toast({ variant: "destructive", title: "Unauthorized", description: "You must be a recruiter to post jobs." });
      router.replace('/jobs');
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router, toast]);

  const onSubmit = (values: z.infer<typeof jobSchema>) => {
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
    addDoc(jobsCol, jobData).catch(serverError => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: jobsCol.path,
          operation: 'create',
          requestResourceData: jobData,
        })
      );
    });

    toast({ title: 'Job posted successfully!' });
    router.push('/jobs');
  };

  if (isUserLoading || isProfileLoading) {
    return (
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Post a New Job</CardTitle>
                 <CardDescription>
                    Fill in the details to find the perfect candidate.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-muted rounded-md" />
                        <div className="h-10 w-full bg-muted rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-muted rounded-md" />
                        <div className="h-10 w-full bg-muted rounded-md" />
                    </div>
                    <div className="h-10 w-full bg-muted rounded-md" />
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
    )
  }

  const isAuthorized = userProfile?.userType === 'recruiter';
  const profileComplete = isAuthorized && !!userProfile?.photoURL;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        {isAuthorized ? (
            <Card className="max-w-2xl mx-auto">
            <CardHeader>
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
                            <FormField control={form.control} name="companyName" render={({ field }) => (
                            <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="e.g., Acme Inc." {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="location" render={({ field }) => (
                            <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g., Phnom Penh, Cambodia" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="jobType" render={({ field }) => (
                            <FormItem><FormLabel>Job Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select employment type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Full-time">Full-time</SelectItem><SelectItem value="Part-time">Part-time</SelectItem><SelectItem value="Contract">Contract</SelectItem><SelectItem value="Internship">Internship</SelectItem></SelectContent></Select><FormMessage /></FormItem>
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
