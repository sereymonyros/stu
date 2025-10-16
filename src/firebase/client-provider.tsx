
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
import { ChatbotProvider } from '@/components/chatbot-provider';
import { SettingsSheetProvider } from '@/components/settings-sheet';


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
        <SettingsSheetProvider>
          <ChatbotProvider>
              <Header />
              <div className="container relative flex flex-col mx-auto min-h-screen">
                <main id="main-content" className="flex-1 pb-24 md:pb-8">
                  {children}
                </main>
                <BottomNavbar />
              </div>
              <Chatbot />
              <Toaster />
          </ChatbotProvider>
        </SettingsSheetProvider>
    </FirebaseProvider>
  );
}
