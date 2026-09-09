import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env.js';

export const QUEUE_NAME = 'email-scheduler-queue';

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export interface EmailJobData {
  emailId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
}

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: env.MIN_DELAY_MS,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

/**
 * Enqueue an email job into BullMQ.
 * Enforces determinism & idempotency: jobId is strictly the DB row's UUID.
 */
export async function addEmailJob(
  emailId: string,
  data: EmailJobData,
  delayMs: number
) {
  return emailQueue.add('send-email', data, {
    jobId: emailId, // Strict idempotency guard
    delay: Math.max(0, delayMs),
  });
}
