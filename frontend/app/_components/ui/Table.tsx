import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  keyExtractor: (row: T) => string;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-zinc-800/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded-md bg-zinc-800 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export function Table<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No results found.',
  emptyIcon,
  keyExtractor,
}: TableProps<T>) {
  return (
    <div className="overflow-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-[#1a1a24]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500',
                  col.className ?? '',
                ].join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-600">
                  {emptyIcon && <div className="text-zinc-700">{emptyIcon}</div>}
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="border-b border-zinc-800/60 hover:bg-[#1a1a24] transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={[
                      'px-4 py-3 text-zinc-300',
                      col.className ?? '',
                    ].join(' ')}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
