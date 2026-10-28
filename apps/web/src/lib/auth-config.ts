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
 * Local development auth is only enabled when Cognito is not configured and
 * the web app is pointed at a local API. A deployment can explicitly opt into
 * the same API-backed auth flow with `NEXT_PUBLIC_AUTH_MODE=local` (used by the
 * Render Blueprint, where Cognito is not provisioned).
 */
export function isLocalAuthMode(): boolean {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const isLocalApi = /localhost|127\.0\.0\.1/.test(apiBase);
  const explicitlyEnabled = process.env.NEXT_PUBLIC_AUTH_MODE === 'local';
  const hasCognito =
    Boolean(authConfig.Cognito.userPoolId) &&
    Boolean(authConfig.Cognito.userPoolClientId);
  return !hasCognito && (isLocalApi || explicitlyEnabled);
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
  // Amplify throws on an empty Cognito configuration. Local development uses
  // the demo session instead, so only configure Amplify when credentials exist.
  if (!authConfig.Cognito.userPoolId || !authConfig.Cognito.userPoolClientId) {
    return;
  }

  Amplify.configure({
    Auth: authConfig,
  });
}
