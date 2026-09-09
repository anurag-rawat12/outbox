import { createEmailWorker } from './queue/emailWorker.js';
import { initElasticsearch } from './services/elasticsearch.js';

async function startWorkerProcess() {
  console.log('==================================================');
  console.log('👷 ReachInbox Email Queue Worker Process Starting');
  console.log('==================================================');

  // Ensure Elasticsearch is ready for worker status indexing
  await initElasticsearch();

  // Create and launch worker
  const worker = createEmailWorker();

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Closing worker gracefully...`);
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startWorkerProcess().catch((err) => {
  console.error('Fatal error in worker process:', err);
  process.exit(1);
});
