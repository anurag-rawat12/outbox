'use client';

import { Search, Filter, RotateCw } from 'lucide-react';

interface TopNavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function TopNavbar({
  searchQuery,
  onSearchChange,
  onRefresh,
  loading = false,
}: TopNavbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#eaedf0] bg-white px-6">
      {/* Brand / Logo (ONG in bold geometric block font as shown in Figma) */}
      <div className="flex items-center w-60 shrink-0">
        <span className="font-extrabold text-2xl tracking-tight text-[#111827] font-mono select-none">
          ONG
        </span>
      </div>

      {/* Search and Action Bar matching Figma layout */}
      <div className="flex flex-1 items-center justify-between max-w-4xl">
        <div className="relative w-full max-w-lg">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]"
          />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-full rounded-xl bg-[#f2f4f6] pl-9 pr-4 text-xs text-[#111827] placeholder:text-[#9ca3af] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#00a651]/20 focus:border-[#00a651] border border-transparent"
          />
        </div>

        {/* Filter & Refresh Controls */}
        <div className="flex items-center gap-2 ml-4">
          <button
            type="button"
            title="Filter"
            className="rounded-lg p-1.5 text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors"
          >
            <Filter size={16} />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh"
            disabled={loading}
            className="rounded-lg p-1.5 text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors disabled:opacity-50"
          >
            <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </header>
  );
}
