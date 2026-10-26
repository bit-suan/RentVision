"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/ui/Button";

export default function UserMenu() {
  const { user, isAuthenticated, signOut, isLoading } = useAuth();

  if (isLoading) {
    return <div className="user-menu-placeholder" />;
  }

  if (isAuthenticated) {
    // user.username is the Cognito username (email for email-based pools)
    const displayName = user?.username ?? user?.userId ?? "Account";
    return (
      <div className="user-menu">
        <span className="user-email">{displayName}</span>
        <Button variant="quiet" onClick={() => signOut()}>
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="user-menu">
      <Link href="/login" className="button button--secondary">
        Log In
      </Link>
      <Link href="/signup" className="button button--primary">
        Sign Up
      </Link>
    </div>
  );
}
