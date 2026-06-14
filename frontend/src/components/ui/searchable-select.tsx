'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Search and select',
  emptyText = 'No matches found',
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = normalizedQuery
      ? options.filter((option) => option.toLowerCase().includes(normalizedQuery))
      : options;

    return base.slice(0, 12);
  }, [options, query]);

  const selectOption = (option: string) => {
    onChange(option);
    setQuery(option);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className={`flex items-center rounded-xl border px-3 py-2.5 transition ${
        open
          ? 'border-blue-500 bg-white shadow-lg shadow-blue-500/10 ring-4 ring-blue-500/10 dark:border-blue-400 dark:bg-slate-950 dark:ring-blue-400/10'
          : 'border-slate-200/80 bg-white/90 dark:border-slate-700 dark:bg-slate-950/85'
      } ${disabled ? 'opacity-60' : ''}`}>
        <Search className="mr-2 h-4 w-4 flex-shrink-0 text-slate-400" />
        <input
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setQuery(value);
              setOpen(false);
            }, 120);
          }}
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <ChevronDown className={`ml-2 h-4 w-4 flex-shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/98 shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/98 dark:shadow-black/30">
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const selected = option === value;

                return (
                  <button
                    key={option}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      selected
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{option}</span>
                    {selected && <Check className="h-4 w-4 flex-shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">{emptyText}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
