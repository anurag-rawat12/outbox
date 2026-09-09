// ─── Email Status ────────────────────────────────────────────────────────────
export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

// ─── Single email row (from GET /emails) ─────────────────────────────────────
export interface EmailRow {
  id: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO timestamp
  sentAt: string | null;
  previewUrl?: string | null;
  status: EmailStatus;
  createdAt: string;
}

// ─── POST /schedule payload ───────────────────────────────────────────────────
export interface SchedulePayload {
  subject: string;
  body: string;
  recipients: string[]; // list of email addresses
  startTime: string;    // ISO timestamp
  delaySeconds: number; // per-email delay
  hourlyLimit: number;  // max sends per hour
}

// ─── POST /schedule response ──────────────────────────────────────────────────
export interface ScheduleResponse {
  scheduled: number;
  jobIds: string[];
}

// ─── GET /emails response ─────────────────────────────────────────────────────
export interface EmailsResponse {
  emails: EmailRow[];
  total: number;
}

// ─── API Error shape ──────────────────────────────────────────────────────────
export interface ApiError {
  message: string;
  statusCode: number;
}
