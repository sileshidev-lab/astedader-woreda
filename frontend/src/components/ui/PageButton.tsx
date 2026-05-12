import type { ReactNode } from "react";

type PageButtonProps = {
  children: ReactNode;
  variant?: "primary" | "default" | "danger" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
};

export function PageButton({
  children,
  variant = "default",
  onClick,
  type = "button",
  disabled,
  className = "",
}: PageButtonProps) {
  const variants: Record<NonNullable<PageButtonProps["variant"]>, string> = {
    primary:
      "border-[var(--aw-primary)] bg-[var(--aw-primary)] text-white hover:bg-[var(--aw-primary-dark)] hover:border-[var(--aw-primary-dark)]",
    default:
      "border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:bg-[var(--aw-primary-softer)] hover:text-[var(--aw-primary)]",
    danger:
      "border-[var(--aw-danger)] bg-[var(--aw-surface)] text-[var(--aw-danger)] hover:bg-[var(--aw-danger-bg)]",
    ghost:
      "border-transparent bg-transparent text-[var(--aw-text)] hover:bg-[var(--aw-surface-muted)]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold leading-none transition",
        "focus:outline-none focus-visible:shadow-focus",
        "disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
