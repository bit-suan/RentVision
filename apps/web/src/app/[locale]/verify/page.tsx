"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/AuthContext";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirmSignUp, resendSignUpCode } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setNotice(null);

    try {
      await confirmSignUp({
        username: email.trim(),
        confirmationCode: code.trim(),
      });
      router.push("/login?verified=true");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Verification failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      setError("Enter the email address you signed up with.");
      return;
    }

    setIsResending(true);
    setError(null);
    setNotice(null);

    try {
      await resendSignUpCode(email.trim());
      setNotice("A new verification code has been sent.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not resend the code."
      );
    } finally {
      setIsResending(false);
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
        <h1>Verify your email</h1>
        <p className="muted">
          Enter the verification code we sent to your email address.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="auth-error">{error}</p>}
          {notice && <p className="success">{notice}</p>}

          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="name@example.com"
              className="form-field__control"
            />
          </div>

          <div className="form-field">
            <label htmlFor="code">Verification code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              autoComplete="one-time-code"
              placeholder="123456"
              className="form-field__control"
            />
          </div>

          <div className="auth-actions">
            <Button
              type="submit"
              isLoading={isLoading}
              className="auth-submit-btn"
            >
              Verify email
            </Button>
          </div>

          <div className="auth-actions">
            <Button
              type="button"
              variant="outline"
              isLoading={isResending}
              onClick={handleResend}
            >
              Resend code
            </Button>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            Already verified? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "8rem", textAlign: "center" }}>
          <Spinner label="Loading..." />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
