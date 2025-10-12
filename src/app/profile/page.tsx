

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
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ACCEPTED_IMAGE_TYPES, ACCEPTED_RESUME_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { FileText, Sparkles, UploadCloud } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Progress } from '@/components/ui/progress';
import { verifyHumanFace } from '@/ai/flows/verify-human-face-flow';

// Helper function to convert a File to a Base64 data URI
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

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


export default function ProfilePage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, error, refetch: refetchUserProfile } = useDoc(userProfileRef);

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
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImagePreview(null);
      setVerificationMessage(null);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // AI Verification
    setVerificationMessage('Verifying image...');
    setIsSubmitting(true);
    try {
      const dataUri = await toBase64(file);
      const { isHumanFace, reason } = await verifyHumanFace({ fileDataUri: dataUri });

      if (!isHumanFace) {
        toast({ variant: 'destructive', title: 'Invalid Profile Picture', description: reason });
        // Reject the upload by clearing the file input
        form.setValue('photo', undefined);
        setImagePreview(null);
        if (photoInputRef.current) photoInputRef.current.value = '';
        setVerificationMessage(reason);
      } else {
        setVerificationMessage('Image is a valid human face.');
        toast({ title: 'Image Verified', description: reason });
      }
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Verification Failed', description: err.message });
        setVerificationMessage('Could not verify image.');
    } finally {
        setIsSubmitting(false);
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

  const uploadFileWithProgress = (file: File, path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const storage = getStorage();
        const fileRef = storageRef(storage, path);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                setUploadProgress(null);
                reject(error);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                setUploadProgress(null);
                resolve(downloadURL);
            }
        );
    });
};


  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    setIsSubmitting(true);
    setVerificationMessage(null); // Clear verification message on submit

    if (!auth.currentUser || !userProfileRef) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
      setIsSubmitting(false);
      return;
    }

    try {
      let photoURL = userProfile?.photoURL;
      const imageFile = values.photo?.[0];

      if (imageFile) {
        setVerificationMessage('Verifying new image...');
        const dataUri = await toBase64(imageFile);
        const { isHumanFace, reason } = await verifyHumanFace({ fileDataUri: dataUri });
        if (!isHumanFace) {
          toast({ variant: 'destructive', title: 'Invalid Profile Picture', description: reason });
          setIsSubmitting(false);
          setVerificationMessage(reason);
          return;
        }
        setVerificationMessage('Uploading...');
        photoURL = await uploadFileWithProgress(imageFile, `profiles/${auth.currentUser.uid}/${imageFile.name}`);
      }
      
      let resumeUrl = userProfile?.resumeUrl;
      const resumeFile = values.resume?.[0];
      if (resumeFile) {
        resumeUrl = await uploadFileWithProgress(resumeFile, `resumes/${auth.currentUser.uid}/${resumeFile.name}`);
      }

      await updateProfile(auth.currentUser, {
        displayName: values.displayName,
        photoURL: photoURL,
      });

      const dataToUpdate: {[key: string]: any} = {
        displayName: values.displayName,
        address: values.address,
        phone: values.phone,
      };

      if (photoURL) {
        dataToUpdate.photoURL = photoURL;
      }
      if (resumeUrl) {
        dataToUpdate.resumeUrl = resumeUrl;
      }
      
      await updateDoc(userProfileRef, dataToUpdate).catch(serverError => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: userProfileRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
          })
        );
        throw serverError;
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });

      setImagePreview(null);
      setVerificationMessage(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (resumeInputRef.current) resumeInputRef.current.value = '';
      form.resetField('photo');
      form.resetField('resume');
      
      refetchUserProfile();

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'An error occurred while updating your profile.',
      });
    } finally {
        setIsSubmitting(false);
        setUploadProgress(null);
    }
  };

  const currentPhoto = imagePreview || userProfile?.photoURL;

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>A complete profile with a real photo is required to post or apply for jobs.</CardDescription>
          </CardHeader>
          <CardContent>
            {user && userProfile ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={currentPhoto ?? ''} />
                        <AvatarFallback>{userProfile.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <FormField control={form.control} name="photo" render={({ field }) => (
                        <FormItem className="w-full">
                            <FormLabel>Update Picture (Must be a human face)</FormLabel>
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
                            {verificationMessage && (
                                <FormDescription className="flex items-center gap-2 mt-2">
                                  <Sparkles className="h-4 w-4 text-yellow-500" /> {verificationMessage}
                                </FormDescription>
                            )}
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
                                {userProfile.resumeUrl && !form.getValues("resume")?.[0] && (
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
                  
                  {uploadProgress !== null && (
                    <div className="space-y-2">
                        <Label>{isSubmitting ? 'Uploading...' : 'Upload Complete'}</Label>
                        <Progress value={uploadProgress} />
                        <p className="text-sm text-muted-foreground text-center">{Math.round(uploadProgress)}%</p>
                    </div>
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
