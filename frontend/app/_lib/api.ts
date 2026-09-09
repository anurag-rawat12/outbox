import type {
  EmailRow,
  EmailsResponse,
  EmailStatus,
  SchedulePayload,
  ScheduleResponse,
} from '@/app/_types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ─── Helper ───────────────────────────────────────────────────────────────────
async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? `HTTP ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

// ─── Schedule a batch of emails ───────────────────────────────────────────────
export async function scheduleEmails(
  payload: SchedulePayload,
): Promise<ScheduleResponse> {
  return request<ScheduleResponse>('/schedule', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Fetch email list by status ───────────────────────────────────────────────
export async function getEmails(
  status: EmailStatus,
  search?: string,
): Promise<EmailRow[]> {
  try {
    const params = new URLSearchParams({ status });
    if (search) params.set('search', search);
    const data = await request<EmailsResponse>(`/emails?${params}`);
    return data.emails || [];
  } catch (error) {
    console.warn(`Failed to fetch ${status} emails:`, error);
    return [];
  }
}
