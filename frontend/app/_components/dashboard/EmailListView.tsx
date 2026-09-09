'use client';

import { useState } from 'react';
import { Clock, Star } from 'lucide-react';
import { format } from 'date-fns';
import type { EmailRow } from '@/app/_types/api';

interface EmailListViewProps {
  emails: EmailRow[];
  currentTab: 'scheduled' | 'sent';
  loading: boolean;
  onSelectEmail: (email: EmailRow) => void;
}

export function EmailListView({
  emails,
  currentTab,
  loading,
  onSelectEmail,
}: EmailListViewProps) {
  const [starred, setStarred] = useState<Record<string, boolean>>({});

  function toggleStar(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setStarred((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function formatScheduledDate(dateString: string) {
    try {
      const d = new Date(dateString);
      return format(d, 'EEE h:mm:ss a');
    } catch {
      return dateString;
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col divide-y divide-[#f0f2f5] p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3.5 px-4 animate-pulse">
            <div className="h-4 w-32 rounded bg-[#e5e7eb]" />
            <div className="h-5 w-28 rounded-full bg-[#f3f4f6]" />
            <div className="h-4 flex-1 rounded bg-[#f3f4f6]" />
            <div className="h-4 w-4 rounded-full bg-[#e5e7eb]" />
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-[#4b5563]">
          No {currentTab} emails found.
        </p>
        <p className="text-xs text-[#9ca3af] mt-1">
          {currentTab === 'scheduled'
            ? 'Compose an email and choose Send Later to schedule.'
            : 'Sent emails will appear here once delivered.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-[#f0f2f5] select-none">
      {emails.map((email) => {
        const isStarred = !!starred[email.id];

        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email)}
            className="group flex items-center gap-4 py-3 px-6 hover:bg-[#fafbfc] transition-colors cursor-pointer"
          >
            {/* Recipient */}
            <div className="w-44 shrink-0 truncate">
              <span className="text-xs font-semibold text-[#111827]">
                To: {email.recipient}
              </span>
            </div>

            {/* Status / Scheduled Time Badge */}
            <div className="shrink-0">
              {currentTab === 'scheduled' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fde68a] bg-[#fff7ed] px-3 py-0.5 text-[11px] font-medium text-[#c2410c]">
                  <Clock size={11} className="text-[#ea580c]" />
                  <span>{formatScheduledDate(email.scheduledAt)}</span>
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-[#f0f2f5] px-3 py-0.5 text-[11px] font-medium text-[#4b5563]">
                  Sent
                </span>
              )}
            </div>

            {/* Subject and Snippet */}
            <div className="flex flex-1 items-center gap-1.5 min-w-0 text-xs">
              <span className="font-semibold text-[#111827] truncate">
                {email.subject}
              </span>
              <span className="text-[#9ca3af]">-</span>
              <span className="text-[#6b7280] truncate font-normal">
                {email.body.replace(/\n/g, ' ')}
              </span>
            </div>

            {/* Star Action */}
            <button
              type="button"
              onClick={(e) => toggleStar(email.id, e)}
              className="p-1 text-[#9ca3af] hover:text-amber-500 transition-colors shrink-0"
            >
              <Star
                size={15}
                className={isStarred ? 'fill-amber-400 text-amber-400' : ''}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
