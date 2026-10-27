"use client";

import { Link } from "@/i18n/routing";
import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/ui/Button";

export default function UserMenu() {
  const { user, isAuthenticated, signOut, isLoading } = useAuth();

  if (isLoading) {
    return <div className="user-menu-placeholder" />;
  }

  if (isAuthenticated) {
    const fullName = [user?.givenName, user?.familyName].filter(Boolean).join(" ");
    const displayName = fullName || user?.username || user?.userId || "Account";
    const initial = displayName.charAt(0).toUpperCase();
    return (
      <div className="user-menu-pill">
        <span className="user-menu-avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="user-menu-name" title={displayName}>
          {displayName}
        </span>
        <button
          type="button"
          className="user-menu-signout"
          onClick={() => signOut()}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="user-menu">
      <Link href="/login" className="site-nav__link">
        Log In
      </Link>
    </div>
  );
}
