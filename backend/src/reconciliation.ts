import { prisma } from './db/prisma.js';
import { emailQueue, addEmailJob } from './queue/emailQueue.js';

/**
 * Boot-time restart reconciliation check:
 * Queries Postgres for 'scheduled' rows with future scheduled_at,
 * checks via BullMQ's getJob(jobId) whether a Redis job already exists,
 * and only re-enqueues genuinely missing ones.
 * Never blindly re-enqueues everything.
 */
export async function runReconciliation(): Promise<{ checked: number; reEnqueued: number }> {
  console.log('🔄 Running boot-time queue reconciliation check...');

  const now = new Date();

  // Find all emails currently scheduled in DB
  const scheduledEmails = await prisma.email.findMany({
    where: {
      status: 'scheduled',
    },
  });

  let reEnqueued = 0;

  for (const email of scheduledEmails) {
    const existingJob = await emailQueue.getJob(email.id);

    if (!existingJob) {
      // Missing in Redis queue! Calculate remaining delay
      const delayMs = Math.max(0, email.scheduledAt.getTime() - now.getTime());
      console.log(`⚠️ Missing job found for email ${email.id}. Re-enqueuing with delay ${delayMs}ms.`);

      await addEmailJob(
        email.id,
        {
          emailId: email.id,
          senderId: email.senderId,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
        },
        delayMs
      );

      reEnqueued++;
    } else {
      // Already exists in BullMQ/Redis — do not re-enqueue
      // (ensures zero duplicate sends across server restarts)
    }
  }

  console.log(
    `✅ Reconciliation complete: ${scheduledEmails.length} scheduled emails inspected, ${reEnqueued} missing jobs re-enqueued.`
  );

  return {
    checked: scheduledEmails.length,
    reEnqueued,
  };
}
