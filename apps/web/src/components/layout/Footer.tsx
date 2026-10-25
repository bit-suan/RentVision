import Link from "next/link";

// Replace these placeholders with confirmed contact details before enabling links.
const contactPhone = "+251 XX XXX XXXX";
const contactEmail = "hello@rentvision.com";

function ContactIcon({ type }: { type: "phone" | "email" | "location" }) {
  if (type === "phone") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <path d="M7.2 3.5h2.5l1.2 4-1.7 1.7a15 15 0 0 0 5.6 5.6l1.7-1.7 4 1.2v2.5a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 5.2 5.7a2 2 0 0 1 2-2.2Z" />
      </svg>
    );
  }

  if (type === "email") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M19 10.2c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__landing">
          <div className="site-footer__main">
            <div className="site-footer__identity">
              <p className="site-footer__brand">RentVision</p>
              <p className="site-footer__tagline">Find a place you can trust.</p>
              <nav aria-label="Footer navigation" className="site-footer__nav">
                <Link href="/">Home</Link>
                <Link href="/properties">Properties</Link>
                <Link href="/map">Map</Link>
              </nav>
            </div>

            <section aria-labelledby="footer-contact-heading" className="site-footer__contact">
              <h2 id="footer-contact-heading">Contact</h2>
              <ul>
                <li>
                  <ContactIcon type="phone" />
                  <span>{contactPhone}</span>
                </li>
                <li>
                  <ContactIcon type="email" />
                  <span>{contactEmail}</span>
                </li>
                <li>
                  <ContactIcon type="location" />
                  <span>Addis Ababa, Ethiopia</span>
                </li>
              </ul>
            </section>
          </div>
          <p className="site-footer__copyright">© 2026 RentVision. All rights reserved.</p>
        </div>

        <p className="site-footer__legacy">Copyright 2026 RentVision. All rights reserved.</p>
      </div>
    </footer>
  );
}
