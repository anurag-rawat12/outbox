import axios from 'axios';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';

export function getSlackOAuthUrl(senderId: string): string {
  if (!env.SLACK_CLIENT_ID) {
    return '#';
  }

  const scopes = ['chat:write', 'chat:write.public', 'incoming-webhook'].join(',');
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: scopes,
    redirect_uri: env.SLACK_REDIRECT_URI,
    state: senderId,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCode(code: string, stateSenderId?: string) {
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    throw new Error('Slack client ID or secret is not configured');
  }

  const response = await axios.post(
    'https://slack.com/api/oauth.v2.access',
    new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: env.SLACK_REDIRECT_URI,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const data = response.data;
  if (!data.ok) {
    throw new Error(`Slack OAuth error: ${data.error || 'unknown'}`);
  }

  const accessToken = data.access_token;
  const teamId = data.team?.id;
  const incomingWebhook = data.incoming_webhook?.url;

  // Save to sender if state contains senderId or find sender
  if (stateSenderId) {
    await prisma.sender.updateMany({
      where: { id: stateSenderId },
      data: {
        slackToken: accessToken || incomingWebhook,
        slackTeamId: teamId,
      },
    });
  }

  return {
    accessToken,
    teamId,
    incomingWebhook,
  };
}

export async function notifySlackRateLimit(
  senderId: string,
  limit: number,
  resetDelayMs: number
) {
  try {
    const sender = await prisma.sender.findUnique({
      where: { id: senderId },
    });

    const tokenOrWebhook = sender?.slackToken || env.SLACK_WEBHOOK_URL;
    if (!tokenOrWebhook) {
      console.log(`ℹ️ Sender ${senderId} has not connected Slack and no SLACK_WEBHOOK_URL configured. Skipping Slack notification.`);
      return;
    }

    const senderEmail = sender?.email || 'reachinbox-sender';
    const nextTimeStr = new Date(Date.now() + resetDelayMs).toLocaleTimeString();
    const message = `⚠️ *Rate Limit Exceeded for Sender:* ${senderEmail}\n• Hourly Limit: ${limit} emails/hour\n• Action: Job moved to next delay window (${nextTimeStr})\n• System: ReachInbox Email Scheduler`;

    if (tokenOrWebhook.startsWith('https://hooks.slack.com/')) {
      // Incoming webhook
      await axios.post(tokenOrWebhook, {
        text: message,
      });
    } else {
      // Bot token
      await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: '#general',
          text: message,
        },
        {
          headers: {
            Authorization: `Bearer ${tokenOrWebhook}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log(`📢 Live Slack notification dispatched for sender ${senderEmail}`);
  } catch (error) {
    console.error('⚠️ Failed to deliver Slack rate limit notification:', error instanceof Error ? error.message : error);
    // As per requirement: must not crash
  }
}
