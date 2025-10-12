
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
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { useEffect, useState } from 'react';
import { getAuth as getFirebaseAuth, onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import { uploadFile } from '@/ai/flows/upload-file-flow';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { UploadCloud } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const listingSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }),
  description: z.string().optional(),
  price: z.coerce.number().positive({ message: 'Price must be a positive number.' }),
  images: z.custom<FileList>()
    .refine((files) => files?.length > 0, "At least one image is required.")
    .refine((files) => Array.from(files ?? []).every((file) => file.size <= MAX_FILE_SIZE), `Max file size is 5MB.`)
    .refine(
      (files) => Array.from(files ?? []).every((file) => ACCEPTED_IMAGE_TYPES.includes(file.type)),
      ".jpg, .jpeg, .png and .webp files are accepted."
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
      price: 1,
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

  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const onSubmit = async (values: z.infer<typeof listingSchema>) => {
    setIsLoading(true);

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
      const imageFiles = Array.from(values.images);

      const uploadPromises = imageFiles.map(async (file) => {
        const fileDataUri = await toBase64(file);
        const result = await uploadFile({
          fileDataUri,
          fileName: file.name,
          path: `listings/${user.uid}`
        });
        return result.downloadUrl;
      });

      const imageUrls = await Promise.all(uploadPromises);

      const listingsCollection = collection(firestore, 'listings');
      const listingData = {
        title: values.title,
        description: values.description,
        price: values.price,
        sellerId: user.uid,
        createdAt: serverTimestamp(),
        imageUrls: imageUrls,
        status: 'Available',
      };

      addDoc(listingsCollection, listingData).catch(serverError => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: listingsCollection.path,
            operation: 'create',
            requestResourceData: listingData,
          })
        );
      });

      toast({
        title: "Listing created!",
        description: "Your item has been successfully listed.",
      });

      form.reset();
      setImagePreviews([]);
      router.push(`/listings`);

    } catch (error: any) {
        console.error("Error creating listing:", error);
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: error.message || 'There was a problem creating your listing.',
        });
        setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Revoke old previews before creating new ones
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
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
                            <Label htmlFor="images-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                    <p className="mb-1 text-sm text-muted-foreground">
                                      <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-muted-foreground">PNG, JPG or WEBP (MAX. 5MB)</p>
                                </div>
                                <Input
                                  id="images-upload"
                                  type="file"
                                  multiple
                                  className="hidden"
                                  accept="image/*"
                                  disabled={isLoading}
                                  onChange={(e) => {
                                    field.onChange(e.target.files);
                                    handleImageChange(e);
                                  }}
                                />
                            </Label>
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
