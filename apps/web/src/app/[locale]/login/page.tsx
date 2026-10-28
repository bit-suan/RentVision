"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/AuthContext";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="password-toggle-svg"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="password-toggle-svg"
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const redirectPath = searchParams.get("redirect") || "/";
  const justVerified = searchParams.get("verified") === "true";
  const justReset = searchParams.get("reset") === "true";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signIn({ username: email, password });
      router.push(redirectPath);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.name === "UserNotConfirmedException" ||
          /not confirmed/i.test(err.message))
      ) {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
        return;
      }

      const message =
        err instanceof Error ? err.message : "Failed to sign in. Please check your credentials.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <Image
            alt="RentVision"
            height={52}
            src="/images/rentvision-logo.png"
            width={52}
            priority
          />
        </div>
        <h1>Welcome Back</h1>
        <p className="muted">Log in to your RentVision account</p>

        {justVerified && (
          <p className="success">Email verified successfully. Please log in.</p>
        )}

        {justReset && (
          <p className="success">Password reset successfully. Please log in.</p>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="auth-error">{error}</p>}

          <div className="form-field">
            <label htmlFor="email">
              <span>Email address</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="name@example.com"
              className="form-field__control"
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">
              <span>Password</span>
            </label>
            <div className="password-input-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="form-field__control password-input-control"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className="auth-options-row">
            <label className="remember-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <Link href="/forgot-password" className="auth-link-quiet">
              Forgot password?
            </Link>
          </div>

          <div className="auth-actions">
            <Button type="submit" isLoading={isLoading} className="auth-submit-btn">
              Sign In
            </Button>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/signup">Sign Up</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "8rem", textAlign: "center" }}>
          <Spinner label="Loading..." />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
