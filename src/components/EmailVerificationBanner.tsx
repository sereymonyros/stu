'use client';

import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export function EmailVerificationBanner() {
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleResendVerification = async () => {
    if (!user) return;
    
    setIsSending(true);
    try {
        await sendEmailVerification(user);
        toast({
            title: "Verification Email Sent",
            description: "Please check your inbox (and spam folder) for the verification link.",
        });
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Error Sending Email",
            description: error.message || "An unexpected error occurred. Please try again.",
        });
    } finally {
        setIsSending(false);
    }
  };

  if (user && !user.emailVerified) {
    return (
      <Alert className="rounded-none border-t-0 border-l-0 border-r-0 border-b-primary/50 bg-primary/10 dark:bg-primary/10 text-foreground">
        <Terminal className="h-4 w-4" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full">
            <div className="flex-1 mb-2 sm:mb-0">
                <AlertTitle>Verify Your Email</AlertTitle>
                <AlertDescription>
                    Please check your inbox to verify your email address. This helps secure your account.
                </AlertDescription>
            </div>
            <Button onClick={handleResendVerification} variant="secondary" size="sm" disabled={isSending}>
                {isSending ? "Sending..." : "Resend Verification Email"}
            </Button>
        </div>
      </Alert>
    );
  }

  return null;
}
