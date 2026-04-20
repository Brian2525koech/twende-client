// src/features/passenger/components/SearchBar.tsx
import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search routes or destinations…',
}) => {
  return (
    <div className="search-wrapper relative">
      <div className="search-icon absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 pointer-events-none">
        <Search size={17} strokeWidth={2.5} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full py-3.5 pl-11 pr-10 bg-white dark:bg-[#111816] border border-slate-200 dark:border-white/[0.06] rounded-2xl text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/25 focus:border-[#1D9E75]/50 shadow-sm dark:shadow-none transition-all duration-200"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          <X size={10} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;