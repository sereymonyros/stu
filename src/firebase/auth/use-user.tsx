'use client';

import { useFirebase } from '@/firebase/provider';

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
    user: import('firebase/auth').User | null;
    isUserLoading: boolean;
    userError: Error | null;
}
  
  /**
   * Hook specifically for accessing the authenticated user's state.
   * This provides the User object, loading status, and any auth errors.
   * @returns {UserHookResult} Object with user, isUserLoading, userError.
   */
  export const useUser = (): UserHookResult => {
    const { user, isUserLoading, userError } = useFirebase(); // Leverages the main hook
    return { user, isUserLoading, userError };
  };