"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await requestPasswordReset({ username: email });
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || "Failed to request password reset.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page auth-page">
      <div className="auth-card">
        <h1>Forgot Password</h1>
        <p className="muted">Enter your email to receive a reset code</p>

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

          <div className="auth-actions">
            <Button type="submit" isLoading={isLoading}>
              Send Reset Code
            </Button>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            Remembered your password? <Link href="/login">Log In</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
