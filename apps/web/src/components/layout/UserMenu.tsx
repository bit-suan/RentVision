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
    return (
      <div className="user-menu">
        <span className="user-email">{user?.userId}</span>
        <Button variant="quiet" onClick={() => signOut()}>
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="user-menu">
      <Link href="/login" className="button secondary">
        Log In
      </Link>
      <Link href="/signup" className="button">
        Sign Up
      </Link>
    </div>
  );
}
