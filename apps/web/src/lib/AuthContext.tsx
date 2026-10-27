"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { 
  signIn as amplifySignIn, 
  signUp as amplifySignUp, 
  confirmSignUp as amplifyConfirmSignUp,
  signOut as amplifySignOut,
  getCurrentUser,
  resendSignUpCode as amplifyResendSignUpCode,
  resetPassword as amplifyResetPassword,
  confirmResetPassword as amplifyConfirmResetPassword,
  type AuthUser,
  type SignInInput,
  type SignUpInput,
  type ConfirmSignUpInput,
  type ResetPasswordInput,
  type ConfirmResetPasswordInput
} from "aws-amplify/auth";
import {
  clearLocalAuthSession,
  configureAuth,
  getLocalSessionUser,
  hasLocalAuthSession,
  isLocalAuthMode,
  LOCAL_DEV_USER_ID,
  setLocalSessionUser,
  type LocalUserData,
} from "@/lib/auth-config";

// Initialize Amplify
configureAuth();

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");

export interface ExtendedAuthUser extends AuthUser {
  givenName?: string;
  familyName?: string;
  role?: string;
}

interface AuthContextType {
  user: ExtendedAuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLocalDev: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  confirmSignUp: (input: ConfirmSignUpInput) => Promise<void>;
  resendSignUpCode: (username: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (input: ResetPasswordInput) => Promise<void>;
  confirmPasswordReset: (input: ConfirmResetPasswordInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapLocalUserToAuthUser(data: LocalUserData): ExtendedAuthUser {
  return {
    username: data.email,
    userId: data.userId,
    givenName: data.givenName,
    familyName: data.familyName,
    role: data.role,
    signInDetails: {
      loginId: data.email,
      authFlowType: "USER_SRP_AUTH",
    },
  } as ExtendedAuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const localDev = isLocalAuthMode();
  const [user, setUser] = useState<ExtendedAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkUser = useCallback(async () => {
    if (localDev) {
      const sessionUser = getLocalSessionUser();
      if (sessionUser) {
        setUser(mapLocalUserToAuthUser(sessionUser));
      } else {
        setUser(null);
      }
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser as ExtendedAuthUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [localDev]);

  useEffect(() => {
    (async () => {
      await checkUser();
    })();
  }, [checkUser]);

  const signIn = async (input: SignInInput) => {
    if (localDev) {
      const email = input.username?.trim();
      const password = input.password;

      let res: Response;
      try {
        res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to connect to authentication server.";
        throw new Error(msg);
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Incorrect email or password.");
      }

      const userData = data.data?.user;
      const sessionUser: LocalUserData = {
        userId: userData.userId,
        email: userData.email,
        givenName: userData.givenName,
        familyName: userData.familyName,
        role: userData.role,
        token: data.data?.token,
      };

      setLocalSessionUser(sessionUser);
      setUser(mapLocalUserToAuthUser(sessionUser));
      return;
    }

    await amplifySignIn(input);
    await checkUser();
  };

  const signUp = async (input: SignUpInput) => {
    if (localDev) {
      const email = (input.options?.userAttributes?.email || input.username)?.trim();
      const givenName = input.options?.userAttributes?.given_name || "";
      const familyName = input.options?.userAttributes?.family_name || "";
      const password = input.password;

      let res: Response;
      try {
        res = await fetch(`${API_BASE}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, givenName, familyName }),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to connect to authentication server.";
        throw new Error(msg);
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Failed to create account.");
      }

      const userData = data.data?.user;
      const sessionUser: LocalUserData = {
        userId: userData.userId,
        email: userData.email,
        givenName: userData.givenName,
        familyName: userData.familyName,
        role: userData.role,
        token: data.data?.token,
      };

      // Instantly log in and save session without requiring email verification
      setLocalSessionUser(sessionUser);
      setUser(mapLocalUserToAuthUser(sessionUser));
      return;
    }

    await amplifySignUp(input);
  };

  const confirmSignUp = async (input: ConfirmSignUpInput) => {
    if (localDev) {
      return;
    }
    await amplifyConfirmSignUp(input);
  };

  const resendSignUpCode = async (username: string) => {
    if (localDev) {
      return;
    }
    await amplifyResendSignUpCode({ username });
  };

  const signOut = async () => {
    if (localDev) {
      clearLocalAuthSession();
      setUser(null);
      return;
    }
    await amplifySignOut();
    setUser(null);
  };

  const requestPasswordReset = async (input: ResetPasswordInput) => {
    if (localDev) {
      return;
    }
    await amplifyResetPassword(input);
  };

  const confirmPasswordReset = async (input: ConfirmResetPasswordInput) => {
    if (localDev) {
      return;
    }
    await amplifyConfirmResetPassword(input);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isLocalDev: localDev,
        signIn,
        signUp,
        confirmSignUp,
        resendSignUpCode,
        signOut,
        requestPasswordReset,
        confirmPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
