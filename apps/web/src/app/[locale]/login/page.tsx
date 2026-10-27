"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLocalDev, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Image alt="RentVision" height={56} src="/images/rentvision-logo.png" style={{ height: 56, width: 56 }} width={56} />
        </div>
        <h1>Welcome Back</h1>
        <p className="muted">Log in to your RentVision account</p>

        {justVerified && (
          <p className="success">Email verified! You can now log in.</p>
        )}
        {justReset && (
          <p className="success">Password reset successfully. Please log in.</p>
        )}
        {isLocalDev && (
          <p className="muted">
            Local development mode: any email and password signs you in as the
            demo landlord. Cognito is not configured.
          </p>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="auth-error">{error}</p>}

          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <div className="auth-actions">
            <Button type="submit" isLoading={isLoading}>
              Log In
            </Button>
            <Link href="/forgot-password" className="auth-link-quiet">
              Forgot password?
            </Link>
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
