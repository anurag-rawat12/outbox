import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { addEmailJob } from '../queue/emailQueue.js';
import { indexEmail } from '../services/elasticsearch.js';

export const scheduleRouter = Router();

const scheduleSchema = z.object({
  senderEmail: z.string().email().optional().default('sender@reachinbox.ai'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  startTime: z.string().datetime().or(z.string().min(1)), // ISO string or parsable date
  delaySeconds: z.coerce.number().min(0).default(0),
  hourlyLimit: z.coerce.number().min(1).optional(),
});

scheduleRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.format(),
      });
      return;
    }

    const { senderEmail, subject, body, recipients, startTime, delaySeconds, hourlyLimit } = parsed.data;

    const baseStartTime = new Date(startTime).getTime();
    if (isNaN(baseStartTime)) {
      res.status(400).json({ error: 'Invalid startTime provided' });
      return;
    }

    // 1. Find or create Sender row
    const sender = await prisma.sender.upsert({
      where: { email: senderEmail },
      update: {},
      create: { email: senderEmail },
    });

    const now = Date.now();
    const createdEmails = [];
    const jobIds: string[] = [];

    // 2. Prepare and create one row per recipient in DB with scheduled_at
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      // Compute staggered schedule time per email
      const scheduledTimestamp = baseStartTime + i * delaySeconds * 1000;
      const scheduledAt = new Date(scheduledTimestamp);

      // Create row in Postgres
      const email = await prisma.email.create({
        data: {
          senderId: sender.id,
          recipient,
          subject,
          body,
          scheduledAt,
          status: 'scheduled',
        },
      });

      createdEmails.push(email);

      // 3. Enqueue delayed job in BullMQ with deterministic jobId (the DB row's UUID)
      const delayMs = Math.max(0, scheduledTimestamp - now);
      await addEmailJob(
        email.id,
        {
          emailId: email.id,
          senderId: sender.id,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
        },
        delayMs
      );

      jobIds.push(email.id);

      // 4. Index in Elasticsearch on create
      await indexEmail({
        id: email.id,
        senderId: sender.id,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: 'scheduled',
        scheduledAt: email.scheduledAt.toISOString(),
        createdAt: email.createdAt.toISOString(),
      });
    }

    res.status(201).json({
      message: `Successfully scheduled ${recipients.length} email(s)`,
      scheduled: recipients.length,
      jobIds,
    });
  } catch (error) {
    console.error('Error in POST /schedule:', error);
    res.status(500).json({
      error: 'Failed to schedule emails',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});
