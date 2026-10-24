import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";

interface ButtonStyleProps {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "className"
>;

type ButtonProps = ButtonStyleProps &
  (
    | { href: string; target?: string; rel?: string }
    | (NativeButtonProps & { href?: never })
  );

function buttonClassName(variant: ButtonVariant, className?: string) {
  return ["button", `button--${variant}`, className].filter(Boolean).join(" ");
}

export default function Button(props: ButtonProps) {
  const { children, variant = "primary", className, ...rest } = props;
  const classes = buttonClassName(variant, className);

  if ("href" in rest && typeof rest.href === "string") {
    return (
      <Link
        className={classes}
        href={rest.href}
        target={rest.target}
        rel={rest.rel}
      >
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as NativeButtonProps)}>
      {children}
    </button>
  );
}
