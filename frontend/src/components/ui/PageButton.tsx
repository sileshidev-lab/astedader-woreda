import type { ReactNode } from "react";

type PageButtonProps = {
  children: ReactNode;
  variant?: "primary" | "default" | "danger";
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
  const variants = {
    primary:
      "border-woreda-primary bg-woreda-primary text-white hover:bg-woreda-primaryStrong",
    default:
      "border-woreda-border bg-woreda-surface text-woreda-primary hover:border-woreda-primary hover:bg-woreda-primarySoft",
    danger:
      "border-woreda-danger bg-woreda-surface text-woreda-danger hover:bg-woreda-dangerBg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "aw-btn inline-flex min-h-10 items-center justify-center gap-2 border px-4 py-2 text-xs font-black uppercase tracking-[0.04em] leading-none transition",
        "focus:outline-none focus:ring-1 focus:ring-woreda-primary",
        "disabled:cursor-not-allowed disabled:border-woreda-border disabled:bg-woreda-surfaceContainer disabled:text-woreda-textMuted disabled:opacity-60",
        variants[variant],
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
