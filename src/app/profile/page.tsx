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
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useFirestore, useUser, useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { uploadFile } from '@/ai/flows/upload-file-flow';
import { ACCEPTED_IMAGE_TYPES, ACCEPTED_RESUME_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { FileText, UploadCloud } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const profileSchema = z.object({
  displayName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }).max(50, { message: 'Display name cannot be longer than 50 characters.' }),
  address: z.string().min(1, 'Address is required.'),
  phone: z.string().min(1, 'Phone number is required.'),
  photo: z.custom<FileList>().optional()
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0].type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
  resume: z.custom<FileList>().optional()
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
        (files) => !files || files.length === 0 || ACCEPTED_RESUME_TYPES.includes(files[0].type),
        ".pdf, .doc, and .docx files are accepted."
    ),
});

// Helper function to convert a File to a Base64 data URI
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export default function ProfilePage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading, error } = useDoc(userProfileRef);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      address: '',
      phone: ''
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName || '',
        address: userProfile.address || '',
        phone: userProfile.phone || '',
      });
    }
  }, [userProfile, form]);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
        setImagePreview(null);
    }
  };
  
  const getFileName = (url: string) => {
    try {
      const decodedUrl = decodeURIComponent(url);
      const urlPath = new URL(decodedUrl).pathname;
      const parts = urlPath.split('/');
      return parts[parts.length - 1];
    } catch (error) {
      console.error("Could not parse file URL:", error);
      return "resume-file";
    }
  };


  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    setIsSubmitting(true);
    if (!auth.currentUser || !userProfileRef) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
      setIsSubmitting(false);
      return;
    }

    try {
      let photoURL = userProfile?.photoURL;
      const imageFile = values.photo?.[0];

      if (imageFile) {
        const fileDataUri = await toBase64(imageFile);
        const uploadResult = await uploadFile({
            fileDataUri,
            fileName: imageFile.name,
            path: `profile-pictures/${auth.currentUser.uid}`
        });
        photoURL = uploadResult.downloadUrl;
      }
      
      let resumeUrl = userProfile?.resumeUrl;
      const resumeFile = values.resume?.[0];
      if (resumeFile) {
         const fileDataUri = await toBase64(resumeFile);
         const uploadResult = await uploadFile({
             fileDataUri,
             fileName: resumeFile.name,
             path: `resumes/${auth.currentUser.uid}`
         });
         resumeUrl = uploadResult.downloadUrl;
      }

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: values.displayName,
        photoURL: photoURL,
      });

      // Update Firestore profile
      await updateDoc(userProfileRef, {
        displayName: values.displayName,
        address: values.address,
        phone: values.phone,
        photoURL: photoURL,
        resumeUrl: resumeUrl,
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });

      // Manually reset state after success
      setImagePreview(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (resumeInputref.current) resumeInputRef.current.value = '';
      form.resetField('photo');
      form.resetField('resume');

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'An error occurred while updating your profile.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading;
  const currentPhoto = imagePreview || userProfile?.photoURL;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Update your personal information and profile picture.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : user && userProfile ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={currentPhoto ?? ''} />
                        <AvatarFallback>{userProfile.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <FormField control={form.control} name="photo" render={({ field }) => (
                        <FormItem className="w-full">
                            <FormLabel>Update Picture</FormLabel>
                            <FormControl>
                              <div className="w-full">
                                <Label htmlFor="photo-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                        <p className="mb-1 text-sm text-muted-foreground">
                                          <span className="font-semibold">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG or WEBP (MAX. 5MB)</p>
                                    </div>
                                    <Input 
                                      id="photo-upload"
                                      type="file" 
                                      className="hidden"
                                      accept="image/*" 
                                      disabled={isSubmitting}
                                      ref={photoInputRef}
                                      onChange={(e) => {
                                          field.onChange(e.target.files);
                                          handleImageChange(e);
                                      }}
                                    />
                                </Label>
                              </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                  </div>

                  <FormField control={form.control} name="displayName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your public name" {...field} disabled={isSubmitting} required />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                   <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., #123 Street 456, Phnom Penh" {...field} disabled={isSubmitting} required/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 012 345 678" {...field} disabled={isSubmitting} required/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {userProfile.userType === 'standard' && (
                    <>
                      <Separator />
                      <FormField control={form.control} name="resume" render={({ field }) => (
                          <FormItem className="w-full">
                              <FormLabel>Resume</FormLabel>
                                {userProfile.resumeUrl && (
                                  <div className="flex items-center gap-3 p-2 rounded-md border bg-muted/50 mb-4">
                                      <FileText className="h-6 w-6 text-muted-foreground" />
                                      <a href={userProfile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline flex-1 truncate">
                                          {getFileName(userProfile.resumeUrl)}
                                      </a>
                                  </div>
                                )}
                              <FormControl>
                                <div>
                                  <Label htmlFor="resume-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors">
                                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                          <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                          <p className="mb-1 text-sm text-muted-foreground">
                                            <span className="font-semibold">{userProfile.resumeUrl ? 'Upload a new file' : 'Click to upload'}</span> or drag and drop
                                          </p>
                                          <p className="text-xs text-muted-foreground">PDF, DOC, or DOCX (MAX. 5MB)</p>
                                      </div>
                                      <Input 
                                        id="resume-upload"
                                        type="file" 
                                        className="hidden"
                                        accept=".pdf,.doc,.docx"
                                        disabled={isSubmitting}
                                        ref={resumeInputRef}
                                        onChange={(e) => field.onChange(e.target.files)}
                                      />
                                  </Label>
                                </div>
                              </FormControl>
                              <FormDescription>Upload your resume to apply for jobs faster.</FormDescription>
                              <FormMessage />
                          </FormItem>
                      )}/>
                    </>
                  )}


                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Form>
            ) : (
                <div className="text-center">
                    <p className="text-muted-foreground">{error ? `Error: ${error.message}` : "Could not load profile."}</p>
                </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
