import { Amplify } from 'aws-amplify';

export const LOCAL_AUTH_SESSION_KEY = 'rentvision.localAuth';
export const LOCAL_SESSION_USER_KEY = 'rentvision.sessionUser';
export const LOCAL_DEV_USER_ID = 'landlord-demo';

export interface LocalUserData {
  userId: string;
  email: string;
  givenName?: string;
  familyName?: string;
  role?: string;
  token?: string;
}

export function getLocalSessionUser(): LocalUserData | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(LOCAL_SESSION_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setLocalSessionUser(user: LocalUserData): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(user));
    window.localStorage.setItem(LOCAL_AUTH_SESSION_KEY, 'active');
  }
}

export const authConfig = {
  Cognito: {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
    userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
    loginWith: {
      email: true,
    },
  },
};

/**
 * Backend email/password auth (/auth/signup and /auth/login) is used whenever
 * Cognito is not configured. It works with both the local API and the
 * deployed API Gateway URL.
 */
export function isLocalAuthMode(): boolean {
  return !authConfig.Cognito.userPoolId && !authConfig.Cognito.userPoolClientId;
}

export function hasLocalAuthSession(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.localStorage.getItem(LOCAL_AUTH_SESSION_KEY) === 'active' ||
    !!window.localStorage.getItem(LOCAL_SESSION_USER_KEY)
  );
}

export function startLocalAuthSession(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCAL_AUTH_SESSION_KEY, 'active');
  }
}

export function clearLocalAuthSession(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
    window.localStorage.removeItem(LOCAL_SESSION_USER_KEY);
  }
}

export function configureAuth() {
  // Amplify throws on an empty Cognito configuration. Backend auth uses the
  // saved session instead, so only configure Amplify when credentials exist.
  if (!authConfig.Cognito.userPoolId || !authConfig.Cognito.userPoolClientId) {
    return;
  }

  Amplify.configure({
    Auth: authConfig,
  });
}
