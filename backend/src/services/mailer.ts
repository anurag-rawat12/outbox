import nodemailer from 'nodemailer';
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
  const mailer = await getTransporter();
  const fromAddress = from || env.SMTP_FROM || env.SMTP_USER || env.ETHEREAL_USER || 'no-reply@reachinbox.ai';

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
}
