import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';

export const ES_INDEX = 'emails';

export const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
});

let isEsConnected = false;

export async function initElasticsearch() {
  try {
    const ping = await esClient.ping();
    if (!ping) {
      console.warn('⚠️ Elasticsearch ping failed. Search will fallback to DB.');
      isEsConnected = false;
      return;
    }

    const indexExists = await esClient.indices.exists({ index: ES_INDEX });
    if (!indexExists) {
      await esClient.indices.create({
        index: ES_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            senderId: { type: 'keyword' },
            recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(`🔍 Elasticsearch index '${ES_INDEX}' created`);
    }
    isEsConnected = true;
    console.log('✅ Elasticsearch initialized and ready');
  } catch (error) {
    console.warn('⚠️ Elasticsearch not reachable:', error instanceof Error ? error.message : error);
    isEsConnected = false;
  }
}

export interface EmailDoc {
  id: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string | Date;
  sentAt?: string | Date | null;
  previewUrl?: string | null;
  createdAt: string | Date;
}

export async function indexEmail(doc: EmailDoc) {
  if (!isEsConnected) return;

  try {
    await esClient.index({
      index: ES_INDEX,
      id: doc.id,
      document: {
        id: doc.id,
        senderId: doc.senderId,
        recipient: doc.recipient,
        subject: doc.subject,
        body: doc.body,
        status: doc.status,
        scheduledAt: doc.scheduledAt,
        sentAt: doc.sentAt || null,
        previewUrl: doc.previewUrl || null,
        createdAt: doc.createdAt,
      },
    });
  } catch (error) {
    console.error(`⚠️ Failed to index email ${doc.id} in Elasticsearch:`, error instanceof Error ? error.message : error);
  }
}

export async function searchEmails(status: string, query?: string) {
  if (isEsConnected) {
    try {
      // Build Elasticsearch bool query
      const mustClauses: any[] = [{ term: { status } }];

      if (query && query.trim()) {
        mustClauses.push({
          multi_match: {
            query: query.trim(),
            fields: ['subject^2', 'recipient^3', 'body'],
            fuzziness: 'AUTO',
          },
        });
      }

      const result = await esClient.search({
        index: ES_INDEX,
        query: {
          bool: {
            must: mustClauses,
          },
        },
        sort: [{ scheduledAt: { order: 'desc' } }],
        size: 200,
      });

      const hits = result.hits.hits.map((hit: any) => hit._source as EmailDoc);
      return {
        emails: hits,
        total: typeof result.hits.total === 'number' ? result.hits.total : (result.hits.total?.value || hits.length),
      };
    } catch (error) {
      console.warn('⚠️ ES search query failed, falling back to PostgreSQL:', error instanceof Error ? error.message : error);
    }
  }

  // Fallback to DB query if ES is unreachable
  const where: any = {
    status: status as any,
  };

  if (query && query.trim()) {
    where.OR = [
      { subject: { contains: query.trim(), mode: 'insensitive' } },
      { recipient: { contains: query.trim(), mode: 'insensitive' } },
      { body: { contains: query.trim(), mode: 'insensitive' } },
    ];
  }

  const emails = await prisma.email.findMany({
    where,
    orderBy: { scheduledAt: 'desc' },
    take: 200,
  });

  return {
    emails,
    total: emails.length,
  };
}
