
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { seedDatabase } from '@/ai/flows/seed-database-flow';
import { Database } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SeedPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSeed = async () => {
    setIsLoading(true);
    setResult(null);
    toast({
      title: 'Database Seeding Started...',
      description: 'This may take a moment. Please do not navigate away.',
    });

    try {
      const response = await seedDatabase();
      setResult(response);
      toast({
        title: 'Seeding Complete!',
        description: response.message,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database />
            Database Seeder
          </CardTitle>
          <CardDescription>
            Use this tool to populate your Firestore database with test data. It will create 10 recruiters, 10 standard users, and 10 job postings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              This action will create users in Firebase Authentication and documents in Firestore. It is designed to skip existing data to prevent duplicates.
            </AlertDescription>
          </Alert>
          <Button onClick={handleSeed} disabled={isLoading} className="w-full">
            {isLoading ? 'Seeding in Progress...' : 'Seed Database'}
          </Button>
          {result && (
            <Card className="bg-muted p-4">
              <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-base">Seeding Results</CardTitle>
              </CardHeader>
              <CardContent className="p-0 text-sm space-y-1">
                 <p><strong>Message:</strong> {result.message}</p>
                 <p><strong>Recruiters Created:</strong> {result.recruitersCreated}</p>
                 <p><strong>Standard Users Created:</strong> {result.standardUsersCreated}</p>
                 <p><strong>Jobs Created:</strong> {result.jobsCreated}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
