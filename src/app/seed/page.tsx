
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { seedDatabase, type SeedDatabaseOutput } from '@/ai/flows/seed-database-flow';
import { Database } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SeedPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SeedDatabaseOutput | null>(null);
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
      <Card className="mx-auto w-full max-w-lg rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database />
            Database Seeder
          </CardTitle>
          <CardDescription>
            Use this tool to populate your Firestore database with a consistent set of test data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTitle>What this tool does:</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Creates or verifies user 'sereymonyros@gmail.com' and adds 10 jobs.</li>
                <li>Creates or verifies user 'testrecruiter@example.com' and adds 5 jobs.</li>
                <li>Creates or verifies one 'standarduser@example.com' for testing applications.</li>
                 <li>This process is safe to run multiple times; it will not duplicate users. However, it will add new jobs on each run.</li>
              </ul>
            </AlertDescription>
          </Alert>
          <Button onClick={handleSeed} disabled={isLoading} className="w-full">
            {isLoading ? 'Seeding in Progress...' : 'Run Seeder'}
          </Button>
          {result && (
            <Card className="bg-muted p-4 rounded-3xl">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-base">Seeding Results</CardTitle>
              </CardHeader>
              <CardContent className="p-0 text-sm space-y-1">
                <p><strong>Message:</strong> {result.message}</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li><strong>New Users Created:</strong> {result.usersCreated}</li>
                  <li><strong>Jobs for sereymonyros@gmail.com:</strong> {result.jobsCreatedForUser1}</li>
                  <li><strong>Jobs for testrecruiter@example.com:</strong> {result.jobsCreatedForUser2}</li>
                   <li><strong>Total New Jobs:</strong> {result.totalJobsCreated}</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
