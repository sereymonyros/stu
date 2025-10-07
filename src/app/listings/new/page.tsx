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
import { useAuth, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { useEffect, useState } from 'react';
import { getAuth as getFirebaseAuth, onAuthStateChanged, User } from 'firebase/auth';
import Image from 'next/image';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const listingSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }),
  description: z.string().optional(),
  price: z.coerce.number().positive({ message: 'Price must be a positive number.' }),
  images: z.custom<FileList>()
    .refine((files) => files?.length > 0, "At least one image is required.")
    .refine((files) => files && Array.from(files).every((file) => file.size <= MAX_FILE_SIZE), `Max file size is 5MB.`)
    .refine(
      (files) => files && Array.from(files).every((file) => ACCEPTED_IMAGE_TYPES.includes(file.type)),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
});

export default function NewListingPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof listingSchema>>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
    },
  });

  useEffect(() => {
    const authInstance = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      if (!user) {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);
  
  const onSubmit = async (values: z.infer<typeof listingSchema>) => {
    setIsLoading(true);
    
    // CRITICAL FIX: Ensure user is available before proceeding.
    if (!auth.currentUser) {
        toast({
            variant: "destructive",
            title: "Not authenticated",
            description: "You must be logged in to post a listing. Please refresh and try again.",
        });
        setIsLoading(false);
        return;
    }
    const user = auth.currentUser;
    
    try {
      const storage = getStorage();
      const imageFiles = Array.from(values.images);
      
      const uploadPromises = imageFiles.map(file => {
          const storageRef = ref(storage, `${user.uid}/${Date.now()}-${file.name}`);
          return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
      });

      const imageUrls = await Promise.all(uploadPromises);

      const listingsCollection = collection(firestore, 'listings');
      await addDoc(listingsCollection, {
        title: values.title,
        description: values.description,
        price: values.price,
        sellerId: user.uid,
        createdAt: serverTimestamp(),
        imageUrls: imageUrls,
        status: 'available',
      });
      
      toast({
        title: "Listing created!",
        description: "Your item has been successfully listed.",
      });

      router.push(`/listings`);

    } catch (error: any) {
        console.error("Error creating listing:", error);
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: error.message || 'There was a problem creating your listing.',
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPreviews = Array.from(files).map(file => URL.createObjectURL(file));
      setImagePreviews(newPreviews);
    } else {
      setImagePreviews([]);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Post a New Item</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="What are you selling?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your item in detail..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                         <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                            <Input type="number" placeholder="0.00" className="pl-7" {...field} step="0.01" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Images</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          multiple 
                          accept="image/*"
                          onChange={(e) => {
                            field.onChange(e.target.files);
                            handleImageChange(e);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        You can upload multiple images. The first image will be the cover.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {imagePreviews.map((src, i) => (
                       <div key={i} className="relative aspect-square w-full">
                          <Image src={src} alt={`Preview ${i + 1}`} fill className="rounded-md object-cover" />
                       </div>
                    ))}
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Posting...' : 'Post Listing'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
