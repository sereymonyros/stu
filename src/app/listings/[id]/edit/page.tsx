
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
import { useUser, useDoc, useFirestore, useAuth } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from "firebase/storage";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Image from 'next/image';
import { X } from 'lucide-react';
import { uploadFile } from '@/ai/flows/upload-file-flow';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';

const listingSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }),
  description: z.string().optional(),
  price: z.coerce.number().positive({ message: 'Price must be a positive number.' }),
  status: z.enum(['Available', 'Pending', 'Sold']),
  images: z.custom<FileList>().optional()
    .refine((files) => !files || Array.from(files).every((file) => file.size <= MAX_FILE_SIZE), `Max file size is 5MB.`)
    .refine(
      (files) => !files || Array.from(files).every((file) => ACCEPTED_IMAGE_TYPES.includes(file.type)),
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

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: listingId } = use(params);
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finalListingId = Array.isArray(listingId) ? listingId[0] : listingId;

  const listingRef = useMemo(() => {
    if (!firestore || !finalListingId) return null;
    return doc(firestore, 'listings', finalListingId);
  }, [firestore, finalListingId]);

  const { data: listing } = useDoc(listingRef);

  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const form = useForm<z.infer<typeof listingSchema>>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      status: 'Available',
    },
  });

  useEffect(() => {
    if (listing) {
      form.reset({
        title: listing.title,
        description: listing.description,
        price: listing.price,
        status: listing.status,
      });
      setExistingImageUrls(listing.imageUrls || []);
    }
  }, [listing, form]);

  useEffect(() => {
    if (!listing) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (listing && user.uid !== listing.sellerId) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You are not the owner of this listing.",
      });
      router.replace(`/listings`);
    }
  }, [user, listing, router, toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      newImagePreviews.forEach(url => URL.revokeObjectURL(url));
      const newPreviews = Array.from(files).map(file => URL.createObjectURL(file));
      setNewImagePreviews(newPreviews);
    } else {
      setNewImagePreviews([]);
    }
  }

  const handleRemoveExistingImage = async (imageUrlToRemove: string) => {
    setIsSubmitting(true);
    try {
        const isFirebaseUrl = imageUrlToRemove.includes('firebasestorage.googleapis.com');
        if (isFirebaseUrl) {
            const storage = getStorage();
            // This is a simplified way to get the path. For production, you might need a more robust URL parser.
            const imageRef = ref(storage, imageUrlToRemove);
            await deleteObject(imageRef);
        }

        const updatedImageUrls = existingImageUrls.filter((url) => url !== imageUrlToRemove);
        setExistingImageUrls(updatedImageUrls);

        if (listingRef) {
          updateDoc(listingRef, { imageUrls: updatedImageUrls }).catch(serverError => {
            errorEmitter.emit(
              'permission-error',
              new FirestorePermissionError({
                path: listingRef.path,
                operation: 'update',
                requestResourceData: { imageUrls: updatedImageUrls },
              })
            );
          });
        }

        toast({ title: "Image removed successfully." });
    } catch (error: any) {
        console.error("Failed to remove image:", error);
        toast({ variant: 'destructive', title: 'Failed to remove image', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  const onSubmit = async (values: z.infer<typeof listingSchema>) => {
    setIsSubmitting(true);

    if (!listingRef || !listing) {
        setIsSubmitting(false);
        return;
    }

    if (!auth.currentUser) {
        toast({
            variant: "destructive",
            title: "Not authenticated",
            description: "You must be logged in to edit a listing. Please refresh and try again.",
        });
        setIsSubmitting(false);
        return;
    }
    const user = auth.currentUser;

    try {
      const updatedImageUrls = [...existingImageUrls];

      if (values.images && values.images.length > 0) {
        const imageFiles = Array.from(values.images);

        const uploadPromises = imageFiles.map(async file => {
            const fileDataUri = await toBase64(file);
            const result = await uploadFile({
                fileDataUri,
                fileName: file.name,
                path: `listings/${user.uid}`
            });
            return result.downloadUrl;
        });
        const newImageUrls = await Promise.all(uploadPromises);
        updatedImageUrls.push(...newImageUrls);
      }

      if (updatedImageUrls.length === 0) {
          toast({ variant: 'destructive', title: 'An item must have at least one image.'});
          setIsSubmitting(false);
          return;
      }

      const { images, ...dataToUpdate } = values;

      const finalData = {
          ...dataToUpdate,
          imageUrls: updatedImageUrls,
          updatedAt: serverTimestamp(),
          ...(values.price !== listing.price && { originalPrice: listing.price }),
      };

      updateDoc(listingRef, finalData).catch(serverError => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: listingRef.path,
            operation: 'update',
            requestResourceData: finalData,
          })
        );
      });

      toast({
        title: "Listing updated!",
        description: "Your item has been successfully updated.",
      });

      router.push(`/listings`);

    } catch (error: any) {
        console.error("Error updating listing:", error);
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: error.message || 'There was a problem updating your listing.',
        });
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        {listing ? (
            <Card className="max-w-2xl mx-auto">
            <CardHeader><CardTitle>Edit Your Item</CardTitle></CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="What are you selling?" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe your item in detail..." className="resize-none" {...field}/></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem><FormLabel>Price</FormLabel><FormControl><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span><Input type="number" placeholder="0.00" className="pl-7" {...field} step="0.01"/></div></FormControl><FormDescription>If you change the price, the previous price will be shown with a strikethrough.</FormDescription><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Available">Available</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Sold">Sold</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )}/>

                    <FormItem>
                      <FormLabel>Current Images</FormLabel>
                      {existingImageUrls.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {existingImageUrls.map((url, i) => (
                            <div key={url} className="relative aspect-square w-full group">
                              <Image src={url} alt={`Existing image ${i + 1}`} fill className="rounded-md object-cover"/>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveExistingImage(url)}
                                disabled={isSubmitting}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No images have been uploaded yet.</p>
                      )}
                    </FormItem>

                    <FormField control={form.control} name="images" render={({ field }) => (
                        <FormItem><FormLabel>Add More Images</FormLabel><FormControl><Input type="file" multiple accept="image/*" onChange={(e) => {field.onChange(e.target.files); handleImageChange(e);}} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>
                    )}/>

                    {newImagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {newImagePreviews.map((src, i) => (
                          <div key={i} className="relative aspect-square w-full">
                              <Image src={src} alt={`Preview ${i + 1}`} fill className="rounded-md object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                    </Button>
                </form>
                </Form>
            </CardContent>
            </Card>
        ) : (
            <div className="text-center py-20">
                <h2 className="text-2xl font-semibold">Listing not found</h2>
                <p className="text-muted-foreground mt-2">This listing may have been removed or the link is incorrect.</p>
                <Button asChild className="mt-6"><Link href="/listings">Back to Listings</Link></Button>
            </div>
        )}
      </main>
    </div>
  );
}
