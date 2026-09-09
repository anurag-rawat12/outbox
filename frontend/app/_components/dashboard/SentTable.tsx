'use client';

import { format } from 'date-fns';
import { CheckCircle2, SendIcon } from 'lucide-react';
import { Badge } from '@/app/_components/ui/Badge';
import { Table, type Column } from '@/app/_components/ui/Table';
import type { EmailRow } from '@/app/_types/api';

interface SentTableProps {
  data: EmailRow[];
  loading: boolean;
}

const columns: Column<EmailRow>[] = [
  {
    key: 'recipient',
    header: 'Recipient',
    render: (row) => (
      <span className="font-medium text-zinc-200">{row.recipient}</span>
    ),
  },
  {
    key: 'subject',
    header: 'Subject',
    render: (row) => (
      <span className="max-w-xs truncate block text-zinc-300">{row.subject}</span>
    ),
  },
  {
    key: 'sentAt',
    header: 'Sent At',
    render: (row) =>
      row.sentAt ? (
        <span className="inline-flex items-center gap-1.5 text-zinc-400">
          <CheckCircle2 size={13} className="text-emerald-500" />
          {format(new Date(row.sentAt), 'MMM d, yyyy · HH:mm')}
        </span>
      ) : (
        <span className="text-zinc-600">—</span>
      ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge status={row.status} />,
    className: 'w-32',
  },
];

export function SentTable({ data, loading }: SentTableProps) {
  return (
    <Table
      columns={columns}
      data={data}
      loading={loading}
      keyExtractor={(row) => row.id}
      emptyMessage="No sent emails yet."
      emptyIcon={<SendIcon size={40} />}
    />
  );
}
