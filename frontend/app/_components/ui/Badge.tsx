import type { EmailStatus } from '@/app/_types/api';

const config: Record<
  EmailStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  scheduled: {
    label: 'Scheduled',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  processing: {
    label: 'Processing',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  sent: {
    label: 'Sent',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  failed: {
    label: 'Failed',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    dot: 'bg-red-400',
  },
};

export function Badge({ status }: { status: EmailStatus }) {
  const { label, bg, text, dot } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
