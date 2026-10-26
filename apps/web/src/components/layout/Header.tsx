import Link from "next/link";
import UserMenu from "./UserMenu";

export default function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link aria-label="RentVision home" className="site-brand" href="/">
          <span aria-hidden="true" className="site-brand__mark">
            R
          </span>
          RentVision
        </Link>

        <nav aria-label="Main navigation" className="site-nav">
          <Link href="/">Home</Link>
          <Link href="/properties">Properties</Link>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
