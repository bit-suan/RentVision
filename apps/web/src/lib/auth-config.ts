import { Amplify } from 'aws-amplify';

export const authConfig = {
  Cognito: {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
    userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
    loginWith: {
      email: true,
    },
  },
};

export function configureAuth() {
  Amplify.configure({
    Auth: authConfig,
  });
}
