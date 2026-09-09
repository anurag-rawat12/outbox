'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Clock, Send, ChevronDown, Plus, MessageSquare, LogOut } from 'lucide-react';

interface SidebarProps {
  currentTab: 'scheduled' | 'sent';
  onSelectTab: (tab: 'scheduled' | 'sent') => void;
  onComposeClick: () => void;
  scheduledCount: number;
  sentCount: number;
  onSlackConnect: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  onComposeClick,
  scheduledCount,
  sentCount,
  onSlackConnect,
}: SidebarProps) {
  const { data: session } = useSession();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';

  return (
    <aside className="flex w-64 flex-col border-r border-[#eaedf0] bg-white p-4 select-none shrink-0 h-full">
      {/* User Profile Card */}
      <div className="relative mb-4">
        <button
          type="button"
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-[#f3f4f6] transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={userName}
                className="h-8 w-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fce7f3] text-xs font-semibold text-[#be185d] shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#111827]">{userName}</p>
              <p className="truncate text-[11px] text-[#6b7280]">{userEmail}</p>
            </div>
          </div>
          <ChevronDown size={14} className="text-[#9ca3af] shrink-0 ml-1" />
        </button>

        {/* Dropdown Menu */}
        {profileMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-full rounded-xl border border-[#e5e7eb] bg-white p-1 shadow-lg z-20">
            <button
              onClick={() => {
                setProfileMenuOpen(false);
                onSlackConnect();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#374151] hover:bg-[#f3f4f6]"
            >
            <MessageSquare size={14} className="text-[#00a651]" />
              Connect Slack
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-600 hover:bg-red-50"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Compose Button matching Figma */}
      <button
        type="button"
        onClick={onComposeClick}
        className="mb-6 flex w-full items-center justify-center gap-1.5 rounded-full border border-[#00a651] py-2 text-sm font-medium text-[#00a651] transition-all hover:bg-[#00a651] hover:text-white active:scale-[0.99]"
      >
        <span>Compose</span>
      </button>

      {/* CORE Section Label */}
      <div className="mb-2 px-2">
        <span className="text-[10px] font-bold tracking-wider text-[#9ca3af]">CORE</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-col gap-1">
        {/* Scheduled Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('scheduled')}
          className={[
            'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors',
            currentTab === 'scheduled'
              ? 'bg-[#e6f4ea] text-[#00a651] font-semibold'
              : 'text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#111827]',
          ].join(' ')}
        >
          <div className="flex items-center gap-2.5">
            <Clock size={16} className={currentTab === 'scheduled' ? 'text-[#00a651]' : 'text-[#6b7280]'} />
            <span>Scheduled</span>
          </div>
          <span className="text-xs text-[#6b7280]">{scheduledCount}</span>
        </button>

        {/* Sent Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('sent')}
          className={[
            'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors',
            currentTab === 'sent'
              ? 'bg-[#e6f4ea] text-[#00a651] font-semibold'
              : 'text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#111827]',
          ].join(' ')}
        >
          <div className="flex items-center gap-2.5">
            <Send size={16} className={currentTab === 'sent' ? 'text-[#00a651]' : 'text-[#6b7280]'} />
            <span>Sent</span>
          </div>
          <span className="text-xs text-[#6b7280]">{sentCount}</span>
        </button>
      </nav>

      {/* Slack integration shortcut */}
      <div className="mt-auto pt-4 border-t border-[#f0f2f5]">
        <button
          type="button"
          onClick={onSlackConnect}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f4f6f8] px-3 py-2 text-xs font-medium text-[#4b5563] hover:bg-[#eaf4ed] hover:text-[#00a651] transition-colors"
        >
          <MessageSquare size={14} />
          <span>Connect Slack</span>
        </button>
      </div>
    </aside>
  );
}
