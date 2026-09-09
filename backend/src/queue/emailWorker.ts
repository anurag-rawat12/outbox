import { Worker, Job, DelayedError } from 'bullmq';
import { QUEUE_NAME, redisConnection, EmailJobData } from './emailQueue.js';
import { prisma } from '../db/prisma.js';
import { sendEmail } from '../services/mailer.js';
import { checkAndConsumeRateLimit } from '../services/rateLimit.js';
import { notifySlackRateLimit } from '../services/slack.js';
import { indexEmail } from '../services/elasticsearch.js';
import { env } from '../config/env.js';

export function createEmailWorker() {
  console.log(`🚀 Starting Email Worker (concurrency: ${env.WORKER_CONCURRENCY}, minDelay: ${env.MIN_DELAY_MS}ms)...`);

  const worker = new Worker<EmailJobData>(
    QUEUE_NAME,
    async (job: Job<EmailJobData>, token?: string) => {
      const emailId = job.data.emailId || job.id;
      console.log(`\n📨 [Worker] Processing job ${job.id} for email ${emailId}`);

      // 1. Idempotency Check: Fetch row from database
      const email = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!email) {
        console.warn(`[Worker] Email ${emailId} not found in database. Skipping.`);
        return;
      }

      // Check if already sent (prevents duplicate sending)
      if (email.status === 'sent') {
        console.log(`[Worker] Email ${emailId} already marked 'sent'. Skipping (idempotency guard).`);
        return;
      }

      // 2. Minimum inter-send delay (worker throttling)
      if (env.MIN_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, env.MIN_DELAY_MS));
      }

      // 3. Redis-backed Atomic Hourly Rate Limiting Check
      const rateLimit = await checkAndConsumeRateLimit(email.senderId);
      if (!rateLimit.allowed) {
        console.warn(
          `⚠️ [Worker] Sender ${email.senderId} reached hourly rate limit (${rateLimit.currentCount}/${rateLimit.limit}).` +
            ` Moving job ${job.id} to delayed by ${Math.round(rateLimit.resetDelayMs / 1000)}s.`
        );

        // Fire live Slack notification
        await notifySlackRateLimit(email.senderId, rateLimit.limit, rateLimit.resetDelayMs);

        // Move active job back to delayed state for next hour window
        if (token) {
          await job.moveToDelayed(Date.now() + rateLimit.resetDelayMs, token);
          throw new DelayedError();
        } else {
          await job.moveToDelayed(Date.now() + rateLimit.resetDelayMs);
          throw new DelayedError();
        }
      }

      // 4. Mark status as 'processing'
      await prisma.email.update({
        where: { id: email.id },
        data: { status: 'processing' },
      });
      await indexEmail({
        ...email,
        status: 'processing',
        scheduledAt: email.scheduledAt.toISOString(),
        createdAt: email.createdAt.toISOString(),
      });

      // 5. Send via Ethereal SMTP
      try {
        const sendResult = await sendEmail({
          to: email.recipient,
          subject: email.subject,
          body: email.body,
        });

        // 6. Update status to 'sent'
        const sentAt = new Date();
        const updated = await prisma.email.update({
          where: { id: email.id },
          data: {
            status: 'sent',
            sentAt,
            previewUrl: sendResult.previewUrl || null,
          },
        });

        console.log(`✅ [Worker] Email ${email.id} successfully sent! (MsgId: ${sendResult.messageId})`);

        // Index in Elasticsearch
        await indexEmail({
          ...updated,
          status: 'sent',
          scheduledAt: updated.scheduledAt.toISOString(),
          sentAt: sentAt.toISOString(),
          previewUrl: sendResult.previewUrl || null,
          createdAt: updated.createdAt.toISOString(),
        });

        return { sent: true, messageId: sendResult.messageId };
      } catch (sendError) {
        console.error(`❌ [Worker] Failed to send email ${email.id}:`, sendError);

        // Update status to 'failed'
        const updated = await prisma.email.update({
          where: { id: email.id },
          data: { status: 'failed' },
        });

        await indexEmail({
          ...updated,
          status: 'failed',
          scheduledAt: updated.scheduledAt.toISOString(),
          createdAt: updated.createdAt.toISOString(),
        });

        throw sendError;
      }
    },
    {
      connection: redisConnection,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    console.log(`🎉 Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    if (err.name === 'DelayedError') {
      console.log(`⏳ Job ${job?.id} moved to delayed queue for rate limit reset`);
    } else {
      console.error(`💥 Job ${job?.id} failed with error: ${err.message}`);
    }
  });

  return worker;
}
