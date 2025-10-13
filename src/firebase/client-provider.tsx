
'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase, getSdks } from '@/firebase';
import { type FirebaseApp } from 'firebase/app';
import { type Auth } from 'firebase/auth';
import { type Firestore } from 'firebase/firestore';
import { type FirebaseStorage } from 'firebase/storage';
import { Header } from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { BottomNavbar } from '@/components/bottom-navbar';
import { Chatbot } from '@/components/chatbot';


interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);

  useEffect(() => {
    // This check ensures that Firebase is only initialized on the client-side.
    if (typeof window !== 'undefined') {
      const services = initializeFirebase();
      setFirebaseServices(services);
    }
  }, []);

  // While waiting for client-side initialization, we render null.
  // This prevents any child components from trying to use Firebase before it's ready.
  if (!firebaseServices) {
    return null;
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      <div className="relative flex flex-col h-screen">
        <Header />
        {/* The main content area now uses calc() to subtract the header (65px) and bottom nav (64px) heights */}
        <main className="overflow-y-auto md:h-full" style={{ height: 'calc(100vh - 65px - 64px)'}}>
          <div className="container mx-auto w-full">
            {children}
          </div>
        </main>
        <Chatbot />
        <BottomNavbar />
        <Toaster />
      </div>
    </FirebaseProvider>
  );
}
