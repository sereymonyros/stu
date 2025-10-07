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
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const listingSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }),
  description: z.string().optional(),
  price: z.coerce.number().positive({ message: 'Price must be a positive number.' }),
  status: z.enum(['available', 'pending', 'sold']),
  images: z.custom<FileList>().optional(),
});

export default function EditListingPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const listingId = Array.isArray(id) ? id[0] : id;

  const listingRef = useMemo(() => {
    if (!firestore || !listingId) return null;
    return doc(firestore, 'listings', listingId);
  }, [firestore, listingId]);

  const { data: listing, isLoading: isListingLoading } = useDoc(listingRef);

  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  
  const form = useForm<z.infer<typeof listingSchema>>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      status: 'available',
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
    if (isUserLoading || isListingLoading) return;
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
  }, [user, isUserLoading, listing, isListingLoading, router, toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
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
            const decodedUrl = decodeURIComponent(imageUrlToRemove);
            const pathStartIndex = decodedUrl.indexOf('/o/') + 3;
            const pathEndIndex = decodedUrl.indexOf('?');
            const filePath = decodedUrl.substring(pathStartIndex, pathEndIndex);

            if (filePath) {
                const imageRef = ref(storage, filePath);
                await deleteObject(imageRef);
            }
        }
      
        const updatedImageUrls = existingImageUrls.filter((url) => url !== imageUrlToRemove);
        setExistingImageUrls(updatedImageUrls);
      
        if (listingRef) {
          await updateDoc(listingRef, { imageUrls: updatedImageUrls });
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

    // CRITICAL FIX: Ensure user is available before proceeding.
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
      const storage = getStorage();
      let updatedImageUrls = [...existingImageUrls];

      if (values.images && values.images.length > 0) {
        const imageFiles = Array.from(values.images);
        const uploadPromises = imageFiles.map(file => {
            const storageRef = ref(storage, `${user.uid}/${Date.now()}-${file.name}`);
            return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
        });
        const newImageUrls = await Promise.all(uploadPromises);
        updatedImageUrls.push(...newImageUrls);
      }
      
      if (updatedImageUrls.length === 0) {
          toast({ variant: 'destructive', title: 'An item must have at least one image.'});
          setIsSubmitting(false);
          return;
      }

      let dataToUpdate: any = {
        ...values,
        images: undefined,
        imageUrls: updatedImageUrls,
        updatedAt: serverTimestamp(),
      };

      if (values.price !== listing.price) {
          dataToUpdate.originalPrice = listing.price;
      }

      await updateDoc(listingRef, dataToUpdate);
      
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
    } finally {
        setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || isListingLoading;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        {isLoading && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-20 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        )}

        {!isLoading && listing && (
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
                        <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="sold">Sold</SelectItem></SelectContent></Select><FormMessage /></FormItem>
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
        )}

        {!isLoading && !listing && (
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
