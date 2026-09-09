'use client';

import { format } from 'date-fns';
import { Calendar, InboxIcon } from 'lucide-react';
import { Badge } from '@/app/_components/ui/Badge';
import { Table, type Column } from '@/app/_components/ui/Table';
import type { EmailRow } from '@/app/_types/api';

interface ScheduledTableProps {
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
    key: 'scheduledAt',
    header: 'Scheduled At',
    render: (row) => (
      <span className="inline-flex items-center gap-1.5 text-zinc-400">
        <Calendar size={13} className="text-zinc-600" />
        {format(new Date(row.scheduledAt), 'MMM d, yyyy · HH:mm')}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge status={row.status} />,
    className: 'w-32',
  },
];

export function ScheduledTable({ data, loading }: ScheduledTableProps) {
  return (
    <Table
      columns={columns}
      data={data}
      loading={loading}
      keyExtractor={(row) => row.id}
      emptyMessage="No scheduled emails yet. Compose a new email to get started."
      emptyIcon={<InboxIcon size={40} />}
    />
  );
}
