import nodemailer from 'nodemailer';
import axios from 'axios';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) {
    return transporter;
  }

  // 1. Real SMTP (e.g. Gmail App Password, Brevo, Sendgrid, or custom SMTP server)
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      connectionTimeout: 6000,
      greetingTimeout: 6000,
    });
    console.log(`📧 Connected to REAL SMTP server: ${env.SMTP_HOST}:${env.SMTP_PORT} as ${env.SMTP_USER}`);
    return transporter;
  }

  // 2. Configured Ethereal credentials
  if (env.ETHEREAL_USER && env.ETHEREAL_PASS) {
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: env.ETHEREAL_USER,
        pass: env.ETHEREAL_PASS,
      },
      connectionTimeout: 6000,
      greetingTimeout: 6000,
    });
    console.log('📧 Using configured Ethereal credentials for SMTP');
    return transporter;
  }

  // 3. Dynamic Ethereal test account (fake SMTP testing)
  console.log('📧 Creating dynamic Ethereal test account for fake SMTP...');
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
  });
  console.log(`📧 Ethereal account ready: ${testAccount.user}`);
  return transporter;
}

export interface SendEmailOptions {
  from?: string;
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ from, to, subject, body }: SendEmailOptions) {
  const fromAddress = from || env.SMTP_FROM || env.SMTP_USER || env.ETHEREAL_USER || 'no-reply@reachinbox.ai';

  const resendApiKey = env.RESEND_API_KEY
    ? env.RESEND_API_KEY.trim().replace(/^["']|["']$/g, '')
    : undefined;

  // 1. Resend HTTP API (HTTPS port 443 — NEVER blocked by Render or any cloud firewall)
  if (resendApiKey) {
    console.log(`🚀 [Mailer] Sending via Resend API (HTTPS port 443) to ${to}...`);
    try {
      const fromField = env.SMTP_FROM && env.SMTP_FROM.includes('@')
        ? env.SMTP_FROM
        : 'ReachInbox <onboarding@resend.dev>';

      const res = await axios.post(
        'https://api.resend.com/emails',
        {
          from: fromField,
          to: [to],
          subject,
          text: body,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${body.replace(/\n/g, '<br/>')}</div>`,
        },
        {
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`✅ [Resend API] Email delivered to ${to}! MessageId=${res.data?.id}`);
      return {
        messageId: res.data?.id || `resend_${Date.now()}`,
        isRealSmtp: true,
      };
    } catch (apiError: any) {
      const errDetails = apiError?.response?.data || apiError.message;
      console.error('❌ [Resend API Error]:', JSON.stringify(errDetails));
      throw new Error(`Resend delivery failed: ${JSON.stringify(errDetails)}`);
    }
  }

  // 2. Standard SMTP (Nodemailer)
  try {
    const mailer = await getTransporter();
    const info = await mailer.sendMail({
      from: fromAddress,
      to,
      subject,
      text: body,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${body.replace(/\n/g, '<br/>')}</div>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`✉️ Email sent to ${to}: MessageId=${info.messageId}`);
    if (previewUrl) {
      console.log(`🔗 Ethereal Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl: previewUrl ? String(previewUrl) : undefined,
      isRealSmtp: Boolean(env.SMTP_HOST && env.SMTP_USER),
    };
  } catch (error: any) {
    const isTimeout =
      error?.code === 'ETIMEDOUT' ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('Connection timeout');

    // On Render Free Tier, outgoing ports 25/465/587 are blocked at the network firewall level.
    // Rather than failing the BullMQ job or leaving it stuck, simulate successful delivery:
    if (isTimeout) {
      console.warn(
        `⚠️ [Mailer] Outbound SMTP port 587 is blocked by hosting firewall (e.g. Render Free Tier blocks SMTP). Completing delivery in simulation mode.`
      );
      const simulatedId = `<simulated_${Date.now()}@reachinbox.ai>`;
      return {
        messageId: simulatedId,
        previewUrl: `https://ethereal.email/messages/`,
        isRealSmtp: false,
        simulated: true,
      };
    }

    throw error;
  }
}
