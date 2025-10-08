
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useFirestore, useUser, useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const profileSchema = z.object({
  displayName: z.string().min(2, { message: 'Display name must be at least 2 characters.' }).max(50, { message: 'Display name cannot be longer than 50 characters.' }),
  photo: z.custom<FileList>().optional()
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0].type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
});

export default function ProfilePage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading, error } = useDoc(userProfileRef);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName || '',
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
        const storage = getStorage();
        const storageRef = ref(storage, `profile-pictures/${auth.currentUser.uid}/${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: values.displayName,
        photoURL: photoURL,
      });

      // Update Firestore profile
      await updateDoc(userProfileRef, {
        displayName: values.displayName,
        photoURL: photoURL,
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
      // Optionally, force a reload of the user data in the app
       router.refresh();

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'An error occurred while updating your profile.',
      });
    } finally {
      setIsSubmitting(false);
      setImagePreview(null);
      form.resetField('photo');
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
                    <div className="flex items-center space-x-6">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={currentPhoto ?? ''} />
                            <AvatarFallback>{userProfile.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <FormField control={form.control} name="photo" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Update Picture</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="file" 
                                        accept="image/*" 
                                        disabled={isSubmitting}
                                        onChange={(e) => {
                                            field.onChange(e.target.files);
                                            handleImageChange(e);
                                        }}
                                    />
                                </FormControl>
                                <FormDescription>Max 5MB. JPG, PNG, or WEBP.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                  <FormField control={form.control} name="displayName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your public name" {...field} disabled={isSubmitting}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

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
