
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { User, Briefcase } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const personas = {
  user1: {
    fullName: 'Test User One',
    address: '123 Main St, Phnom Penh',
    phone: '012345678',
    email: 'testuser1@example.com',
    userType: 'standard',
  },
  user2: {
    fullName: 'Test User Two',
    address: '456 Market St, Phnom Penh',
    phone: '098765432',
    email: 'testuser2@example.com',
    userType: 'standard',
  }
};


export default function SignupPage() {
  const [fullName, setFullName] = useState(personas.user1.fullName);
  const [address, setAddress] = useState(personas.user1.address);
  const [phone, setPhone] = useState(personas.user1.phone);
  const [email, setEmail] = useState(personas.user1.email);
  const [password, setPassword] = useState('password');
  const [confirmPassword, setConfirmPassword] = useState('password');
  const [userType, setUserType] = useState('standard');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const setPersona = (persona: 'user1' | 'user2') => {
    const data = personas[persona];
    setFullName(data.fullName);
    setAddress(data.address);
    setPhone(data.phone);
    setEmail(data.email);
    setUserType(data.userType);
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match.',
        description: 'Please make sure your passwords match.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create a user profile document in Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const profileData = {
        uid: user.uid,
        displayName: fullName,
        email: user.email,
        address: address,
        phone: phone,
        photoURL: '',
        userType: userType,
      };

      setDoc(userDocRef, profileData).catch(serverError => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'create',
            requestResourceData: profileData,
          })
        );
      });

      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl">Sign Up</CardTitle>
          <CardDescription>Enter your information to create an account. Use the buttons below to pre-fill test user data.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button variant="outline" onClick={() => setPersona('user1')}>Pre-fill Test User 1</Button>
            <Button variant="outline" onClick={() => setPersona('user2')}>Pre-fill Test User 2</Button>
          </div>
          <form onSubmit={handleSignUp} className="grid gap-6">
            <div className="grid grid-cols-1 gap-4">
               <div className="grid gap-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  placeholder="e.g., Chan Dara"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="e.g., #123 Street 456, Phnom Penh"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g., 012 345 678"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                />
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <ToggleGroup
                type="single"
                value={userType}
                onValueChange={(value) => { if (value) setUserType(value)}}
                className="grid grid-cols-2 gap-4"
                disabled={isLoading}
            >
                <ToggleGroupItem value="standard" aria-label="Select standard user" className="h-auto py-3 flex-col gap-2">
                    <User className="h-5 w-5" />
                    <span>General User</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="recruiter" aria-label="Select recruiter" className="h-auto py-3 flex-col gap-2">
                    <Briefcase className="h-5 w-5" />
                    <span>Recruiter</span>
                </ToggleGroupItem>
            </ToggleGroup>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create an account'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
