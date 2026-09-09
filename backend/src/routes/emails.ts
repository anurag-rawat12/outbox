import { Router, Request, Response } from 'express';
import { searchEmails } from '../services/elasticsearch.js';

export const emailsRouter = Router();

emailsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const statusParam = req.query.status as string;
    const searchParam = req.query.search as string | undefined;

    const status = statusParam || 'scheduled';

    const result = await searchEmails(status, searchParam);

    res.json({
      emails: result.emails,
      total: result.total,
    });
  } catch (error) {
    console.error('Error in GET /emails:', error);
    res.status(500).json({
      error: 'Failed to retrieve emails',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});
