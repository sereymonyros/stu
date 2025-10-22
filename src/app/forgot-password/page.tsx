'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSubmitted(false);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setIsSubmitted(true); // Show success message
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            toast({
                variant: "destructive",
                title: "User not found",
                description: "No account found with that email address. Please check for typos or sign up.",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Error sending reset email",
                description: error.message || "An unexpected error occurred. Please try again.",
            });
        }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex   items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm rounded-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            {isSubmitted 
              ? "A password reset link has been sent to your email."
              : null
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <p>
                Please check your inbox (and spam folder) for the reset link.
              </p>
              <Button variant="link" asChild>
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
               <div className="mt-4 text-center text-sm">
                <Link href="/login" className="underline">
                  Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}