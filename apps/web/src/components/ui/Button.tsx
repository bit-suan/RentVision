import { Link } from "@/i18n/routing";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import Spinner from "./Spinner";

type ButtonVariant = "primary" | "secondary" | "outline" | "destructive" | "quiet";

interface ButtonStyleProps {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  style?: React.CSSProperties;
  isLoading?: boolean;
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

function buttonClassName(
  variant: ButtonVariant,
  className?: string,
  isLoading?: boolean
) {
  return [
    "button",
    `button--${variant}`,
    isLoading && "button--loading",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function Button(props: ButtonProps) {
  const {
    children,
    variant = "primary",
    className,
    isLoading = false,
    ...rest
  } = props;
  const classes = buttonClassName(variant, className, isLoading);

  if ("href" in rest && typeof rest.href === "string") {
    return (
      <Link
        className={classes}
        href={rest.href}
        target={rest.target}
        rel={rest.rel}
        style={props.style}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      style={props.style}
      disabled={isLoading || (rest as NativeButtonProps).disabled}
      {...(rest as NativeButtonProps)}
    >
      {isLoading && <Spinner className="button-spinner" />}
      <span className={isLoading ? "button-text--hidden" : ""}>{children}</span>
    </button>
  );
}
