'use client';

import Image from 'next/image';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/app/_components/ui/Button';

interface HeaderProps {
  onSlackConnect: () => void;
}

export function Header({ onSlackConnect }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800 bg-[#0f0f12]/90 px-6 backdrop-blur-sm">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
          <Mail size={16} className="text-white" />
        </div>
        <span className="text-base font-semibold tracking-tight">
          ReachInbox
          <span className="ml-1 text-indigo-400">Scheduler</span>
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Slack connect */}
        <Button
          variant="secondary"
          size="sm"
          icon={<MessageSquare size={14} />}
          onClick={onSlackConnect}
        >
          Connect Slack
        </Button>

        {/* User info */}
        {session?.user && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#1a1a24] px-3 py-1.5">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? 'User'}
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                {session.user.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div className="hidden flex-col sm:flex">
              <span className="text-xs font-medium text-zinc-200 leading-none">
                {session.user.name}
              </span>
              <span className="text-[10px] text-zinc-500 mt-0.5">
                {session.user.email}
              </span>
            </div>
          </div>
        )}

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          icon={<LogOut size={14} />}
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
