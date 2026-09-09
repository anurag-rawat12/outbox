import { Router, Request, Response } from 'express';
import { getSlackOAuthUrl, exchangeSlackCode } from '../services/slack.js';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';

export const slackRouter = Router();

slackRouter.get('/slack', async (req: Request, res: Response) => {
  let senderId = req.query.senderId as string | undefined;

  if (!senderId) {
    // Default to the first sender or create a default one
    const sender = await prisma.sender.upsert({
      where: { email: 'sender@reachinbox.ai' },
      update: {},
      create: { email: 'sender@reachinbox.ai' },
    });
    senderId = sender.id;
  }

  const url = getSlackOAuthUrl(senderId);
  if (url === '#') {
    res.status(400).send('Slack OAuth is not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.');
    return;
  }

  res.redirect(url);
});

slackRouter.get('/slack/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string | undefined;

    if (!code) {
      res.status(400).json({ error: 'Missing code parameter from Slack' });
      return;
    }

    await exchangeSlackCode(code, state);

    // Redirect back to frontend dashboard
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (error) {
    console.error('Error in Slack OAuth callback:', error);
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error`);
  }
});
