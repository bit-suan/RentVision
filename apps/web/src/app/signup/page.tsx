"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationRequired, setIsVerificationRequired] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            given_name: givenName,
            family_name: familyName,
          },
        },
      });
      setIsVerificationRequired(true);
    } catch (err: any) {
      setError(err.message || "Failed to sign up. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isVerificationRequired) {
    router.push(`/verify?email=${encodeURIComponent(email)}`);
    return null;
  }

  return (
    <main className="page auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="muted">Join RentVision to find your next home</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="error">{error}</p>}
          
          <div className="form-row">
            <Input
              id="givenName"
              label="First Name"
              type="text"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              required
            />
            <Input
              id="familyName"
              label="Last Name"
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
            />
          </div>

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
            autoComplete="new-password"
          />

          <Input
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <div className="auth-actions">
            <Button type="submit" isLoading={isLoading}>
              Sign Up
            </Button>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link href="/login">Log In</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
