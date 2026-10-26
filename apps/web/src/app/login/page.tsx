"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const redirectPath = searchParams.get("redirect") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signIn({ username: email, password });
      router.push(redirectPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page auth-page">
      <div className="auth-card">
        <h1>Welcome Back</h1>
        <p className="muted">Log in to your RentVision account</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="error">{error}</p>}
          
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
            <Link href="/forgot-password" title="Forgot password?" className="muted">
              Forgot password?
            </Link>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            Don&apos;t have an account? <Link href="/signup">Sign Up</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
