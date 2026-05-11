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
    <label className="flex min-h-10 w-full items-center gap-2 rounded-2xl border border-woreda-border bg-woreda-surface px-3 text-sm">
      <Search size={16} className="text-woreda-textMuted" aria-hidden />
      <input
        value={value}
        onChange={handleChange}
        placeholder={placeholder || "Search"}
        className="min-w-0 flex-1 bg-transparent font-semibold text-woreda-text outline-none placeholder:text-woreda-textMuted"
      />
    </label>
  );
}

