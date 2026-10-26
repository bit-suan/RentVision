"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirmSignUp, resendSignUpCode } = useAuth();
  
  const email = searchParams.get("email") || "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      router.push("/login?verified=true");
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      await resendSignUpCode(email);
      setSuccess("Verification code resent successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="page auth-page">
      <div className="auth-card">
        <h1>Verify Your Email</h1>
        <p className="muted">We've sent a code to {email}</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          
          <Input
            id="code"
            label="Verification Code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            placeholder="Enter 6-digit code"
          />

          <div className="auth-actions">
            <Button type="submit" isLoading={isLoading}>
              Verify
            </Button>
            <Button
              type="button"
              variant="quiet"
              onClick={handleResend}
              isLoading={isResending}
            >
              Resend Code
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
