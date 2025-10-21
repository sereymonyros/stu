
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { unseedDatabase } from '@/ai/flows/unseed-database-flow';
import { Database, Trash2, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function UnseedPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleUnseed = async () => {
    setIsLoading(true);
    setResult(null);
    toast({
      title: 'Database Unseeding Started...',
      description: 'This may take a moment. Please do not navigate away.',
    });

    try {
      const response = await unseedDatabase();
      setResult(response);
      toast({
        title: 'Unseeding Complete!',
        description: response.message,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Unseeding Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex   items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-lg rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 />
            Database Unseeder
          </CardTitle>
          <CardDescription>
            Use this tool to delete all jobs and their applications from the Firestore database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTitle>DANGER: Destructive Action!</AlertTitle>
            <AlertDescription>
              This action will permanently delete all documents in the 'jobs' collection and all nested 'applications' sub-collections. This cannot be undone.
            </AlertDescription>
          </Alert>

          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading} className="w-full">
                    {isLoading ? 'Deleting in Progress...' : 'Delete All Jobs'}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete all job postings and all associated candidate applications. This data will be gone forever.
                    </AlertDialogDescription>
                     <AlertDialogCancel asChild>
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full"><X className="h-4 w-4" /></Button>
                    </AlertDialogCancel>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction
                        onClick={handleUnseed}
                        disabled={isLoading}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isLoading ? 'Deleting...' : 'Yes, Delete Everything'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          {result && (
            <Card className="bg-muted p-4 rounded-3xl">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-base">Deletion Results</CardTitle>
              </CardHeader>
              <CardContent className="p-0 text-sm space-y-1">
                <p><strong>Message:</strong> {result.message}</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><strong>Jobs Deleted:</strong> {result.jobsDeleted}</li>
                  <li><strong>Applications Deleted:</strong> {result.applicationsDeleted}</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
