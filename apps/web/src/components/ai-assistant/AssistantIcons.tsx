import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.8,
} as const;

export function SparkleChatIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      {...strokeProps}
      {...props}
    >
      <path d="M20 11.4a7.6 7.6 0 0 1-8 7.6 8.4 8.4 0 0 1-3.1-.6L4 20l1.6-4.1A7.3 7.3 0 0 1 4.4 12a7.6 7.6 0 0 1 8-7.6 7.6 7.6 0 0 1 7.6 7Z" />
      <path d="M9.2 10.3h.01M12.2 10.3h.01M15.2 10.3h.01" strokeWidth="2.4" />
      <path d="m18.8 3 .4 1.2 1.2.4-1.2.4-.4 1.2-.4-1.2-1.2-.4 1.2-.4.4-1.2Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      {...strokeProps}
      {...props}
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      {...strokeProps}
      {...props}
    >
      <path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M7 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4L17 7M10 11v5M14 11v5" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      {...strokeProps}
      {...props}
    >
      <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      {...strokeProps}
      {...props}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function RetryIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      {...strokeProps}
      {...props}
    >
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      {...strokeProps}
      {...props}
    >
      <path d="M12 4 3.8 19h16.4L12 4Z" />
      <path d="M12 9v4.5M12 16.5h.01" strokeWidth="2.2" />
    </svg>
  );
}
