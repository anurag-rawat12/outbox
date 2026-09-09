'use client';

import { useState, useRef } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  X,
  Undo2,
  Redo2,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  ChevronsUpDown,
  ListOrdered,
  List,
  Indent,
  Outdent,
  Quote,
  Link2,
  Strikethrough,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SendLaterModal } from './SendLaterModal';
import { scheduleEmails } from '@/app/_lib/api';

interface ComposeViewProps {
  onBack: () => void;
  senderEmail?: string;
  onSuccess: () => void;
}

export function ComposeView({
  onBack,
  senderEmail = 'sender@reachinbox.ai',
  onSuccess,
}: ComposeViewProps) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState('0');
  const [hourlyLimit, setHourlyLimit] = useState('0');
  const [sendLaterOpen, setSendLaterOpen] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttachment, setHasAttachment] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function addRecipient(emailStr: string) {
    const clean = emailStr.trim().toLowerCase();
    if (clean && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) && !recipients.includes(clean)) {
      setRecipients((prev) => [...prev, clean]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient(currentInput);
      setCurrentInput('');
    } else if (e.key === 'Backspace' && !currentInput && recipients.length > 0) {
      setRecipients((prev) => prev.slice(0, -1));
    }
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emails = text
        .split(/[\n,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));

      if (emails.length > 0) {
        setRecipients((prev) => Array.from(new Set([...prev, ...emails])));
        toast.success(`Loaded ${emails.length} recipients from ${file.name}`);
      } else {
        toast.error('No valid email addresses found in file');
      }
    };
    reader.readAsText(file);
  }

  function removeRecipient(email: string) {
    setRecipients((prev) => prev.filter((r) => r !== email));
  }

  async function handleSend() {
    // Include currentInput if valid
    const allRecipients = [...recipients];
    if (currentInput.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentInput.trim())) {
      allRecipients.push(currentInput.trim().toLowerCase());
    }

    if (allRecipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    if (!body.trim()) {
      toast.error('Please enter an email body');
      return;
    }

    setIsSubmitting(true);
    try {
      const startTime = scheduledTime || new Date().toISOString();

      await scheduleEmails({
        subject: subject.trim(),
        body: body.trim(),
        recipients: allRecipients,
        startTime,
        delaySeconds: Number(delaySeconds) || 0,
        hourlyLimit: Number(hourlyLimit) || 100,
      });

      toast.success(
        scheduledTime
          ? `Scheduled ${allRecipients.length} email(s) successfully!`
          : `Sent ${allRecipients.length} email(s) successfully!`
      );
      onSuccess();
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule email');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-white px-8 py-6 select-none overflow-y-auto">
      {/* Top Header matching Figma Screenshots 3, 4, 6 */}
      <div className="flex items-center justify-between border-b border-[#eaedf0] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1 text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-base font-semibold text-[#111827]">
            Compose New Email
          </h2>
        </div>

        {/* Action icons & Send Later button */}
        <div className="flex items-center gap-4">
          {/* Attachment icon */}
          <button
            type="button"
            onClick={() => setHasAttachment(!hasAttachment)}
            title="Attach file"
            className="relative p-1 text-[#6b7280] hover:text-[#111827] transition-colors"
          >
            <Paperclip size={18} />
            {hasAttachment && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#00a651] text-[9px] font-bold text-white">
                1
              </span>
            )}
          </button>

          {/* Clock icon for Send Later */}
          <button
            type="button"
            onClick={() => setSendLaterOpen(true)}
            title="Schedule email"
            className={[
              'p-1 transition-colors',
              scheduledTime ? 'text-[#00a651]' : 'text-[#6b7280] hover:text-[#111827]',
            ].join(' ')}
          >
            <Clock size={18} />
          </button>

          {/* Send / Send Later button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={isSubmitting}
            className="flex items-center justify-center rounded-full border border-[#00a651] px-5 py-1.5 text-xs font-medium text-[#00a651] transition-all hover:bg-[#00a651] hover:text-white disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : scheduledTime ? (
              'Send Later'
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="flex flex-col gap-4 max-w-4xl">
        {/* From row */}
        <div className="flex items-center gap-4 text-xs">
          <span className="w-20 text-[#6b7280] font-normal">From</span>
          <div className="flex items-center gap-1.5 rounded-lg bg-[#f0f2f5] px-3 py-1.5 text-xs text-[#374151]">
            <span>{senderEmail}</span>
            <ChevronDown size={12} className="text-[#9ca3af]" />
          </div>
        </div>

        {/* To row matching Screenshot 6 */}
        <div className="flex items-center gap-4 text-xs">
          <span className="w-20 text-[#6b7280] font-normal">To</span>
          <div className="flex flex-1 items-center flex-wrap gap-2 border-b border-[#f0f2f5] pb-2">
            {/* Recipient Chips */}
            {recipients.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1 rounded-full border border-[#00a651] bg-[#e6f4ea] px-3 py-0.5 text-xs font-medium text-[#00a651]"
              >
                <span>{r}</span>
                <button
                  type="button"
                  onClick={() => removeRecipient(r)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            <input
              type="email"
              placeholder={recipients.length === 0 ? 'recipient@example.com' : 'Add another...'}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-[200px] outline-none text-xs text-[#111827] placeholder:text-[#9ca3af] bg-transparent py-1"
            />

            {/* Upload List Action matching Screenshot 4 & 6 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-[#00a651] hover:underline"
            >
              <Upload size={13} />
              <span>Upload List</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleCsvUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Subject row */}
        <div className="flex items-center gap-4 text-xs">
          <span className="w-20 text-[#6b7280] font-normal">Subject</span>
          <div className="flex-1 border-b border-[#f0f2f5] pb-2">
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full outline-none text-xs text-[#111827] placeholder:text-[#9ca3af] bg-transparent py-1 font-medium"
            />
          </div>
        </div>

        {/* Delays & Rate Limit Row matching Figma Screenshot 4 */}
        <div className="flex items-center gap-8 text-xs py-1">
          <div className="flex items-center gap-3">
            <span className="text-[#6b7280]">Delay between 2 emails</span>
            <input
              type="number"
              min={0}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(e.target.value)}
              className="h-8 w-16 rounded-xl border border-[#e5e7eb] bg-[#fcfcfd] px-2.5 text-center text-xs text-[#111827] outline-none focus:border-[#00a651]"
              placeholder="00"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#6b7280]">Hourly Limit</span>
            <input
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
              className="h-8 w-16 rounded-xl border border-[#e5e7eb] bg-[#fcfcfd] px-2.5 text-center text-xs text-[#111827] outline-none focus:border-[#00a651]"
              placeholder="00"
            />
          </div>
        </div>

        {/* Rich Text Reply Editor matching Figma Screenshots 3, 4, 6 */}
        <div className="mt-2 flex flex-col rounded-2xl bg-[#fafbfc] border border-[#f0f2f5] p-5 shadow-sm">
          <textarea
            rows={10}
            placeholder="Type Your Reply..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full bg-transparent text-xs text-[#111827] placeholder:text-[#9ca3af] outline-none resize-none leading-relaxed"
          />

          {/* Formatting Toolbar */}
          <div className="mt-4 flex items-center justify-between border-t border-[#f0f2f5] pt-3 text-[#6b7280]">
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" className="hover:text-[#111827]"><Undo2 size={14} /></button>
              <button type="button" className="hover:text-[#111827]"><Redo2 size={14} /></button>
              <div className="h-3 w-[1px] bg-[#e5e7eb] mx-1" />
              <button type="button" className="flex items-center gap-0.5 hover:text-[#111827] text-xs font-serif font-bold">
                Tt <ChevronDown size={10} />
              </button>
              <button type="button" className="hover:text-[#111827]"><Bold size={14} /></button>
              <button type="button" className="hover:text-[#111827]"><Italic size={14} /></button>
              <button type="button" className="hover:text-[#111827]"><Underline size={14} /></button>
              <div className="h-3 w-[1px] bg-[#e5e7eb] mx-1" />
              <button type="button" className="hover:text-[#111827]"><AlignLeft size={14} /></button>
              <button type="button" className="hover:text-[#111827]"><ChevronsUpDown size={14} /></button>
              <button type="button" className="hover:text-[#111827]"><ListOrdered size={14} /></button>
              <button type="button" className="hover:text-[#111827]"><List size={14} /></button>
              <button type="button" className="hover:text-[#111827]"><Outdent size={14} /></button>
              <button type="button" className="hover:text-[#111827]"><Indent size={14} /></button>
              <button type="button" className="hover:text-[#111827]"><Quote size={14} /></button>
              <button type="button" className="hover:text-[#111827]"><Link2 size={14} /></button>
              <button type="button" className="hover:text-[#111827]"><Strikethrough size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Send Later Modal Popover */}
      <SendLaterModal
        open={sendLaterOpen}
        onClose={() => setSendLaterOpen(false)}
        onSelectTime={(iso) => setScheduledTime(iso)}
      />
    </div>
  );
}
