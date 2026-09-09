'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Header } from '@/app/_components/layout/Header';

const SLACK_OAUTH_URL = process.env.NEXT_PUBLIC_SLACK_OAUTH_URL ?? '#';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [slackLoading, setSlackLoading] = useState(false);

  function handleSlackConnect() {
    if (SLACK_OAUTH_URL === '#') {
      toast('Slack OAuth URL not configured', { icon: '⚠️' });
      return;
    }
    setSlackLoading(true);
    window.location.href = SLACK_OAUTH_URL;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header onSlackConnect={handleSlackConnect} />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
