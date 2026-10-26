"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";

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
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
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
          {error && <p className="error" style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
          
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

          <div className="auth-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <Button type="submit" isLoading={isLoading}>
              Log In
            </Button>
            <Link href="/forgot-password" title="Forgot password?" className="muted" style={{ fontSize: '0.9rem' }}>
              Forgot password?
            </Link>
          </div>
        </form>

        <div className="auth-footer" style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p>
            Don't have an account? <Link href="/signup" style={{ color: '#0f6b3f', fontWeight: '600' }}>Sign Up</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: '8rem', textAlign: 'center' }}><Spinner label="Loading..." /></div>}>
      <LoginContent />
    </Suspense>
  );
}
