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
import { configureAuth } from "@/lib/auth-config";

// Initialize Amplify
configureAuth();

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  confirmSignUp: (input: ConfirmSignUpInput) => Promise<void>;
  resendSignUpCode: (username: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (input: ResetPasswordInput) => Promise<void>;
  confirmPasswordReset: (input: ConfirmResetPasswordInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await checkUser();
    })();
  }, [checkUser]);

  const signIn = async (input: SignInInput) => {
    await amplifySignIn(input);
    await checkUser();
  };

  const signUp = async (input: SignUpInput) => {
    await amplifySignUp(input);
  };

  const confirmSignUp = async (input: ConfirmSignUpInput) => {
    await amplifyConfirmSignUp(input);
  };

  const resendSignUpCode = async (username: string) => {
    await amplifyResendSignUpCode({ username });
  };

  const signOut = async () => {
    await amplifySignOut();
    setUser(null);
  };

  const requestPasswordReset = async (input: ResetPasswordInput) => {
    await amplifyResetPassword(input);
  };

  const confirmPasswordReset = async (input: ConfirmResetPasswordInput) => {
    await amplifyConfirmResetPassword(input);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
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
