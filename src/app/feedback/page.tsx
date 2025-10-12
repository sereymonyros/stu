
'use client';

import { useForm, Controller } from 'react-hook-form';
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
import { useAuth, useFirestore, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Star, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFile } from '@/ai/flows/upload-file-flow';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const feedbackSchema = z.object({
  rating: z.number().min(1, 'Rating is required.').max(5),
  comment: z.string().min(10, 'Comment must be at least 10 characters long.'),
  image: z.custom<FileList>().optional()
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0].type),
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


export default function FeedbackPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

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


  const onSubmit = async (values: z.infer<typeof feedbackSchema>) => {
    setIsSubmitting(true);
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      setIsSubmitting(false);
      return;
    }

    try {
      let imageUrl: string | undefined = undefined;
      const imageFile = values.image?.[0];

      if (imageFile) {
        try {
            const fileDataUri = await toBase64(imageFile);
            const uploadResult = await uploadFile({
                fileDataUri,
                fileName: imageFile.name,
                path: `feedbacks/${user.uid}`
            });
            imageUrl = uploadResult.downloadUrl;
        } catch(uploadError: any) {
             toast({ variant: 'destructive', title: 'Image upload failed', description: 'Could not upload the image. Please try again.' });
             setIsSubmitting(false);
             return;
        }
      }

      const { image, ...feedbackData } = values;

      const dataToSave = {
        ...feedbackData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        ...(imageUrl && { imageUrl }),
      };

      const feedbacksCol = collection(firestore, 'feedbacks');
      addDoc(feedbacksCol, dataToSave).catch(serverError => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: feedbacksCol.path,
            operation: 'create',
            requestResourceData: dataToSave,
          })
        );
      });

      toast({ title: 'Thank you for your feedback!' });
      router.push('/');
    } catch (error: any) {
      // This will now primarily catch errors from file upload or other non-firestore async operations
      toast({ variant: 'destructive', title: 'Failed to submit feedback', description: error.message });
      setIsSubmitting(false);
    }
  };

  if (!user) {
      return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Submit Feedback</CardTitle>
            <CardDescription>We value your opinion. Let us know how we can improve.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Controller
                  control={form.control}
                  name="rating"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Rating</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'h-8 w-8 cursor-pointer transition-colors',
                                (hoverRating || field.value) >= star
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-muted-foreground'
                              )}
                              onClick={() => field.onChange(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                            />
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comments</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us what you liked or what could be better..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attach an image (Optional)</FormLabel>
                          <FormControl>
                            <Label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                    <p className="mb-1 text-sm text-muted-foreground">
                                      <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP (MAX. 5MB)</p>
                                </div>
                                <Input
                                  id="image-upload"
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  disabled={isSubmitting}
                                  onChange={(e) => {
                                    field.onChange(e.target.files);
                                    handleImageChange(e);
                                  }}
                                />
                            </Label>
                          </FormControl>
                        <FormDescription>
                          Optionally, add a screenshot or image to help explain your feedback.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {imagePreview && (
                      <div className="w-full relative aspect-video">
                        <Image src={imagePreview} alt="Image preview" fill className="rounded-md object-contain" />
                      </div>
                  )}

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
