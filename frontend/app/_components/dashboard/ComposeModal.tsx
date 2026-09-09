'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, X } from 'lucide-react';
import { Modal } from '@/app/_components/ui/Modal';
import { Button } from '@/app/_components/ui/Button';
import { Input, Textarea } from '@/app/_components/ui/Input';
import { scheduleEmails } from '@/app/_lib/api';

interface ComposeModalProps {
  open: boolean;
  onClose: () => void;
  onScheduled?: () => void;
}

interface FormState {
  subject: string;
  body: string;
  recipientText: string;
  startTime: string;
  delaySeconds: string;
  hourlyLimit: string;
}

const INITIAL: FormState = {
  subject: '',
  body: '',
  recipientText: '',
  startTime: '',
  delaySeconds: '5',
  hourlyLimit: '100',
};

/** Parse emails from CSV/plain text content */
function parseEmails(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

export function ComposeModal({ open, onClose, onScheduled }: ComposeModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const detectedEmails = parseEmails(form.recipientText);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      set('recipientText', text);
    };
    reader.readAsText(file);
  }

  function validate(): boolean {
    const newErrors: Partial<FormState> = {};
    if (!form.subject.trim()) newErrors.subject = 'Subject is required';
    if (!form.body.trim()) newErrors.body = 'Body is required';
    if (detectedEmails.length === 0)
      newErrors.recipientText = 'At least one valid email address is required';
    if (!form.startTime) newErrors.startTime = 'Start time is required';
    if (!form.delaySeconds || Number(form.delaySeconds) < 1)
      newErrors.delaySeconds = 'Delay must be ≥ 1 second';
    if (!form.hourlyLimit || Number(form.hourlyLimit) < 1)
      newErrors.hourlyLimit = 'Hourly limit must be ≥ 1';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await scheduleEmails({
        subject: form.subject,
        body: form.body,
        recipients: detectedEmails,
        startTime: new Date(form.startTime).toISOString(),
        delaySeconds: Number(form.delaySeconds),
        hourlyLimit: Number(form.hourlyLimit),
      });
      toast.success(`${result.scheduled} email(s) scheduled successfully`);
      setForm(INITIAL);
      setFileName(null);
      onScheduled?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule emails');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setForm(INITIAL);
      setErrors({});
      setFileName(null);
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Compose New Email" maxWidth="max-w-2xl">
      <div className="flex flex-col gap-5">
        {/* Subject */}
        <Input
          label="Subject"
          placeholder="Enter email subject"
          value={form.subject}
          onChange={(e) => set('subject', e.target.value)}
          error={errors.subject}
        />

        {/* Body */}
        <Textarea
          label="Body"
          placeholder="Write your email body here…"
          rows={5}
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          error={errors.body}
        />

        {/* Recipients */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Recipients</label>
          <Textarea
            placeholder="Paste email addresses separated by commas, semicolons, or newlines…"
            rows={3}
            value={form.recipientText}
            onChange={(e) => set('recipientText', e.target.value)}
            error={errors.recipientText}
          />

          {/* File upload */}
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-4 py-2 text-xs text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
            >
              <Upload size={13} />
              Upload CSV / text file
            </button>
            {fileName && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                {fileName}
                <button
                  onClick={() => {
                    setFileName(null);
                    set('recipientText', '');
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                  className="text-zinc-600 hover:text-zinc-400"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            {detectedEmails.length > 0 && (
              <span className="ml-auto text-xs font-medium text-emerald-400">
                {detectedEmails.length} email{detectedEmails.length > 1 ? 's' : ''} detected
              </span>
            )}
          </div>
        </div>

        {/* Scheduling options */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Input
              label="Start time"
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => set('startTime', e.target.value)}
              error={errors.startTime}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          <Input
            label="Delay between sends (seconds)"
            type="number"
            min={1}
            value={form.delaySeconds}
            onChange={(e) => set('delaySeconds', e.target.value)}
            error={errors.delaySeconds}
          />
          <Input
            label="Hourly limit"
            type="number"
            min={1}
            value={form.hourlyLimit}
            onChange={(e) => set('hourlyLimit', e.target.value)}
            error={errors.hourlyLimit}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-4 mt-1">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Schedule {detectedEmails.length > 0 ? `(${detectedEmails.length})` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
