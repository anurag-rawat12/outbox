'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { TopNavbar } from './TopNavbar';
import { Sidebar } from './Sidebar';
import { EmailListView } from './EmailListView';
import { ComposeView } from './ComposeView';
import { EmailDetailView } from './EmailDetailView';
import { getEmails } from '@/app/_lib/api';
import type { EmailRow } from '@/app/_types/api';

type Tab = 'scheduled' | 'sent';
type ViewState = 'list' | 'compose' | 'detail';

export function DashboardClient() {
  const { data: session } = useSession();

  const [currentTab, setCurrentTab] = useState<Tab>('scheduled');
  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedEmail, setSelectedEmail] = useState<EmailRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [scheduledEmails, setScheduledEmails] = useState<EmailRow[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const [sch, sent] = await Promise.allSettled([
        getEmails('scheduled', searchQuery),
        getEmails('sent', searchQuery),
      ]);

      if (sch.status === 'fulfilled') {
        setScheduledEmails(sch.value);
      } else {
        setScheduledEmails([]);
      }

      if (sent.status === 'fulfilled') {
        setSentEmails(sent.value);
      } else {
        setSentEmails([]);
      }
    } catch {
      setScheduledEmails([]);
      setSentEmails([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('slack') === 'connected') {
        toast.success('Slack connected successfully!', { icon: '🎉' });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('slack') === 'error') {
        toast.error('Failed to connect Slack.');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Search filtering
  const displayedEmails = useMemo(() => {
    const list = currentTab === 'scheduled' ? scheduledEmails : sentEmails;
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(
      (e) =>
        e.recipient.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q)
    );
  }, [currentTab, scheduledEmails, sentEmails, searchQuery]);

  function handleSlackConnect() {
    const slackUrl = process.env.NEXT_PUBLIC_SLACK_OAUTH_URL || 'http://localhost:4000/auth/slack';
    toast('Redirecting to Slack authorization...', { icon: '💬' });
    window.open(slackUrl, '_blank');
  }

  function handleSelectTab(tab: Tab) {
    setCurrentTab(tab);
    setViewState('list');
    setSelectedEmail(null);
  }

  function handleOpenEmail(email: EmailRow) {
    setSelectedEmail(email);
    setViewState('detail');
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-[#111827]">
      {/* Top Navbar matching Figma */}
      <TopNavbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={fetchEmails}
        loading={loading}
      />

      {/* Main Container: Sidebar + Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          onComposeClick={() => {
            setSelectedEmail(null);
            setViewState('compose');
          }}
          scheduledCount={scheduledEmails.length}
          sentCount={sentEmails.length}
          onSlackConnect={handleSlackConnect}
        />

        {/* Dynamic Center Stage */}
        <main className="flex flex-1 flex-col overflow-hidden bg-white">
          {viewState === 'compose' ? (
            <ComposeView
              onBack={() => setViewState('list')}
              senderEmail={session?.user?.email || 'sender@reachinbox.ai'}
              onSuccess={fetchEmails}
            />
          ) : viewState === 'detail' && selectedEmail ? (
            <EmailDetailView
              email={selectedEmail}
              onBack={() => setViewState('list')}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <EmailListView
                emails={displayedEmails}
                currentTab={currentTab}
                loading={loading}
                onSelectEmail={handleOpenEmail}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
