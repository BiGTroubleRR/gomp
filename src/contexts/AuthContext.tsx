'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useClerk, useUser } from '@clerk/nextjs';

// Clerk is the site's one login. This context is a thin adapter that keeps the `useAuth()` shape the
// pages already use (checkout / contact / gbb prefill, the Account page) but sources it from Clerk
// instead of the old Supabase email+password login.
export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

type AuthUser = { id: string; email: string };

type AuthContextValue = {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // Clerk's own account window (password, MFA, connected accounts…).
  openAccountSettings: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, user } = useUser();
  const clerk = useClerk();

  const value = useMemo<AuthContextValue>(() => {
    const email = user?.primaryEmailAddress?.emailAddress ?? '';
    const metaPhone = (user?.unsafeMetadata as { phone?: unknown } | undefined)?.phone;
    return {
      user: user ? { id: user.id, email } : null,
      profile: user
        ? {
            id: user.id,
            first_name: user.firstName ?? '',
            last_name: user.lastName ?? '',
            email,
            phone: typeof metaPhone === 'string' ? metaPhone : (user.primaryPhoneNumber?.phoneNumber ?? ''),
          }
        : null,
      loading: !isLoaded,
      signOut: async () => {
        await clerk.signOut();
      },
      openAccountSettings: () => clerk.openUserProfile(),
    };
  }, [user, isLoaded, clerk]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
