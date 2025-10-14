'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface AnimationContextType {
  triggerAvatarPop: () => void;
  isAvatarPopping: boolean;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [isAvatarPopping, setIsAvatarPopping] = useState(false);

  const triggerAvatarPop = useCallback(() => {
    setIsAvatarPopping(true);
    // The CSS animation will last for 600ms, so we reset the state after that.
    setTimeout(() => setIsAvatarPopping(false), 600);
  }, []);

  return (
    <AnimationContext.Provider value={{ triggerAvatarPop, isAvatarPopping }}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimation() {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
}
