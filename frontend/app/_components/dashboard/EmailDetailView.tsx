'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Star,
  Trash2,
  MoreVertical,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import type { EmailRow } from '@/app/_types/api';

interface EmailDetailViewProps {
  email: EmailRow;
  onBack: () => void;
}

export function EmailDetailView({ email, onBack }: EmailDetailViewProps) {
  const [starred, setStarred] = useState(false);

  const initial = email.recipient.charAt(0).toUpperCase() || 'U';

  // Derive a display sender address. If recipient looks like an email, use it; otherwise make a slug
  const recipientEmail = email.recipient.includes('@')
    ? email.recipient
    : `${email.recipient.toLowerCase().replace(/\s+/g, '.')}@example.com`;

  const statusColors: Record<string, string> = {
    sent: 'bg-[#dcfce7] text-[#16a34a]',
    failed: 'bg-[#fee2e2] text-[#dc2626]',
    processing: 'bg-[#dbeafe] text-[#2563eb]',
    scheduled: 'bg-[#fef3c7] text-[#d97706]',
  };

  return (
    <div className="flex flex-1 flex-col bg-white px-8 py-6 select-none overflow-y-auto">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between border-b border-[#eaedf0] pb-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1 text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-sm font-semibold text-[#111827] truncate">
            {email.subject}
          </h2>

          {/* Status badge */}
          <span
            className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              statusColors[email.status] || 'bg-[#f3f4f6] text-[#6b7280]'
            }`}
          >
            {email.status}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2 text-[#6b7280]">
          <button
            type="button"
            onClick={() => setStarred((s) => !s)}
            className="p-1.5 hover:text-amber-400 transition-colors"
          >
            <Star
              size={16}
              className={starred ? 'fill-amber-400 text-amber-400' : ''}
            />
          </button>
          <button
            type="button"
            className="p-1.5 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            className="p-1.5 hover:text-[#111827] transition-colors"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* ── Sender Row ── */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a651] text-xs font-bold text-white shrink-0">
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#111827]">
                {email.recipient}
              </span>
              <span className="text-[11px] text-[#9ca3af]">
                &lt;{recipientEmail}&gt;
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#6b7280] mt-0.5">
              <span>to me</span>
              <ChevronDown size={12} className="text-[#9ca3af]" />
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          {email.sentAt ? (
            <span className="text-xs text-[#9ca3af]">
              {format(new Date(email.sentAt), 'MMM d, h:mm aa')}
            </span>
          ) : (
            <span className="text-xs text-[#9ca3af]">
              Scheduled for {format(new Date(email.scheduledAt), 'MMM d, h:mm aa')}
            </span>
          )}
        </div>
      </div>

      {/* ── Email Body ── */}
      <div className="flex flex-col gap-4 text-xs text-[#374151] leading-relaxed max-w-3xl bg-[#f9fafb] rounded-2xl p-6 border border-[#f0f2f5]">
        <div
          className="whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: email.body.replace(/\n/g, '<br/>') }}
        />
      </div>

      {/* ── Metadata ── */}
      <div className="mt-6 flex flex-col gap-2 text-[11px] text-[#9ca3af] max-w-3xl">
        <div className="flex items-center gap-2">
          <span className="text-[#c4c8ce]">Job ID:</span>
          <span className="font-mono text-[#6b7280]">{email.id}</span>
        </div>
        {email.scheduledAt && (
          <div className="flex items-center gap-2">
            <span className="text-[#c4c8ce]">Scheduled:</span>
            <span className="text-[#6b7280]">
              {format(new Date(email.scheduledAt), 'PPpp')}
            </span>
          </div>
        )}
        {email.sentAt && (
          <div className="flex items-center gap-2">
            <span className="text-[#c4c8ce]">Sent:</span>
            <span className="text-[#6b7280]">
              {format(new Date(email.sentAt), 'PPpp')}
            </span>
          </div>
        )}
      </div>

      {/* ── Ethereal Preview URL (when available) ── */}
      {email.previewUrl && (
        <div className="mt-4 max-w-3xl rounded-xl border border-[#d1fae5] bg-[#ecfdf5] p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">📬</span>
            <div>
              <p className="text-xs font-semibold text-[#065f46]">
                Email captured by Ethereal fake SMTP
              </p>
              <p className="text-[11px] text-[#047857] mt-0.5">
                Your email was intercepted by the Ethereal test mail server (not actually delivered to the inbox). You can preview it at the link below:
              </p>
              <a
                href={email.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#00a651] hover:underline"
              >
                <ExternalLink size={12} />
                View in Ethereal →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── If no previewUrl and status is sent, explain Ethereal ── */}
      {!email.previewUrl && email.status === 'sent' && (
        <div className="mt-4 max-w-3xl rounded-xl border border-[#fef9c3] bg-[#fefce8] p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">ℹ️</span>
            <div>
              <p className="text-xs font-semibold text-[#854d0e]">
                Why didn&apos;t I receive the email?
              </p>
              <p className="text-[11px] text-[#92400e] mt-1 leading-relaxed">
                The system uses <strong>Ethereal fake SMTP</strong> — emails are captured for testing but not actually delivered to real inboxes. To send real emails, configure <code className="bg-amber-100 px-1 rounded">SMTP_HOST</code>, <code className="bg-amber-100 px-1 rounded">SMTP_USER</code>, and <code className="bg-amber-100 px-1 rounded">SMTP_PASS</code> in <code className="bg-amber-100 px-1 rounded">backend/.env</code> (e.g. Gmail App Password).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
