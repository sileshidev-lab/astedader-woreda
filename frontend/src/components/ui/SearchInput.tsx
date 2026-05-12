import { Search } from "lucide-react";
import type { ChangeEvent } from "react";

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <label
      className="flex min-h-10 w-full items-center gap-2 rounded-md border border-[var(--aw-border)] bg-[var(--aw-surface)] px-3 text-sm transition focus-within:border-[var(--aw-primary)] focus-within:shadow-focus"
    >
      <Search size={16} className="text-[var(--aw-muted)]" aria-hidden />
      <input
        value={value}
        onChange={handleChange}
        placeholder={placeholder || "Search"}
        className="min-w-0 flex-1 bg-transparent font-medium text-[var(--aw-text)] outline-none placeholder:text-[var(--aw-muted)]"
      />
    </label>
  );
}
