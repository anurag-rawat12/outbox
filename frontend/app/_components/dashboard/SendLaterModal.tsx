'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';

interface SendLaterModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTime: (isoDate: string) => void;
  currentTime?: string;
}

export function SendLaterModal({
  open,
  onClose,
  onSelectTime,
  currentTime,
}: SendLaterModalProps) {
  const [customDate, setCustomDate] = useState(
    currentTime || new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );

  if (!open) return null;

  function getTomorrowAt(hours: number, minutes: number = 0) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  }

  const quickOptions = [
    { label: 'Tomorrow', value: getTomorrowAt(9, 0) },
    { label: 'Tomorrow, 10:00 AM', value: getTomorrowAt(10, 0) },
    { label: 'Tomorrow, 11:00 AM', value: getTomorrowAt(11, 0) },
    { label: 'Tomorrow, 3:00 PM', value: getTomorrowAt(15, 0) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-6 pt-16 bg-black/10 backdrop-blur-[1px]">
      <div className="w-80 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Title */}
        <h3 className="mb-4 text-sm font-semibold text-[#111827]">Send Later</h3>

        {/* Date & Time Picker */}
        <div className="relative mb-4">
          <input
            type="datetime-local"
            value={customDate}
            min={new Date().toISOString().slice(0, 16)}
            onChange={(e) => setCustomDate(e.target.value)}
            className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-xs text-[#111827] outline-none focus:border-[#00a651] focus:ring-1 focus:ring-[#00a651]"
          />
        </div>

        {/* Quick Selections */}
        <div className="mb-6 flex flex-col divide-y divide-[#f3f4f6] text-xs">
          {quickOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                setCustomDate(new Date(opt.value).toISOString().slice(0, 16));
              }}
              className="py-2.5 text-left text-[#4b5563] hover:text-[#00a651] transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Actions matching Screenshot 3 */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-[#6b7280] hover:text-[#111827]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectTime(new Date(customDate).toISOString());
              onClose();
            }}
            className="rounded-full border border-[#00a651] px-5 py-1 text-xs font-medium text-[#00a651] transition-all hover:bg-[#00a651] hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
