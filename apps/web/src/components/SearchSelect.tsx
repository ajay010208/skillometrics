import { useEffect, useRef, useState } from "react";

interface Option {
  label: string;
  sub?: string[];
}

/**
 * Searchable dropdown with type-ahead: typing "gu" surfaces "Gujarat",
 * arrow keys + Enter select, and district options update with the state.
 */
export function SearchSelect({
  value,
  onSelect,
  getOptions,
  placeholder,
  emptyText = "No matches",
}: {
  value: string;
  onSelect: (v: string) => void;
  getOptions: (query: string) => Option[] | Promise<Option[]>;
  placeholder: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [options, setOptions] = useState<Option[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  // Support sync or async option sources.
  useEffect(() => {
    let cancelled = false;
    const result = getOptions(query);
    if (Array.isArray(result)) {
      setOptions(result);
    } else {
      result.then((opts) => {
        if (!cancelled) setOptions(opts);
      }).catch(() => {
        if (!cancelled) setOptions([]);
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (v: string) => {
    onSelect(v);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        className="glass-input w-full"
        placeholder={value || placeholder}
        value={open ? query : ""}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHighlight(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && options[highlight]) {
            e.preventDefault();
            pick(options[highlight].label);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {!open && value && (
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-900">
          {value}
        </div>
      )}
      {open && (
        <div className="glass absolute z-30 mt-2 max-h-60 w-full overflow-y-auto !rounded-xl p-1">
          {options.length === 0 && <div className="px-3 py-3 text-sm text-slate-500">{emptyText}</div>}
          {options.map((o, i) => (
            <button
              key={o.label}
              type="button"
              onClick={() => pick(o.label)}
              onMouseEnter={() => setHighlight(i)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                i === highlight ? "bg-amber-500/15 text-slate-900" : "text-slate-600 hover:bg-slate-900/5"
              }`}
            >
              <span className="font-semibold">{o.label}</span>
              {o.sub && o.sub.length > 0 && (
                <span className="ml-3 truncate text-[10px] text-slate-500">{o.sub.slice(0, 3).join(" · ")}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
