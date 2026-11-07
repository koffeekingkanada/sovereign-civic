import { useInternetIdentity } from "@caffeineai/core-infrastructure";

export interface AuthState {
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoggingIn: boolean;
  isLoginError: boolean;
  loginError?: Error;
  login: () => void;
  signOut: () => void;
}

/**
 * Thin wrapper over the platform Internet Identity context. Internet Identity
 * is the only supported sign-in method for this application.
 */
export function useAuth(): AuthState {
  const {
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    isLoginError,
    loginError,
    login,
    clear,
  } = useInternetIdentity();

  return {
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    isLoginError,
    loginError,
    login: () => login(),
    signOut: () => clear(),
  };
}
