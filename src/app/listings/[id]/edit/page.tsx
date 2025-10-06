'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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

const listingSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }),
  description: z.string().optional(),
  price: z.coerce.number().positive({ message: 'Price must be a positive number.' }),
  status: z.enum(['available', 'pending', 'sold']),
});

export default function EditListingPage() {
  const { id } = useParams();
  const firestore = useFirestore();
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
    }
  }, [listing, form]);

  // Security check: ensure only the owner can stay on this page
  useEffect(() => {
    // Wait until both user and listing have finished loading
    if (isUserLoading || isListingLoading) {
      return; // Do nothing while loading
    }

    // After loading, if there's no user, redirect to login
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // After loading, if the user is not the owner, show an error and redirect
    if (listing && user.uid !== listing.sellerId) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You are not the owner of this listing.",
      });
      router.replace(`/listings/${listingId}`);
    }

  }, [user, isUserLoading, listing, isListingLoading, listingId, router, toast]);

  const onSubmit = async (values: z.infer<typeof listingSchema>) => {
    if (!listingRef) return;
    setIsSubmitting(true);
    
    try {
      await updateDoc(listingRef, {
        title: values.title,
        description: values.description,
        price: values.price,
        status: values.status,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Listing updated!",
        description: "Your item has been successfully updated.",
      });

      router.push('/listings');

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: error.message || 'There was a problem updating your listing.',
        });
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
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                </div>
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-20 w-full" />
                </div>
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        )}

        {!isLoading && listing && (
            <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Edit Your Item</CardTitle>
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
                                <Input type="number" placeholder="0.00" className="pl-7" {...field} />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="sold">Sold</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                <Button asChild className="mt-6">
                    <Link href="/listings">Back to Listings</Link>
                </Button>
            </div>
        )}
      </main>
    </div>
  );
}
