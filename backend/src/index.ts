import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env.js';
import { emailQueue } from './queue/emailQueue.js';
import { scheduleRouter } from './routes/schedule.js';
import { emailsRouter } from './routes/emails.js';
import { slackRouter } from './routes/slack.js';
import { createEmailWorker } from './queue/emailWorker.js';
import { initElasticsearch } from './services/elasticsearch.js';
import { runReconciliation } from './reconciliation.js';

const app = express();

// Security and middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow Bull Board UI scripts
  })
);
const allowedOrigins = [
  env.FRONTEND_URL.replace(/\/$/, ''),
  'https://frontend-ivory-pi-63.vercel.app',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in production to avoid blocking frontend
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Bull Board Admin UI Setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// Application Routes
app.use('/schedule', scheduleRouter);
app.use('/emails', emailsRouter);
app.use('/auth', slackRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'reachinbox-scheduler-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Start server and run boot checks
async function bootstrap() {
  try {
    // 1. Initialize search index
    await initElasticsearch();

    // 2. Run restart reconciliation check
    await runReconciliation();

    // 3. Optional embedded worker (for single-process deployments)
    if (env.START_WORKER) {
      createEmailWorker();
      console.log(`👷 Embedded Email Queue Worker active in API server process`);
    }

    if (env.RESEND_API_KEY) {
      console.log(`📬 Resend HTTP Email API (HTTPS port 443): ACTIVE`);
    } else {
      console.log(`📬 Resend API key not configured (SMTP fallback mode)`);
    }

    // 4. Start listening
    app.listen(env.PORT, () => {
      console.log(`\n==================================================`);
      console.log(`🚀 ReachInbox API Server running on port ${env.PORT}`);
      console.log(`📊 Bull Board Dashboard: http://localhost:${env.PORT}/admin/queues`);
      console.log(`🔗 API Base URL: http://localhost:${env.PORT}`);
      console.log(`==================================================\n`);
    });
  } catch (error) {
    console.error('Fatal error during startup bootstrap:', error);
    process.exit(1);
  }
}

bootstrap();
