import { Amplify } from 'aws-amplify';

export const LOCAL_AUTH_SESSION_KEY = 'rentvision.localAuth';
export const LOCAL_DEV_USER_ID = 'landlord-demo';

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
 * the web app is pointed at a local API. Production builds use Cognito, and
 * the API only accepts the development headers in local/test mode.
 */
export function isLocalAuthMode(): boolean {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const isLocalApi = /localhost|127\.0\.0\.1/.test(apiBase);
  return !authConfig.Cognito.userPoolId && !authConfig.Cognito.userPoolClientId && isLocalApi;
}

export function hasLocalAuthSession(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(LOCAL_AUTH_SESSION_KEY) === 'active';
}

export function startLocalAuthSession(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCAL_AUTH_SESSION_KEY, 'active');
  }
}

export function clearLocalAuthSession(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
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
