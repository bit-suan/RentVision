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
  hasLocalAuthSession,
  isLocalAuthMode,
  LOCAL_DEV_USER_ID,
  startLocalAuthSession,
} from "@/lib/auth-config";

// Initialize Amplify
configureAuth();

interface AuthContextType {
  user: AuthUser | null;
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

function localDevUser(): AuthUser {
  return {
    username: LOCAL_DEV_USER_ID,
    userId: LOCAL_DEV_USER_ID,
    signInDetails: {
      loginId: LOCAL_DEV_USER_ID,
      authFlowType: "USER_SRP_AUTH",
    },
  } as unknown as AuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const localDev = isLocalAuthMode();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkUser = useCallback(async () => {
    if (localDev) {
      setUser(hasLocalAuthSession() ? localDevUser() : null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
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
      startLocalAuthSession();
      setUser(localDevUser());
      return;
    }
    await amplifySignIn(input);
    await checkUser();
  };

  const signUp = async (input: SignUpInput) => {
    if (localDev) {
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
